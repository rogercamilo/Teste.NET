import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LandingPage from "./LandingPage";
import { prisma } from "@/lib/prisma";

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
