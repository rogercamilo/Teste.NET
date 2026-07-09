import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toPlano } from "@/lib/converters";
import GradeFormPage from "../GradeFormPage";

export default async function NovaGradePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as { organizacaoId?: string; role?: string };
  if (!user.organizacaoId) redirect("/login");
  const orgId = user.organizacaoId;

  const planos = await prisma.planoFormativo.findMany({
    where: { OR: [{ organizacaoId: orgId }, { isGlobal: true }], status: { not: "arquivado" } },
    include: { eixos: { orderBy: { ordem: "asc" } }, retiros: true },
    orderBy: { nome: "asc" },
  });

  return (
    <GradeFormPage
      role={user.role ?? "formador_comunitario"}
      initialPlanos={planos.map(toPlano)}
    />
  );
}
