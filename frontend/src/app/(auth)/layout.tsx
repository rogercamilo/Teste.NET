import { getPublicBranding } from "@/lib/public-branding";
import { getThemeInlineCss } from "@/lib/themes";

// Renderização dinâmica obrigatória: sob a CSP estrita de produção
// (script-src 'nonce-…' 'strict-dynamic', sem unsafe-inline), o Next só aplica
// o nonce per-request aos seus <script> quando a página é renderizada
// dinamicamente. Se prerenderizada em build (o que o useSearchParams dentro de
// <Suspense> no LoginForm permitia), os scripts saem sem nonce e o navegador os
// bloqueia — a página fica presa no fallback do Suspense (tela em branco).
export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const branding = await getPublicBranding();
  const themeCss = getThemeInlineCss(branding.temaCor);
  return (
    <>
      {themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
      {children}
    </>
  );
}
