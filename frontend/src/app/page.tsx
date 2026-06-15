import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LandingPage from "./LandingPage";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Formattio — Gestão formativa para comunidades",
  description:
    "Plataforma de gestão formativa para comunidades e organizações. Cadastro de formandos, planos formativos, controle de presenças e jornada vocacional em conformidade com a LGPD.",
  openGraph: {
    title: "Formattio — Gestão formativa para comunidades",
    description:
      "Do cadastro ao acompanhamento das formações aplicadas, o Formattio centraliza toda a jornada formativa dos seus membros em uma plataforma simples, segura e em conformidade com a LGPD.",
    type: "website",
    locale: "pt_BR",
  },
};

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const orgId = process.env.DEFAULT_ORG_ID ?? "org_default";
  const org = await prisma.organizacao.findUnique({
    where: { id: orgId },
    select: { onboardingConcluido: true },
  }).catch(() => null);

  return <LandingPage isNewOrg={!org?.onboardingConcluido} />;
}
