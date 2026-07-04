import { getPortalSession } from "@/lib/portal-auth";
import { getPublicBranding } from "@/lib/public-branding";
import { getThemeInlineCss } from "@/lib/themes";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Em rotas autenticadas (dashboard) o cookie de sessão dá a org → tema do tenant correto.
  // Em rotas anônimas (landing, ativar/recuperar) não há sessão → DEFAULT_ORG_ID.
  const session = await getPortalSession();
  const branding = await getPublicBranding(session?.organizacaoId);
  const themeCss = getThemeInlineCss(branding.temaCor);
  return (
    <>
      {themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
      {children}
    </>
  );
}
