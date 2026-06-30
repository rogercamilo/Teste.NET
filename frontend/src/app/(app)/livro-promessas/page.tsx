import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth-helpers";
import { hasVocacionalAccess, temPermissao } from "@/types";
import LivroPromessasClient from "./LivroPromessasClient";

export const dynamic = "force-dynamic";

export default async function LivroPromessasPage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!user?.organizacaoId) redirect("/login");

  const org = await prisma.organizacao.findUnique({
    where: { id: user.organizacaoId },
    select: { nome: true, tipoOrganizacao: true, vocacionalHabilitado: true },
  });

  if (!hasVocacionalAccess(org?.tipoOrganizacao, org?.vocacionalHabilitado)) redirect("/dashboard");
  if (!temPermissao(user.role, "formador_geral")) redirect("/dashboard");

  const registros = await prisma.registroPromessa.findMany({
    where: { organizacaoId: user.organizacaoId },
    include: { formando: { select: { nome: true } } },
    orderBy: [{ tomo: "asc" }, { numero: "asc" }],
  });

  return (
    <LivroPromessasClient
      orgNome={org?.nome ?? ""}
      registros={registros.map((r) => ({
        id: r.id,
        tipo: r.tipo,
        tomo: r.tomo,
        folha: r.folha,
        numero: r.numero,
        numeroRegistro: r.numeroRegistro,
        formandoId: r.formandoId,
        formandoNome: r.formando?.nome ?? null,
        dataVigenciaInicio: r.dataVigenciaInicio.toISOString(),
        dataVigenciaFim: r.dataVigenciaFim?.toISOString() ?? null,
        celebrante: r.celebrante,
        localCelebracao: r.localCelebracao,
        moderadorGeral: r.moderadorGeral,
        formadorGeralLocal: r.formadorGeralLocal,
        assistenteEclesiastico: r.assistenteEclesiastico,
        secretario: r.secretario,
        formulaTexto: r.formulaTexto,
        criadoEm: r.criadoEm.toISOString(),
      }))}
    />
  );
}
