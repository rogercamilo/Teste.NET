import { getAllPosts, clusterLabel } from "@/lib/blog";
import { SITE_URL } from "@/lib/structured-data";

// Feed RSS 2.0 do blog (/blog/feed.xml). Gerado a partir dos mesmos artigos MDX
// das listagens — leitores de feed, agregadores e o Google descobrem novos
// posts por aqui. Servido como rota de handler (não passa pela CSP/nonce das
// páginas); revalida periodicamente para refletir novas publicações.

export const revalidate = 3600; // 1h — conteúdo editorial muda devagar

const TITLE = "Blog Formattio";
const DESCRIPTION =
  "Governança formativa, jornada vocacional e memória institucional para novas comunidades e institutos.";

/** Escapa caracteres reservados de XML para uso em texto/atributos. */
function xml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = getAllPosts();
  const feedUrl = `${SITE_URL}/blog/feed.xml`;
  const lastBuild = posts[0]
    ? new Date(`${posts[0].updated ?? posts[0].date}T00:00:00-03:00`)
    : new Date();

  const items = posts
    .map((p) => {
      const url = `${SITE_URL}/blog/${p.slug}`;
      const pubDate = new Date(`${p.date}T00:00:00-03:00`).toUTCString();
      return `    <item>
      <title>${xml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${xml(clusterLabel(p.cluster))}</category>
      <description>${xml(p.description)}</description>
    </item>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(TITLE)}</title>
    <link>${SITE_URL}/blog</link>
    <description>${xml(DESCRIPTION)}</description>
    <language>pt-BR</language>
    <lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
