import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import GithubSlugger from "github-slugger";

// Motor de conteúdo do blog (Opção A — MDX no repositório).
//
// Os artigos vivem em `content/blog/*.mdx` com frontmatter. Esta camada lê e
// valida o frontmatter para as listagens/metadados (sem compilar o corpo — a
// compilação MDX acontece só na página do artigo, via next-mdx-remote). Roda
// no servidor (fs); em produção o Railway serve o Node com o repo presente, e
// as páginas são geradas estaticamente, então a leitura de fs é segura.

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

/** Pilares de conteúdo (= clusters de SEO). A chave é usada no frontmatter
 *  `cluster:` de cada artigo; o `label` aparece nos selos e listagens; a
 *  `description` alimenta a pillar page (`/blog/categoria/[cluster]`) — hero
 *  e metadados de SEO. */
export const CLUSTERS = {
  "governanca-formativa": {
    label: "Governança formativa",
    description:
      "Como garantir que o plano formativo seja vivido, acompanhado e verificado — pessoa a pessoa, ao longo de anos.",
  },
  "jornada-formativa": {
    label: "A jornada formativa",
    description:
      "Do plano à grade, do carisma ao encontro concreto: o caminho formativo de comunidades novas e institutos.",
  },
  "memoria-conformidade": {
    label: "Memória & conformidade",
    description:
      "Livros de registro, documentos eclesiásticos e a memória institucional que o Direito Canônico e a boa governança pedem.",
  },
  "vida-pratica": {
    label: "Vida prática da comunidade",
    description:
      "O dia a dia da formação: encontros, presença, acompanhamento e as rotinas que sustentam a jornada.",
  },
  "historias": {
    label: "Histórias & casos",
    description:
      "Experiências reais de comunidades e institutos que organizaram a sua formação com método e memória.",
  },
} as const;

export type ClusterId = keyof typeof CLUSTERS;

export function isClusterId(id: string): id is ClusterId {
  return Object.prototype.hasOwnProperty.call(CLUSTERS, id);
}

export function clusterLabel(id: string): string {
  return (CLUSTERS as Record<string, { label: string }>)[id]?.label ?? id;
}

export function clusterDescription(id: string): string {
  return (CLUSTERS as Record<string, { description: string }>)[id]?.description ?? "";
}

/** Par pergunta/resposta do bloco de FAQ de um artigo (frontmatter `faq:`).
 *  Alimenta tanto a UI (accordion visível) quanto o FAQPage JSON-LD — os dois
 *  precisam bater (o Google exige que a resposta esteja visível na página). */
export type FaqPair = { q: string; a: string };

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO (YYYY-MM-DD) — data de publicação
  updated?: string; // ISO (YYYY-MM-DD) — última revisão, se houver (frontmatter `updated:`)
  cluster: ClusterId;
  keyword?: string;
  cover?: string;
  author: string;
  published: boolean;
  readingMinutes: number;
  faq?: FaqPair[];
};

function estimateReadingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200)); // ~200 palavras/min
}

/** Normaliza a data do frontmatter para `YYYY-MM-DD`. O YAML interpreta
 *  `date: 2026-07-25` (sem aspas) como um objeto Date — daí o tratamento. */
function toISODate(v: unknown): string | null {
  const iso = v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

function parseFile(fileName: string): { meta: PostMeta; content: string } | null {
  const slug = fileName.replace(/\.mdx?$/, "");
  const raw = fs.readFileSync(path.join(BLOG_DIR, fileName), "utf8");
  const { data, content } = matter(raw);

  // Frontmatter obrigatório mínimo — artigo malformado é ignorado (não derruba o build).
  const date = toISODate(data.date);
  if (!data.title || !data.description || !date || !data.cluster) return null;

  // `updated` é opcional; só conta se for uma data válida E posterior à publicação.
  const updatedRaw = data.updated ? toISODate(data.updated) : null;
  const updated = updatedRaw && updatedRaw > date ? updatedRaw : undefined;

  const faq = parseFaq(data.faq);

  const meta: PostMeta = {
    slug,
    title: String(data.title),
    description: String(data.description),
    date,
    updated,
    cluster: String(data.cluster) as ClusterId,
    keyword: data.keyword ? String(data.keyword) : undefined,
    cover: data.cover ? String(data.cover) : undefined,
    author: data.author ? String(data.author) : "Formattio",
    published: data.published !== false, // default: publicado
    readingMinutes: estimateReadingMinutes(content),
    faq,
  };
  return { meta, content };
}

/** Valida o `faq:` do frontmatter (lista de `{ q, a }`). Entradas malformadas
 *  são descartadas em silêncio; ausência/lista vazia vira `undefined`. */
function parseFaq(v: unknown): FaqPair[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const pairs = v
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const q = "q" in item ? String((item as Record<string, unknown>).q).trim() : "";
      const a = "a" in item ? String((item as Record<string, unknown>).a).trim() : "";
      return q && a ? { q, a } : null;
    })
    .filter((p): p is FaqPair => p !== null);
  return pairs.length > 0 ? pairs : undefined;
}

