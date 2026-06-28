import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth-helpers";
import { hasVocacionalAccess, isGestao, temPermissao } from "@/types";
import TurmaDetailClient from "./TurmaDetailClient";

export const dynamic = "force-dynamic";

export default async function TurmaVocacionalPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.organizacaoId) redirect("/login");
  if (!temPermissao(user.role, "formador_comunitario")) redirect("/dashboard");

  const { id } = await params;

  const org = await prisma.organizacao.findUnique({
    where: { id: user.organizacaoId },
    select: { tipoOrganizacao: true, vocacionalHabilitado: true, termoVocacional: true, termoAcompanhamentoVocacional: true },
  });
  if (!hasVocacionalAccess(org?.tipoOrganizacao, org?.vocacionalHabilitado)) redirect("/dashboard");

  const turma = await prisma.grupoFormacao.findFirst({
    where: { id, organizacaoId: user.organizacaoId, tipo: "vocacional" },
    omit: { imagemUrl: true },
    include: { formador: { select: { id: true, nome: true } } },
  });
  if (!turma) notFound();

  const gestao = isGestao(user.role);
  // FC só acessa a turma da qual é formador responsável.
  if (!gestao && turma.formadorId !== user.id) redirect("/vocacional");

  const [participacoes, formandosDisponiveis, acompanhadores] = await Promise.all([
    prisma.participacaoVocacional.findMany({
      where: { turmaId: id, organizacaoId: user.organizacaoId },
      orderBy: { criadoEm: "desc" },
      include: {
        formando: { select: { id: true, nome: true, condicaoAtual: true } },
        acompanhador: { select: { id: true, nome: true } },
        _count: { select: { acompanhamentos: true, solicitacoes: true } },
      },
    }),
    gestao
      ? prisma.formando.findMany({
          where: { organizacaoId: user.organizacaoId, deletedAt: null, ativo: true },
          select: { id: true, nome: true },
          orderBy: { nome: "asc" },
        })
      : Promise.resolve([]),
    prisma.usuario.findMany({
      where: { organizacaoId: user.organizacaoId, deletedAt: null, ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <TurmaDetailClient
      userRole={user.role ?? "formador_comunitario"}
      userId={user.id ?? ""}
      termoVocacional={org?.termoVocacional ?? "Período Vocacional"}
      termoAcompanhamento={org?.termoAcompanhamentoVocacional ?? "Acompanhamento Vocacional"}
      turma={{
        id: turma.id,
        nome: turma.nome,
        localReuniao: turma.localReuniao,
        formadorId: turma.formadorId,
        formadorNome: turma.formador?.nome ?? null,
        vigenciaInicio: turma.vigenciaInicio?.toISOString() ?? null,
        vigenciaFim: turma.vigenciaFim?.toISOString() ?? null,
        vocacionalDuracaoMeses: turma.vocacionalDuracaoMeses,
        vocacionalTotalRetiros: turma.vocacionalTotalRetiros,
        vocacionalAcompanhamentoAtivo: turma.vocacionalAcompanhamentoAtivo,
      }}
      formandosDisponiveis={formandosDisponiveis}
      acompanhadores={acompanhadores}
      participacoes={participacoes.map((p) => ({
        id: p.id,
        formandoId: p.formandoId,
        formandoNome: p.formando.nome,
        condicaoAtual: p.formando.condicaoAtual,
        status: p.status,
        dataIngresso: p.dataIngresso.toISOString(),
        dataConclusao: p.dataConclusao?.toISOString() ?? null,
        desfechoCarta: p.desfechoCarta,
        cartaArquivoId: p.cartaArquivoId,
        cartaRecebidaEm: p.cartaRecebidaEm?.toISOString() ?? null,
        acompanhadorId: p.acompanhadorId,
        acompanhadorNome: p.acompanhador?.nome ?? null,
        totalAcompanhamentos: p._count.acompanhamentos,
        solicitacoesPendentes: p._count.solicitacoes,
      }))}
    />
  );
}
