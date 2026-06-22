import { getPublicBranding } from "@/lib/public-branding";
import { getThemeInlineCss } from "@/lib/themes";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const branding = await getPublicBranding();
  const themeCss = getThemeInlineCss(branding.temaCor);
  return (
    <>
      {themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
      {children}
    </>
  );
}
