import { auth } from "@/auth";
import { redirect } from "next/navigation";
import OnboardingWizard from "./OnboardingWizard";
import { prisma } from "@/lib/prisma";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session?.user?.organizacaoId) redirect("/login");
  const { organizacaoId } = session.user;

  const org = await prisma.organizacao.findUnique({
    where: { id: organizacaoId },
    select: {
      id: true, nome: true, tipoOrganizacao: true, descricao: true, endereco: true, missao: true,
      anoFundacao: true, termoGrupoFormacao: true, termoFormando: true, termoFormador: true,
      termoPreDiscipulado: true, termoDiscipulado: true,
      termoPrimeirasPromessas: true, termoFormacaoPermanente: true,
      onboardingConcluido: true, logoUrl: true, temaCor: true, planoAssinatura: true,
    },
  });

  if (!org) redirect("/login");
  if (org.onboardingConcluido) redirect("/dashboard");
  if ((session.user as { role?: string }).role === "formador_comunitario") redirect("/dashboard");

  const sp = await searchParams;
  const initialStep = sp.checkout === "success" ? 4 : sp.checkout === "cancelled" ? 3 : 1;

  return <OnboardingWizard org={org} initialStep={initialStep} />;
}