function readAll(): { meta: PostMeta; content: string }[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => /\.mdx?$/.test(f))
    .map(parseFile)
    .filter((p): p is { meta: PostMeta; content: string } => p !== null);
}

const isProd = process.env.NODE_ENV === "production";

/** Todos os artigos publicáveis, do mais novo ao mais antigo. Em produção,
 *  rascunhos (`published: false`) são omitidos; em dev aparecem para preview. */
export function getAllPosts(): PostMeta[] {
  return readAll()
    .map((p) => p.meta)
    .filter((m) => (isProd ? m.published : true))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getAllSlugs(): string[] {
  return getAllPosts().map((m) => m.slug);
}

export function getPostBySlug(slug: string): { meta: PostMeta; content: string } | null {
  const post = readAll().find((p) => p.meta.slug === slug);
  if (!post) return null;
  if (isProd && !post.meta.published) return null;
  return post;
}

export type TocEntry = { depth: 2 | 3; text: string; id: string };

/** Remove marcação inline (negrito, itálico, código, links) do texto de um
 *  heading para gerar o rótulo do índice. */
function stripInlineMd(s: string): string {
  return s
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .trim();
}

/** Extrai os headings h2/h3 do corpo MDX para montar o índice ("Neste artigo").
 *  Os `id` são gerados com o MESMO github-slugger que o `rehype-slug` aplica na
 *  renderização — em ordem de documento — garantindo que as âncoras batam. */
export function extractHeadings(content: string): TocEntry[] {
  const slugger = new GithubSlugger();
  const out: TocEntry[] = [];
  let inFence = false;
  for (const line of content.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const depth = m[1].length as 2 | 3;
    const text = stripInlineMd(m[2]);
    out.push({ depth, text, id: slugger.slug(text) });
  }
  return out;
}

/** Artigos de um cluster (pilar), do mais novo ao mais antigo. */
export function getPostsByCluster(cluster: ClusterId): PostMeta[] {
  return getAllPosts().filter((p) => p.cluster === cluster);
}

/** Clusters que têm ao menos um artigo publicado, com a contagem. Usado para
 *  navegação por pilares no índice e para as pillar pages no sitemap — não
 *  listamos clusters vazios (evita páginas magras). */
export function getUsedClusters(): { id: ClusterId; count: number }[] {
  const counts = new Map<ClusterId, number>();
  for (const p of getAllPosts()) {
    counts.set(p.cluster, (counts.get(p.cluster) ?? 0) + 1);
  }
  return (Object.keys(CLUSTERS) as ClusterId[])
    .filter((id) => counts.has(id))
    .map((id) => ({ id, count: counts.get(id)! }));
}

/** Artigos relacionados: prioriza o mesmo cluster; completa com os mais
 *  recentes de outros clusters até atingir `limit`. Exclui o próprio slug. */
export function getRelatedPosts(slug: string, limit = 3): PostMeta[] {
  const all = getAllPosts();
  const current = all.find((p) => p.slug === slug);
  if (!current) return [];
  const others = all.filter((p) => p.slug !== slug);
  const sameCluster = others.filter((p) => p.cluster === current.cluster);
  const rest = others.filter((p) => p.cluster !== current.cluster);
  return [...sameCluster, ...rest].slice(0, limit);
}

/** Navegação sequencial (cronológica) entre artigos. `getAllPosts()` vem
 *  ordenado do mais recente para o mais antigo; aqui expomos a leitura em ordem
 *  de publicação: `prev` = artigo mais antigo, `next` = mais novo. `position` é
 *  a posição cronológica (1 = o mais antigo) e `total` a coleção inteira. */
export function getAdjacentPosts(slug: string): {
  prev: PostMeta | null;
  next: PostMeta | null;
  position: number;
  total: number;
} {
  const all = getAllPosts(); // desc: [0] = mais recente
  const i = all.findIndex((p) => p.slug === slug);
  if (i === -1) return { prev: null, next: null, position: 0, total: all.length };
  return {
    prev: all[i + 1] ?? null, // índice maior = mais antigo
    next: all[i - 1] ?? null, // índice menor = mais novo
    position: all.length - i, // cronológica: o mais antigo é 1
    total: all.length,
  };
}
