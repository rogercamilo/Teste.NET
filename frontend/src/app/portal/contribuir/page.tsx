import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import { prisma } from "@/lib/prisma";
import { getFidellisConfig, CONSENTIMENTO_DIZIMO_VERSAO } from "@/lib/fidellis-integration";
import { portalHomeFor } from "@/lib/portal-routes";
import ContribuirClient from "./ContribuirClient";

export const metadata = { title: "Contribuir" };

export default async function PortalContribuirPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/formando");

  // A aba só existe quando a instituição habilitou a integração Fidellis para esta organização.
  const cfg = await getFidellisConfig(session.organizacaoId);
  if (!cfg) redirect(portalHomeFor(session.audiencia));

  const consent = await prisma.consentimentoDizimo.findUnique({ where: { formandoId: session.formandoId } });
  const consentido = !!consent && !consent.revogadoEm;

  return <ContribuirClient consentido={consentido} versaoConsentimento={CONSENTIMENTO_DIZIMO_VERSAO} />;
}
