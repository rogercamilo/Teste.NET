import { Suspense } from "react";
import { getPublicBranding } from "@/lib/public-branding";
import RecuperarClient from "./RecuperarClient";

export const metadata = {
  title: "Recuperar senha — Portal do Formando",
};

export default async function RecuperarPage() {
  const branding = await getPublicBranding();
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <RecuperarClient branding={branding} />
    </Suspense>
  );
}
