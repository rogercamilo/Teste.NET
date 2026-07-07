import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import { getPortalPerfil } from "@/lib/portal-data";
import { getPublicBranding } from "@/lib/public-branding";
import { portalHomeFor } from "@/lib/portal-routes";
import PerfilClient from "./PerfilClient";

export const metadata = {
  title: "Meu Perfil",
};

export default async function PortalPerfilPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/formando");

  const [perfil, branding] = await Promise.all([
    getPortalPerfil(session.formandoId, session.organizacaoId),
    getPublicBranding(session.organizacaoId),
  ]);

  // Sessão válida mas formando inexistente/inativo → encerra pela porta de origem.
  if (!perfil) redirect(portalHomeFor(session.audiencia));

  return <PerfilClient perfil={perfil} branding={branding} audiencia={session.audiencia} />;
}
