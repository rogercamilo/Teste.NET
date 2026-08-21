import type { Metadata } from "next";
import { getPortalSession } from "@/lib/portal-auth";
import { getPublicBranding } from "@/lib/public-branding";
import { getThemeInlineCss } from "@/lib/themes";

// Manifest por porta: no iPhone, "Adicionar à Tela de Início" salva o `start_url`
// do manifest da página atual. O manifest global (`/site.webmanifest`) aponta
// para "/", o que faria o atalho abrir a home da plataforma, não o portal. Aqui
// escolhemos o manifest da porta pela sessão do portal — cobre o dashboard, que
// é onde o guia de instalação aparece. As landings de cada porta reforçam o seu
// próprio manifest no metadata da página (mais específico que o do layout).
export async function generateMetadata(): Promise<Metadata> {
  const session = await getPortalSession();
  const manifest =
    session?.audiencia === "vocacional"
      ? "/portal-vocacional.webmanifest"
      : "/portal-formando.webmanifest";
  return { manifest };
}

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
