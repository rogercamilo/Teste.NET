import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// Motor de conteúdo do blog (Opção A — MDX no repositório).
//
// Os artigos vivem em `content/blog/*.mdx` com frontmatter. Esta camada lê e
// valida o frontmatter para as listagens/metadados (sem compilar o corpo — a
// compilação MDX acontece só na página do artigo, via next-mdx-remote). Roda
// no servidor (fs); em produção o Railway serve o Node com o repo presente, e
// as páginas são geradas estaticamente, então a leitura de fs é segura.

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

/** Pilares de conteúdo (= clusters de SEO). A chave é usada no frontmatter
 *  `cluster:` de cada artigo; o rótulo aparece nos selos e listagens. */
export const CLUSTERS = {
  "governanca-formativa": { label: "Governança formativa" },
  "jornada-formativa": { label: "A jornada formativa" },
  "memoria-conformidade": { label: "Memória & conformidade" },
  "vida-pratica": { label: "Vida prática da comunidade" },
  "historias": { label: "Histórias & casos" },
} as const;

export type ClusterId = keyof typeof CLUSTERS;

export function clusterLabel(id: string): string {
  return (CLUSTERS as Record<string, { label: string }>)[id]?.label ?? id;
}

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO (YYYY-MM-DD)
  cluster: ClusterId;
  keyword?: string;
  cover?: string;
  author: string;
  published: boolean;
  readingMinutes: number;
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

  const meta: PostMeta = {
    slug,
    title: String(data.title),
    description: String(data.description),
    date,
    cluster: String(data.cluster) as ClusterId,
    keyword: data.keyword ? String(data.keyword) : undefined,
    cover: data.cover ? String(data.cover) : undefined,
    author: data.author ? String(data.author) : "Formattio",
    published: data.published !== false, // default: publicado
    readingMinutes: estimateReadingMinutes(content),
  };
  return { meta, content };
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
