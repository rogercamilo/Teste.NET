import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { getRelatorioDef, podeVerRelatorio, normalizarPeriodo } from "@/lib/relatorios/catalogo";
import { carregarRelatorio, type RelatorioCarregado } from "@/lib/relatorios/carregar";
import { logError } from "@/lib/audit-log";
import RelatorioClient from "./RelatorioClient";
import type { SessionUser } from "@/lib/auth-helpers";
import type { PerfilUsuario } from "@/types";

export default async function RelatorioSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ periodo?: string; morada?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.organizacaoId) redirect("/login");

  const perfil = (user.role ?? "formador_comunitario") as PerfilUsuario;
  const def = getRelatorioDef(slug);
  if (!def || !podeVerRelatorio(perfil, slug)) notFound();

  const periodoDias = normalizarPeriodo(sp.periodo);
  const moradaId = sp.morada ?? null;

  let carregado: RelatorioCarregado | null = null;
  try {
    carregado = await carregarRelatorio(def.slug, {
      organizacaoId: user.organizacaoId,
      perfil,
      grupoFormacaoId: user.grupoFormacaoId ?? null,
      userId: user.id ?? "",
      moradaId,
      periodoDias,
    });
  } catch (err) {
    logError("carregarRelatorio", err);
  }

  return (
    <RelatorioClient
      slug={def.slug}
      titulo={def.titulo}
      escopo={def.escopo}
      periodoDias={periodoDias}
      moradaId={moradaId}
      meta={carregado?.meta ?? null}
      resultado={carregado?.resultado ?? null}
      erro={!carregado}
    />
  );
}
