import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { toFormando, toGrupoFormacao, toGrade } from "@/lib/converters";
import FormandosClient from "./FormandosClient";

const PAGE_SIZE = 12;

export default async function FormandosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; nivel?: string; acesso?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as {
    role?: string;
    organizacaoId?: string;
    grupoFormacaoId?: string | null;
  };

  // FC always goes directly to their morada — redirect server-side (no flash)
  if (user.role === "formador_comunitario" && user.grupoFormacaoId) {
    redirect(`/grupos-formacao/${user.grupoFormacaoId}`);
  }

  if (!user.organizacaoId) redirect("/login");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const nivel = sp.nivel ?? "todos";
  const acesso = sp.acesso ?? "todos"; // "pendente" = sem acesso | "acessou" = já entrou no portal
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  // Busca/filtro/paginação no banco — a listagem nunca carrega a organização
  // inteira no cliente. `nome` usa o índice GIN pg_trgm para o ILIKE.
  const where: Prisma.FormandoWhereInput = {
    organizacaoId: user.organizacaoId,
    deletedAt: null,
    ...(nivel !== "todos" ? { nivelFormativo: nivel } : {}),
    // "Sem acesso ao portal": ainda não criou a senha (passwordHash null).
    ...(acesso === "pendente" ? { passwordHash: null } : {}),
    // "Já acessou o portal": já abriu uma sessão (login/ativação/reset gravam
    // ultimoAcessoEm). Campo único cobre portal do formando e do vocacionado.
    ...(acesso === "acessou" ? { ultimoAcessoEm: { not: null } } : {}),
    ...(q
      ? {
          OR: [
            { nome: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [formandosRaw, total, ativosCount, gruposFormacaoRaw, gradesRaw] = await Promise.all([
    prisma.formando.findMany({
      where,
      include: { progressoEtapas: true },
      orderBy: { nome: "asc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.formando.count({ where }),
    // Contagem de ativos da organização (sem filtros) — usada no cabeçalho.
    prisma.formando.count({
      where: { organizacaoId: user.organizacaoId, deletedAt: null, ativo: true },
    }),
    // Moradas e grades são conjuntos pequenos (por org) — carregados inteiros
    // para os selects dos diálogos de criação/edição e vínculo de grade.
    prisma.grupoFormacao.findMany({
      where: { organizacaoId: user.organizacaoId },
      orderBy: { nome: "asc" },
    }),
    prisma.gradeFormativa.findMany({
      where: { organizacaoId: user.organizacaoId },
      include: { eixos: { include: { etapas: true } } },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <FormandosClient
      initialFormandos={formandosRaw.map(toFormando)}
      initialGruposFormacao={gruposFormacaoRaw.map(toGrupoFormacao)}
      initialGrades={gradesRaw.map(toGrade)}
      role={user.role ?? "formador_comunitario"}
      grupoFormacaoId={user.grupoFormacaoId ?? null}
      total={total}
      ativosCount={ativosCount}
      page={page}
      pageSize={PAGE_SIZE}
      query={q}
      nivel={nivel}
      acesso={acesso}
    />
  );
}
