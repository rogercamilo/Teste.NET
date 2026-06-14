import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import type { SessionUser } from "@/lib/auth-helpers";
import { renderTemplate } from "@/lib/documentos-eclesiasticos/templates";
import type { DadosTemplate } from "@/lib/documentos-eclesiasticos/templates/types";
import { TIPO_DOCUMENTO_LABELS } from "@/lib/jornada-vocacional";
import type { TipoDocumentoEclesiastico } from "@/types";

type RouteCtx = { params: Promise<{ id: string; docId: string }> };

export async function POST(req: NextRequest, { params }: RouteCtx) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.organizacaoId || !user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const organizacaoId = user.organizacaoId;

  if (user.role !== "administrador" && user.role !== "formador_geral") {
    return NextResponse.json({ error: "Sem permissão para gerar documentos" }, { status: 403 });
  }

  try {
    const { id: processoId, docId } = await params;

    const processo = await prisma.processoEclesiastico.findFirst({
      where: { id: processoId, organizacaoId: user.organizacaoId },
      include: {
        formando: {
          select: {
            nome: true,
            dataNascimento: true,
            estadoCivil: true,
            telefone: true,
            email: true,
            nomeSocial: true,
            nacionalidade: true,
            rg: true,
            orgaoEmissor: true,
            cep: true,
            paroquiaReferencia: true,
            numFilhos: true,
          },
        },
        organizacao: {
          select: {
            nome: true,
            termoPreDiscipulado: true,
            termoDiscipulado: true,
            termoPrimeirasPromessas: true,
            termoPromessa: true,
          },
        },
      },
    });

    if (!processo) {
      return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
    }

    const doc = await prisma.documentoEclesiastico.findFirst({
      where: { id: docId, processoId },
    });

    if (!doc) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    if (doc.status === "assinado" || doc.status === "arquivado") {
      return NextResponse.json(
        { error: "Documento assinado ou arquivado não pode ser regenerado" },
        { status: 409 }
      );
    }

    // Monta dados para o template
    const f = processo.formando;
    const org = processo.organizacao;
    const agora = new Date();
    const geradoEm = format(agora, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

    const dados: DadosTemplate = {
      orgNome: org.nome,
      termoPreDiscipulado: org.termoPreDiscipulado,
      termoDiscipulado: org.termoDiscipulado,
      termoPrimeirasPromessas: org.termoPrimeirasPromessas,
      termoPromessa: org.termoPromessa,

      processoTipo: processo.tipo,
      nivelFormativo: processo.nivelFormativo,
      favoravelRenovacao: processo.favoravelRenovacao ?? false,

      formandoNome: f.nome,
      formandoDataNascimento: format(f.dataNascimento, "dd/MM/yyyy"),
      formandoEstadoCivil: f.estadoCivil,
      formandoTelefone: f.telefone,
      formandoEmail: f.email,
      formandoNomeSocial: f.nomeSocial,
      formandoNacionalidade: f.nacionalidade,
      formandoRg: f.rg,
      formandoOrgaoEmissor: f.orgaoEmissor,
      formandoCep: f.cep,
      formandoParoquiaReferencia: f.paroquiaReferencia,
      formandoNumFilhos: f.numFilhos,

      formulario: (processo.dadosFormulario as Record<string, unknown>) ?? {},
      geradoEm,
    };

    // Renderiza o PDF
    const pdfBuffer = await renderTemplate(doc.tipo as TipoDocumentoEclesiastico, dados);

    // Persiste no storage
    const storageKey = await uploadFile(
      user.organizacaoId,
      "documentos-eclesiasticos",
      pdfBuffer,
      ".pdf",
      "application/pdf"
    );

    const nomeArquivo = `${TIPO_DOCUMENTO_LABELS[doc.tipo as TipoDocumentoEclesiastico]} — ${f.nome}.pdf`;
    const novaVersao = doc.arquivoId ? doc.versao + 1 : doc.versao;

    // Transação: cria Arquivo e atualiza DocumentoEclesiastico in-place
    const arquivo = await prisma.$transaction(async (tx) => {
      const arq = await tx.arquivo.create({
        data: {
          organizacaoId,
          nome: nomeArquivo,
          tamanho: pdfBuffer.length,
          tipo: "application/pdf",
          extensao: ".pdf",
          storageKey,
          uploadedById: user.id,
          uploadedByNome: user.name ?? undefined,
        },
      });

      // Verifica novamente o status dentro da transaction para prevenir sobrescrita de documento assinado
      const docAtualizado = await tx.documentoEclesiastico.updateMany({
        where: { id: docId, status: { notIn: ["assinado", "arquivado"] } },
        data: {
          arquivoId: arq.id,
          status: "gerado",
          versao: novaVersao,
          geradoEm: agora,
          geradoPorId: user.id,
        },
      });
      if (docAtualizado.count === 0) {
        throw Object.assign(new Error("DOCUMENT_LOCKED"), { isLocked: true });
      }

      return arq;
    });

    logAction(
      "documento_eclesiastico_gerado",
      user.id,
      getClientIp(req),
      { processoId, docId, tipo: doc.tipo, versao: novaVersao },
      user.organizacaoId
    );

    return NextResponse.json({
      arquivoId: arquivo.id,
      geradoEm,
      versao: novaVersao,
    });
  } catch (err) {
    if (err instanceof Error && (err as Error & { isLocked?: boolean }).isLocked) {
      return NextResponse.json(
        { error: "Documento assinado ou arquivado não pode ser regenerado" },
        { status: 409 }
      );
    }
    logError("documentos-eclesiasticos gerar", err);
    return NextResponse.json({ error: "Falha ao gerar documento" }, { status: 500 });
  }
}
