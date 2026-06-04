import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toPlano, toGrupoFormacao } from "@/lib/converters";
import PlanosClient from "./PlanosClient";

export default async function PlanosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { role?: string; organizacaoId?: string; grupoFormacaoId?: string | null };
  if (!user.organizacaoId) redirect("/login");

  const [planosRaw, gruposFormacaoRaw] = await Promise.all([
    prisma.planoFormativo.findMany({
      where: { organizacaoId: user.organizacaoId },
      include: {
        eixos: { orderBy: { ordem: "asc" } },
        retiros: { orderBy: { numero: "asc" } },
      },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.grupoFormacao.findMany({
      where: { organizacaoId: user.organizacaoId },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <PlanosClient
      role={user.role ?? "formador_comunitario"}
      grupoFormacaoId={user.grupoFormacaoId ?? null}
      initialPlanos={planosRaw.map(toPlano)}
      initialGruposFormacao={gruposFormacaoRaw.map(toGrupoFormacao)}
    />
  );
}
