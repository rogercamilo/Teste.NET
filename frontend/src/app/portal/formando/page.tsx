import { Suspense } from "react";
import PortalLanding from "../PortalLanding";
import { getPublicBranding } from "@/lib/public-branding";

export const metadata = {
  title: "Portal do Formando",
  // Garante que o atalho na Tela de Início do iPhone abra o Portal do Formando
  // (start_url), mesmo quando adicionado a partir desta landing (sem sessão).
  manifest: "/portal-formando.webmanifest",
};

// Entrada canônica e favoritável do Portal do Formando. Simétrica a
// /portal/vocacional; login, estrutura e dashboard são compartilhados.
export default async function PortalFormandoPage() {
  const branding = await getPublicBranding();
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <PortalLanding branding={branding} portalNome="Portal do Formando" portalKey="formando" />
    </Suspense>
  );
}
