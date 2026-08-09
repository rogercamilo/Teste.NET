import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrgBranding } from "@/lib/org-cache";
import { toFormando, toComentario, toEvento, toPresenca, toAgendamento, toGrupoFormacao } from "@/lib/converters";
import type { SessionUser } from "@/lib/auth-helpers";
import { getUserName } from "@/lib/current-user";
import type { DocumentoAnexo, NivelFormativo } from "@/types";
import { hasCanonicalAccess } from "@/types";
import FormandoDetailClient from "./FormandoDetailClient";

export default async function FormandoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!user?.organizacaoId) redirect("/login");

  const grupoFormacaoFilter =
    user.role === "formador_comunitario" ? { grupoFormacaoId: user.grupoFormacaoId ?? null } : {};

  const [formandoRow, org] = await Promise.all([
    prisma.formando.findFirst({
      where: { id, organizacaoId: user.organizacaoId, deletedAt: null, ...grupoFormacaoFilter },
      include: { progressoEtapas: true },
    }),
    getOrgBranding(user.organizacaoId),
  ]);

  if (!formandoRow) redirect("/formandos");

  // Uma única rodada paralela após carregar formando+org: processos (condicional
  // ao tipo de org), coleções do formando e cartas de etapa não dependem entre si.
  // Antes eram 3 idas sequenciais ao banco. `vocacionalHabilitado` já vem do
  // getOrgBranding (cacheado), então a query dedicada `orgVocacional` foi removida.
  //
  // Cartas de etapa (recorrentes) — reaproveitam Arquivo; a etapa é codificada
  // no tipoEvento (`carta_etapa:{nivel}`); cartas vocacionais legadas entram como
  // nível "vocacional". O flag habilita a aba Documentos em orgs não-canônicas.
  const [
    processosEclesiasticosRows,
    comentariosRows,
    eventosRows,
    presencasRows,
    grupoFormacaoRow,
    todosGruposFormacaoRows,
    agendamentosRows,
    cartasRows,
    acompanhamentosRows,
    solicitacoesAcompRows,
  ] = await Promise.all([
    hasCanonicalAccess(org?.tipoOrganizacao)
      ? prisma.processoEclesiastico.findMany({
          where: { formandoId: id, organizacaoId: user.organizacaoId },
          include: { documentos: { select: { id: true, tipo: true, status: true, versao: true } } },
          orderBy: { criadoEm: "desc" },
        })
      : Promise.resolve([]),
    prisma.comentarioFormando.findMany({
      where: { formandoId: id, organizacaoId: user.organizacaoId },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.eventoFormando.findMany({
      where: { formandoId: id, organizacaoId: user.organizacaoId },
      orderBy: { criadoEm: "desc" },
      include: { documentos: true },
    }),
    prisma.presencaFormacao.findMany({
      where: { formandoId: id, organizacaoId: user.organizacaoId },
      orderBy: { data: "desc" },
    }),
    formandoRow.grupoFormacaoId
      ? prisma.grupoFormacao.findFirst({ where: { id: formandoRow.grupoFormacaoId, organizacaoId: user.organizacaoId } })
      : Promise.resolve(null),
    prisma.grupoFormacao.findMany({
      where: { organizacaoId: user.organizacaoId, ativo: true },
      select: { id: true, nome: true, nivelFormativo: true },
      orderBy: { nome: "asc" },
    }),
    prisma.agendamento.findMany({
      where: {
        organizacaoId: user.organizacaoId,
        nivelFormativo: formandoRow.nivelFormativo,
        ...(formandoRow.grupoFormacaoId ? { grupoFormacaoId: formandoRow.grupoFormacaoId } : {}),
        deletedAt: null,
      },
      orderBy: { dataInicio: "desc" },
    }),
    prisma.arquivo.findMany({
      where: { formandoId: id, organizacaoId: user.organizacaoId, tipoEvento: { startsWith: "carta_" } },
      orderBy: { criadoEm: "desc" },
      select: { id: true, nome: true, tipoEvento: true, extensao: true, tamanho: true, dataEvento: true, criadoEm: true },
    }),
    prisma.acompanhamentoFormando.findMany({
      where: { formandoId: id, organizacaoId: user.organizacaoId },
      orderBy: { data: "desc" },
      include: { formador: { select: { nome: true } } },
    }),
    prisma.solicitacaoAcompanhamentoFormando.findMany({
      where: { formandoId: id, organizacaoId: user.organizacaoId, status: "pendente" },
      orderBy: { solicitadoEm: "desc" },
    }),
  ]);

  // Grade total from the formando's morada grade — depende da grade da morada,
  // resolvida na rodada acima; fica de fora do batch por essa dependência.
  let gradeTotal: number | null = null;
  if (grupoFormacaoRow?.gradeId) {
    const grade = await prisma.gradeFormativa.findUnique({
      where: { id: grupoFormacaoRow.gradeId },
      select: { totalFormacoes: true },
    });
    gradeTotal = grade?.totalFormacoes ?? null;
  }

  const parseNivelCarta = (t: string | null): NivelFormativo =>
    t?.startsWith("carta_etapa:") ? (t.slice("carta_etapa:".length) as NivelFormativo) : "vocacional";

  const cartasEtapa = cartasRows.map((c) => ({
    id: c.id,
    nome: c.nome,
    nivel: parseNivelCarta(c.tipoEvento),
    extensao: c.extensao,
    tamanho: c.tamanho,
    dataEvento: c.dataEvento?.toISOString() ?? null,
    criadoEm: c.criadoEm.toISOString(),
  }));

  return (
    <FormandoDetailClient
      id={id}
      formando={toFormando({
        ...formandoRow,
        totalFormacoes: gradeTotal ?? formandoRow.totalFormacoes,
      })}
      comentarios={comentariosRows.map(toComentario)}
      eventos={eventosRows.map((r) => ({
        ...toEvento(r),
        documentos: r.documentos.map(
          (d): DocumentoAnexo => ({
            id: d.id,
            nome: d.nome,
            tamanho: d.tamanho,
            tipo: d.tipo,
            criadoEm: d.criadoEm.toISOString(),
          })
        ),
      }))}
      presencas={presencasRows.map(toPresenca)}
      agendamentos={agendamentosRows.map(toAgendamento)}
      morada={grupoFormacaoRow ? toGrupoFormacao(grupoFormacaoRow) : null}
      todasMoradas={todosGruposFormacaoRows}
      userId={user.id ?? ""}
      userName={(await getUserName(user.id)) ?? session?.user?.name ?? "Formador"}
      userRole={user.role ?? "formador_comunitario"}
      userGrupoFormacaoId={user.grupoFormacaoId ?? null}
      termoFormando={org?.termoFormando?.trim() || "Formando"}
      termoFormador={org?.termoFormador?.trim() || "Formador Comunitário"}
      tipoOrganizacao={org?.tipoOrganizacao ?? null}
      vocacionalHabilitado={org?.vocacionalHabilitado ?? false}
      cartasEtapa={cartasEtapa}
      acompanhamentos={acompanhamentosRows.map((a) => ({
        id: a.id,
        data: a.data.toISOString(),
        nota: a.nota,
        formadorNome: a.formador.nome,
        solicitadoPeloFormando: a.solicitadoPeloFormando,
        criadoEm: a.criadoEm.toISOString(),
      }))}
      solicitacoesAcompanhamento={solicitacoesAcompRows.map((s) => ({
        id: s.id,
        solicitadoEm: s.solicitadoEm.toISOString(),
        mensagem: s.mensagem,
      }))}
      processosEclesiasticos={processosEclesiasticosRows.map((p) => ({
        id: p.id,
        organizacaoId: p.organizacaoId,
        formandoId: p.formandoId,
        tipo: p.tipo,
        nivelFormativo: p.nivelFormativo as NivelFormativo,
        status: p.status,
        dadosFormulario: p.dadosFormulario as Record<string, unknown>,
        favoravelRenovacao: p.favoravelRenovacao,
        numeroRenovacao: p.numeroRenovacao,
        criadoPorId: p.criadoPorId,
        criadoEm: p.criadoEm.toISOString(),
        atualizadoEm: p.atualizadoEm.toISOString(),
        documentos: p.documentos.map((d) => ({
          id: d.id,
          processoId: p.id,
          tipo: d.tipo,
          status: d.status,
          versao: d.versao,
          arquivoId: null,
          geradoEm: null,
          criadoEm: p.criadoEm.toISOString(),
        })),
      }))}
    />
  );
}
