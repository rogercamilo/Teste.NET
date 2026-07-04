import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import { getPortalDashboardData } from "@/lib/portal-data";
import { getPublicBranding } from "@/lib/public-branding";
import DashboardClient from "./DashboardClient";

export const metadata = {
  title: "Meu Acompanhamento",
};

export default async function PortalDashboardPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal");

  const [data, branding] = await Promise.all([
    getPortalDashboardData(session.formandoId, session.organizacaoId),
    getPublicBranding(session.organizacaoId),
  ]);

  // Sessão válida mas formando inexistente/inativo → encerra (proxy limpará o cookie no próximo acesso protegido)
  if (!data) redirect("/portal");

  return <DashboardClient data={data} branding={branding} />;
}
