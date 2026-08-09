import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { getUserName } from "@/lib/current-user";
import type { SessionUser } from "@/lib/auth-helpers";
import { renderTemplate } from "@/lib/documentos-eclesiasticos/templates";
import type { DadosTemplate } from "@/lib/documentos-eclesiasticos/templates/types";
import { resolveDocumentoBranding } from "@/lib/documentos-eclesiasticos/branding";
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
            termoFormador: true,
            termoConsagracao: true,
            termoConsagrado: true,
            documentosTextos: true,
            temaCor: true,
            logoUrl: true,
          },
        },
        promessa: true,
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
    // Documento canônico exige data de nascimento. No cadastro mínimo ela pode
    // estar pendente (o formando completa no portal) — bloqueia a geração com
    // orientação clara em vez de emitir um documento incompleto.
    if (!f.dataNascimento) {
      return NextResponse.json(
        { error: "Complete a data de nascimento do formando (no cadastro ou pelo portal) antes de gerar este documento." },
        { status: 422 }
      );
    }
    const org = processo.organizacao;
    const agora = new Date();
    const geradoEm = format(agora, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

    // Para processos de promessa já lavrados, o Livro de Promessas é a fonte
    // canônica dos dados de celebração/registro — sobrepõe o que veio do formulário.
    const formularioBase = (processo.dadosFormulario as Record<string, unknown>) ?? {};
    const promessa = processo.promessa;
    const formulario: Record<string, unknown> = promessa
      ? {
          ...formularioBase,
          data_celebracao: format(promessa.dataVigenciaInicio, "dd/MM/yyyy"),
          local_celebracao: promessa.localCelebracao,
          celebrante: promessa.celebrante,
          moderador_geral: promessa.moderadorGeral,
          assistente_eclesiastico: promessa.assistenteEclesiastico ?? undefined,
          formula_texto: promessa.formulaTexto,
          tomo: promessa.tomo,
          folha: String(promessa.folha).padStart(3, "0"),
          numero: promessa.numeroRegistro,
        }
      : formularioBase;

    const dados: DadosTemplate = {
      orgNome: org.nome,
      branding: resolveDocumentoBranding(org),
      termoPreDiscipulado: org.termoPreDiscipulado,
      termoDiscipulado: org.termoDiscipulado,
      termoPrimeirasPromessas: org.termoPrimeirasPromessas,
      termoPromessa: org.termoPromessa,
      termoFormador: org.termoFormador,
      termoConsagracao: org.termoConsagracao,
      termoConsagrado: org.termoConsagrado,
      textosCustom: (org.documentosTextos as Record<string, string> | null) ?? {},

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

      formulario,
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
          uploadedByNome: (await getUserName(user.id)) ?? user.name ?? undefined,
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
      // ISO — o cliente reidrata o estado e formata para exibição. Devolver a
      // string pt-BR (variável `geradoEm`, usada só no template) fazia o cliente
      // rodar `parseISO` sobre "dd/MM/yyyy às HH:mm" → Invalid Date → o `format`
      // no render lançava RangeError e derrubava a tela logo após gerar o PDF.
      geradoEm: agora.toISOString(),
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
