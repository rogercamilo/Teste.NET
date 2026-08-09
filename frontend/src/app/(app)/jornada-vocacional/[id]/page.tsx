import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth-helpers";
import { hasCanonicalAccess, type NivelFormativo } from "@/types";
import { mapProcessoParaTipoPromessa, montarFormulaPromessa } from "@/lib/livro-promessas";
import ProcessoDetalheClient from "./ProcessoDetalheClient";

export default async function ProcessoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!user?.organizacaoId) redirect("/login");

  const [processo, org] = await Promise.all([
    prisma.processoEclesiastico.findFirst({
      where: { id, organizacaoId: user.organizacaoId },
      include: {
        formando: {
          select: {
            id: true,
            nome: true,
            grupoFormacaoId: true,
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
        criadoPor: { select: { id: true, nome: true } },
        documentos: { orderBy: { criadoEm: "asc" } },
        promessa: true,
      },
    }),
    prisma.organizacao.findUnique({
      where: { id: user.organizacaoId },
      select: {
        nome: true,
        tipoOrganizacao: true,
        termoPreDiscipulado: true,
        termoDiscipulado: true,
        termoPrimeirasPromessas: true,
        termoFormacaoPermanente: true,
        termoPromessa: true,
      },
    }),
  ]);

  if (!processo) redirect("/jornada-vocacional");
  if (!hasCanonicalAccess(org?.tipoOrganizacao)) redirect("/dashboard");
  // Formador comunitário só acessa processos de formandos da sua morada.
  if (
    user.role === "formador_comunitario" &&
    processo.formando.grupoFormacaoId !== user.grupoFormacaoId
  ) {
    redirect("/jornada-vocacional");
  }

  const tipoPromessa = mapProcessoParaTipoPromessa(processo.tipo);
  const promessaFormulaDefault =
    tipoPromessa && !processo.promessa
      ? montarFormulaPromessa({
          formandoNome: processo.formando.nome,
          orgNome: org?.nome ?? "",
          tipo: tipoPromessa,
        })
      : null;

  return (
    <ProcessoDetalheClient
      processo={{
        id: processo.id,
        organizacaoId: processo.organizacaoId,
        formandoId: processo.formandoId,
        formando: {
          id: processo.formando.id,
          nome: processo.formando.nome,
          dataNascimento: processo.formando.dataNascimento?.toISOString() ?? null,
          estadoCivil: processo.formando.estadoCivil,
          telefone: processo.formando.telefone,
          email: processo.formando.email,
          nomeSocial: processo.formando.nomeSocial ?? null,
          nacionalidade: processo.formando.nacionalidade ?? null,
          rg: processo.formando.rg ?? null,
          orgaoEmissor: processo.formando.orgaoEmissor ?? null,
          cep: processo.formando.cep ?? null,
          paroquiaReferencia: processo.formando.paroquiaReferencia ?? null,
          numFilhos: processo.formando.numFilhos ?? null,
        },
        tipo: processo.tipo,
        nivelFormativo: processo.nivelFormativo as NivelFormativo,
        status: processo.status,
        dadosFormulario: processo.dadosFormulario as Record<string, unknown>,
        favoravelRenovacao: processo.favoravelRenovacao,
        numeroRenovacao: processo.numeroRenovacao,
        criadoPorId: processo.criadoPorId,
        criadoPorNome: processo.criadoPor.nome,
        criadoEm: processo.criadoEm.toISOString(),
        atualizadoEm: processo.atualizadoEm.toISOString(),
        documentos: processo.documentos.map((d) => ({
          id: d.id,
          processoId: d.processoId,
          tipo: d.tipo,
          status: d.status,
          versao: d.versao,
          arquivoId: d.arquivoId,
          geradoEm: d.geradoEm?.toISOString() ?? null,
          geradoPorId: d.geradoPorId ?? null,
          observacoes: d.observacoes ?? null,
          criadoEm: d.criadoEm.toISOString(),
        })),
        promessa: processo.promessa
          ? {
              id: processo.promessa.id,
              tipo: processo.promessa.tipo,
              tomo: processo.promessa.tomo,
              folha: processo.promessa.folha,
              numero: processo.promessa.numero,
              numeroRegistro: processo.promessa.numeroRegistro,
              dataVigenciaInicio: processo.promessa.dataVigenciaInicio.toISOString(),
              dataVigenciaFim: processo.promessa.dataVigenciaFim?.toISOString() ?? null,
              celebrante: processo.promessa.celebrante,
              localCelebracao: processo.promessa.localCelebracao,
              moderadorGeral: processo.promessa.moderadorGeral,
              formadorGeralLocal: processo.promessa.formadorGeralLocal,
              assistenteEclesiastico: processo.promessa.assistenteEclesiastico,
              secretario: processo.promessa.secretario,
              formulaTexto: processo.promessa.formulaTexto,
            }
          : null,
      }}
      promessaTipo={tipoPromessa}
      promessaFormulaDefault={promessaFormulaDefault}
      userRole={user.role ?? "formador_comunitario"}
      termos={{
        etapa1: org?.termoPreDiscipulado ?? "Pré-Discipulado",
        etapa2: org?.termoDiscipulado ?? "Discipulado",
        etapa3: org?.termoPrimeirasPromessas ?? "Primeiras Promessas",
        etapa4: org?.termoFormacaoPermanente ?? "Formação Permanente",
        promessa: org?.termoPromessa ?? "Promessa",
      }}
    />
  );
}
