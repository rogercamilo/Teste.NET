import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LandingPage from "./LandingPage";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Formattio — Plataforma de gestão formativa para comunidades e institutos",
  description:
    "Acompanhe a jornada formativa de cada membro com a profundidade que ela merece. Grupos de formação, planos formativos, Jornada Vocacional, documentos eclesiásticos e conformidade com a LGPD.",
  openGraph: {
    title: "Formattio — Plataforma de gestão formativa para comunidades e institutos",
    description:
      "Chega de planilhas. Gerencie formandos, planos formativos, presenças e documentos eclesiásticos em uma plataforma segura, integrada e em conformidade com o direito canônico e a LGPD.",
    type: "website",
    locale: "pt_BR",
    url: "https://www.formattio.com.br/",
    siteName: "Formattio",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Formattio — Plataforma de gestão formativa para comunidades e institutos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Formattio — Plataforma de gestão formativa para comunidades e institutos",
    description:
      "Chega de planilhas. Gerencie formandos, planos formativos, presenças e documentos eclesiásticos em uma plataforma segura, integrada e em conformidade com o direito canônico e a LGPD.",
    images: ["/api/og"],
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

  return <LandingPage isNewOrg={org === null} />;
}
