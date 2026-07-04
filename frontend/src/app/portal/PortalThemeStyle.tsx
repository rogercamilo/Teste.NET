import { getThemeInlineCss } from "@/lib/themes";

/**
 * Injeta o tema do tenant nas rotas anônimas de token (ativar/recuperar), onde o
 * `portal/layout.tsx` não enxerga a org (não há cookie de sessão) e cai no DEFAULT.
 * Renderizado dentro do `{children}` do layout, este `<style>` vem DEPOIS do tema
 * default no DOM — mesma especificidade `:root{}`, então a declaração posterior vence
 * e a cor correta do tenant é aplicada já no primeiro paint (sem flash).
 */
export default function PortalThemeStyle({ temaCor }: { temaCor: string | null | undefined }) {
  const themeCss = getThemeInlineCss(temaCor);
  if (!themeCss) return null;
  return <style dangerouslySetInnerHTML={{ __html: themeCss }} />;
}
