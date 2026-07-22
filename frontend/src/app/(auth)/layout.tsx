import { NEUTRAL_BRANDING } from "@/lib/public-branding";
import { getThemeInlineCss } from "@/lib/themes";

// Renderização dinâmica obrigatória: sob a CSP estrita de produção
// (script-src 'nonce-…' 'strict-dynamic', sem unsafe-inline), o Next só aplica
// o nonce per-request aos seus <script> quando a página é renderizada
// dinamicamente. Se prerenderizada em build (o que o useSearchParams dentro de
// <Suspense> no LoginForm permitia), os scripts saem sem nonce e o navegador os
// bloqueia — a página fica presa no fallback do Suspense (tela em branco).
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Superfícies anônimas (login, registro, recuperação, convite, acesso-plataforma) não
  // resolvem o tenant → tema NEUTRO da plataforma. No login, a marca da org é aplicada
  // no cliente (applyThemePalette) após o e-mail. Evita vazar o tema de um tenant
  // específico (org_default) para usuários de outras organizações.
  const themeCss = getThemeInlineCss(NEUTRAL_BRANDING.temaCor);
  return (
    <>
      {themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
      {children}
    </>
  );
}
