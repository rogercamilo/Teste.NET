import { headers } from "next/headers";

// Server component que injeta um bloco JSON-LD respeitando a CSP.
//
// A CSP do app (src/proxy.ts) usa `script-src 'nonce-…' 'strict-dynamic'` sem
// 'unsafe-inline' em produção — então TODO <script>, inclusive os de dados
// (application/ld+json), precisa carregar o nonce per-request ou o navegador
// o bloqueia silenciosamente. O nonce chega via header `x-nonce`, setado pelo
// proxy. Ler headers() também força render dinâmico, o que evita o gotcha de
// página estática sob CSP (ver feedback-csp-nonce-static-page).
//
// `data` aceita um objeto ou uma lista de objetos schema.org.
export async function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // Escapa `<` para impedir que o conteúdo feche o <script> prematuramente.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
