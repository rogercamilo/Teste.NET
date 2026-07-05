import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import {
  getPortalDashboardData,
  getPortalMateriais,
  getPortalTravessia,
  getPortalAniversariantes,
} from "@/lib/portal-data";
import { getPublicBranding } from "@/lib/public-branding";
import { portalHomeFor } from "@/lib/portal-routes";
import DashboardClient from "./DashboardClient";

export const metadata = {
  title: "Meu Acompanhamento",
};

export default async function PortalDashboardPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/formando");

  const [data, materiais, travessia, aniversariantes, branding] = await Promise.all([
    getPortalDashboardData(session.formandoId, session.organizacaoId),
    getPortalMateriais(session.formandoId, session.organizacaoId),
    // Trilha de leitura é do público vocacional — pura economia p/ o formando.
    session.audiencia === "vocacional"
      ? getPortalTravessia(session.formandoId, session.organizacaoId)
      : Promise.resolve(null),
    getPortalAniversariantes(session.formandoId, session.organizacaoId),
    getPublicBranding(session.organizacaoId),
  ]);

  // Sessão válida mas formando inexistente/inativo → encerra pela porta de
  // origem (proxy limpará o cookie no próximo acesso protegido)
  if (!data) redirect(portalHomeFor(session.audiencia));

  return (
    <DashboardClient
      data={data}
      materiais={materiais}
      travessia={travessia}
      aniversariantes={aniversariantes}
      branding={branding}
    />
  );
}
