import { Suspense } from "react";
import PortalLanding from "../PortalLanding";
import { getPublicBranding } from "@/lib/public-branding";

export const metadata = {
  title: "Portal do Vocacionado",
};

// Entrada distinta e favoritável do Portal do Vocacionado. A autenticação e a
// estrutura são as mesmas do Portal do Formando (mesmo login, mesmo dashboard
// que adapta o conteúdo vocacional); aqui muda apenas a identidade da porta de
// entrada, para que cada público tenha sua própria URL para guardar.
export default async function PortalVocacionalPage() {
  const branding = await getPublicBranding();
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <PortalLanding branding={branding} portalNome="Portal do Vocacionado" portalKey="vocacional" />
    </Suspense>
  );
}
