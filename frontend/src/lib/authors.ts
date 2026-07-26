import { SITE_URL } from "@/lib/structured-data";

// Registro de autores do blog (E-E-A-T). O frontmatter `author:` de cada artigo
// referencia uma CHAVE aqui; o render (caixa de autor) e o JSON-LD (`author`)
// derivam o tipo (Organization × Person), a bio e os links a partir do registro.
//
// Hoje todos os artigos usam o autor institucional "formattio" (Organization).
// Para publicar como uma PESSOA no futuro (sinal E-E-A-T máximo), basta:
//   1) adicionar uma entrada `type: "Person"` abaixo (com foto em /public);
//   2) apontar `author: <chave>` no frontmatter do artigo.
// Nenhuma mudança no componente ou no builder de JSON-LD é necessária.

export type AuthorLink = { label: string; url: string };

export type Author = {
  id: string;
  /** Nome exibido e usado no schema (`author.name`). */
  name: string;
  /** Distingue Person × Organization no JSON-LD (Google trata diferente). */
  type: "Organization" | "Person";
  /** Cargo/credencial — subtítulo da caixa (sobretudo para autores-pessoa). */
  title?: string;
  /** Bio curta on-brand; sustenta a autoridade do conteúdo. */
  bio: string;
  /** Imagem em /public (símbolo da marca ou foto da pessoa). */
  avatar?: string;
  /** URL que representa o autor no schema (site da marca ou perfil). */
  url: string;
  /** Links da caixa (redes, "conhecer a plataforma"). */
  links?: AuthorLink[];
};

const DEFAULT_AUTHOR = "formattio";

const AUTHORS: Record<string, Author> = {
  formattio: {
    id: "formattio",
    name: "Formattio",
    type: "Organization",
    title: "Equipe editorial",
    bio: "Somos a plataforma de gestão formativa para novas comunidades, institutos e centros formativos católicos. Nosso conteúdo é fundamentado no Direito Canônico e na prática real de acompanhar a formação de pessoas — com método, memória e conformidade.",
    avatar: "/brand/formatio-symbol-on-dark.svg",
    url: SITE_URL,
    links: [
      { label: "Instagram", url: "https://www.instagram.com/formattio.app" },
      { label: "YouTube", url: "https://www.youtube.com/@Formattio" },
      { label: "Conhecer a plataforma", url: `${SITE_URL}/recursos` },
    ],
  },
};

/** Resolve a chave do frontmatter para um autor. Case-insensitive e tolerante:
 *  chave ausente ou desconhecida cai no autor institucional (nunca quebra o
 *  render de um artigo por causa de um `author:` digitado errado). */
export function getAuthor(key?: string): Author {
  if (!key) return AUTHORS[DEFAULT_AUTHOR];
  return AUTHORS[key.trim().toLowerCase()] ?? AUTHORS[DEFAULT_AUTHOR];
}
