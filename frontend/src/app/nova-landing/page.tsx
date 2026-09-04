import { permanentRedirect } from "next/navigation";

// A reescrita da página de vendas (V2) foi promovida para a home (/).
// Esta rota de preview permanece apenas como redirect permanente (308) para
// não quebrar links de preview compartilhados e evitar conteúdo duplicado.
export default function NovaLandingPreview() {
  permanentRedirect("/");
}
