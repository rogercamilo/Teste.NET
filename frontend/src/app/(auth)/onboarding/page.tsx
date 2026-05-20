import { auth } from "@/auth";
import { redirect } from "next/navigation";
import OnboardingWizard from "./OnboardingWizard";
import { prisma } from "@/lib/prisma";

export default async function OnboardingPage() {
  const session = await auth();
  const user = session?.user as { organizacaoId?: string } | undefined;
  if (!user?.organizacaoId) redirect("/login");

  const org = await prisma.organizacao.findUnique({
    where: { id: user.organizacaoId },
    select: {
      id: true, nome: true, descricao: true, endereco: true, missao: true,
      anoFundacao: true, termoMorada: true, termoFormando: true, termoFormador: true,
      onboardingConcluido: true,
    },
  });

  if (!org) redirect("/login");
  if (org.onboardingConcluido) redirect("/dashboard");

  return <OnboardingWizard org={org} />;
}
