import { getPublicBranding } from "@/lib/public-branding";
import RecuperarClient from "./RecuperarClient";

export const metadata = {
  title: "Recuperar senha — Portal do Formando",
};

export default async function RecuperarPage() {
  const branding = await getPublicBranding();
  return <RecuperarClient branding={branding} />;
}
