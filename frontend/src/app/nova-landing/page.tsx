import type { Metadata } from "next";
import LandingPageV2 from "../LandingPageV2";

// Rota de PREVIEW da reescrita da página de vendas (documento "Reescrita PDV -
// Formattio.md"). Isolada da home (/) para permitir iteração sem afetar a página
// em produção. noindex: não deve ser rastreada nem indexada enquanto é rascunho.
export const metadata: Metadata = {
  title: { absolute: "Formattio — Nova página (preview)" },
  robots: { index: false, follow: false },
  alternates: { canonical: "/nova-landing" },
};

// Fora do cache de marketing (ver proxy.ts) → preview sempre fresco a cada edição.
export const dynamic = "force-dynamic";

export default function NovaLandingPreview() {
  return <LandingPageV2 />;
}
