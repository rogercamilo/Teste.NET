import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toPlano, toMorada } from "@/lib/converters";
import PlanosClient from "./PlanosClient";

export default async function PlanosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { role?: string; organizacaoId?: string; moradaId?: string | null };
  if (!user.organizacaoId) redirect("/login");

  const [planosRaw, moradasRaw] = await Promise.all([
    prisma.planoFormativo.findMany({
      where: { organizacaoId: user.organizacaoId },
      include: {
        eixos: { orderBy: { ordem: "asc" } },
        retiros: { orderBy: { numero: "asc" } },
      },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.morada.findMany({
      where: { organizacaoId: user.organizacaoId },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <PlanosClient
      role={user.role ?? "formador_comunitario"}
      moradaId={user.moradaId ?? null}
      initialPlanos={planosRaw.map(toPlano)}
      initialMoradas={moradasRaw.map(toMorada)}
    />
  );
}
