import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isValidId } from "@/lib/schemas";
import ResetCredenciaisClient from "./ResetCredenciaisClient";

type Params = { params: Promise<{ id: string }> };

export default async function ResetCredenciaisPage({ params }: Params) {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "super_admin") redirect("/dashboard");

  const { id } = await params;
  if (!isValidId(id)) redirect("/super-admin");

  const [org, admins] = await Promise.all([
    prisma.organizacao.findUnique({
      where: { id },
      select: { id: true, nome: true, status: true },
    }),
    prisma.usuario.findMany({
      where: { organizacaoId: id, perfil: "administrador", ativo: true },
      select: { id: true, nome: true, email: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  if (!org) redirect("/super-admin");

  return <ResetCredenciaisClient org={org} admins={admins} />;
}
