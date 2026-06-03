import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toComentario, toFormando } from "@/lib/converters";
import ComentariosClient from "./ComentariosClient";

export default async function ComentariosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { role?: string; organizacaoId?: string; moradaId?: string | null };
  if (!user.organizacaoId) redirect("/login");

  const comentariosWhere: Record<string, unknown> = { organizacaoId: user.organizacaoId };
  const formandosWhere: Record<string, unknown> = { organizacaoId: user.organizacaoId, deletedAt: null };

  if (user.role === "formador_comunitario" && user.moradaId) {
    comentariosWhere.formando = { moradaId: user.moradaId };
    formandosWhere.moradaId = user.moradaId;
  }

  const [comentariosRaw, formandosRaw] = await Promise.all([
    prisma.comentarioFormando.findMany({
      where: comentariosWhere,
      orderBy: { criadoEm: "desc" },
    }),
    prisma.formando.findMany({
      where: formandosWhere,
      include: { progressoEtapas: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <ComentariosClient
      initialComentarios={comentariosRaw.map(toComentario)}
      initialFormandos={formandosRaw.map(toFormando)}
    />
  );
}
