import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth-helpers";
import { hasVocacionalAccess, temPermissao } from "@/types";
import VitrineClient from "./VitrineClient";

export const dynamic = "force-dynamic";

export default async function VitrinePage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!user?.organizacaoId) redirect("/login");
  if (!temPermissao(user.role, "formador_geral")) redirect("/dashboard");

  const org = await prisma.organizacao.findUnique({
    where: { id: user.organizacaoId },
    select: { tipoOrganizacao: true, vocacionalHabilitado: true },
  });

  if (!hasVocacionalAccess(org?.tipoOrganizacao, org?.vocacionalHabilitado)) {
    redirect("/dashboard");
  }

  return <VitrineClient />;
}
