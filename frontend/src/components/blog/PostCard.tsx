import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { clusterLabel, type PostMeta } from "@/lib/blog";

// Card de artigo reutilizado pelo índice do blog e pelas pillar pages
// (/blog/categoria/[cluster]). Server component (só estilo). A capa é
// opcional — degrada para card só-texto quando o frontmatter não tem `cover`.

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(d);
}

export function PostCard({ post }: { post: PostMeta }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] hover:border-primary/40 hover:bg-white/[0.04] transition-colors"
    >
      {post.cover && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={post.cover} alt="" className="aspect-[16/9] w-full object-cover" />
      )}
      <div className="flex flex-1 flex-col p-6">
        <span className="inline-flex self-start items-center rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1 mb-4">
          {clusterLabel(post.cluster)}
        </span>
        <h2 className="text-lg font-semibold text-white leading-snug group-hover:text-primary transition-colors">
          {post.title}
        </h2>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed line-clamp-3 flex-1">
          {post.description}
        </p>
        <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
          <span>
            {formatDate(post.date)} · {post.readingMinutes} min de leitura
          </span>
          <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  );
}
