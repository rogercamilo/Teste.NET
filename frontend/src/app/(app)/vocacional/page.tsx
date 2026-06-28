import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth-helpers";
import { hasVocacionalAccess, isGestao, temPermissao } from "@/types";
import VocacionalClient from "./VocacionalClient";

export const dynamic = "force-dynamic";

export default async function VocacionalPage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.organizacaoId) redirect("/login");

  const org = await prisma.organizacao.findUnique({
    where: { id: user.organizacaoId },
    select: { tipoOrganizacao: true, vocacionalHabilitado: true, termoVocacional: true },
  });
  if (!hasVocacionalAccess(org?.tipoOrganizacao, org?.vocacionalHabilitado)) redirect("/dashboard");
  if (!temPermissao(user.role, "formador_comunitario")) redirect("/dashboard");

  const gestao = isGestao(user.role);
  const turmaWhere = {
    organizacaoId: user.organizacaoId,
    tipo: "vocacional" as const,
    ...(gestao ? {} : { formadorId: user.id }),
  };

  const [turmas, formadores, planos, grades] = await Promise.all([
    prisma.grupoFormacao.findMany({
      where: turmaWhere,
      orderBy: { criadoEm: "desc" },
      omit: { imagemUrl: true },
      include: {
        formador: { select: { id: true, nome: true } },
        _count: { select: { participacoesVocacional: true } },
      },
    }),
    gestao
      ? prisma.usuario.findMany({
          where: { organizacaoId: user.organizacaoId, deletedAt: null, ativo: true },
          select: { id: true, nome: true },
          orderBy: { nome: "asc" },
        })
      : Promise.resolve([]),
    gestao
      ? prisma.planoFormativo.findMany({
          where: { organizacaoId: user.organizacaoId },
          select: { id: true, nome: true },
          orderBy: { nome: "asc" },
        })
      : Promise.resolve([]),
    gestao
      ? prisma.gradeFormativa.findMany({
          where: { organizacaoId: user.organizacaoId },
          select: { id: true, nome: true },
          orderBy: { nome: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <VocacionalClient
      userRole={user.role ?? "formador_comunitario"}
      termoVocacional={org?.termoVocacional ?? "Período Vocacional"}
      formadores={formadores}
      planos={planos}
      grades={grades}
      turmas={turmas.map((t) => ({
        id: t.id,
        nome: t.nome,
        localReuniao: t.localReuniao,
        formadorNome: t.formador?.nome ?? null,
        vigenciaInicio: t.vigenciaInicio?.toISOString() ?? null,
        vigenciaFim: t.vigenciaFim?.toISOString() ?? null,
        vocacionalDuracaoMeses: t.vocacionalDuracaoMeses,
        vocacionalTotalRetiros: t.vocacionalTotalRetiros,
        vocacionalAcompanhamentoAtivo: t.vocacionalAcompanhamentoAtivo,
        totalParticipantes: t._count.participacoesVocacional,
      }))}
    />
  );
}
