import { ThemeApplier } from "@/components/layout/ThemeApplier";
import { getPublicBranding } from "@/lib/public-branding";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const branding = await getPublicBranding();
  return (
    <>
      <ThemeApplier themeKey={branding.temaCor} />
      {children}
    </>
  );
}
