import { Suspense } from "react";
import PortalLanding from "./PortalLanding";
import { getPublicBranding } from "@/lib/public-branding";

export const metadata = {
  title: "Portal do Formando",
};

export default async function PortalPage() {
  const branding = await getPublicBranding();
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <PortalLanding branding={branding} />
    </Suspense>
  );
}
