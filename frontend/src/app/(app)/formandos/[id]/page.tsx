import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrgBranding } from "@/lib/org-cache";
import { toFormando, toComentario, toEvento, toPresenca, toAgendamento, toGrupoFormacao } from "@/lib/converters";
import type { SessionUser } from "@/lib/auth-helpers";
import type { DocumentoAnexo } from "@/types";
import FormandoDetailClient from "./FormandoDetailClient";

export default async function FormandoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!user?.organizacaoId) redirect("/login");

  const grupoFormacaoFilter =
    user.role === "formador_comunitario" ? { grupoFormacaoId: user.grupoFormacaoId ?? null } : {};

  const [formandoRow, org] = await Promise.all([
    prisma.formando.findFirst({
      where: { id, organizacaoId: user.organizacaoId, deletedAt: null, ...grupoFormacaoFilter },
      include: { progressoEtapas: true },
    }),
    prisma.organizacao.findUnique({
      where: { id: user.organizacaoId },
      select: { termoFormando: true, termoFormador: true },
    }),
  ]);

  if (!formandoRow) redirect("/formandos");

  const [comentariosRows, eventosRows, presencasRows, grupoFormacaoRow, todosGruposFormacaoRows] =
    await Promise.all([
      prisma.comentarioFormando.findMany({
        where: { formandoId: id, organizacaoId: user.organizacaoId },
        orderBy: { criadoEm: "desc" },
      }),
      prisma.eventoFormando.findMany({
        where: { formandoId: id, organizacaoId: user.organizacaoId },
        orderBy: { criadoEm: "desc" },
        include: { documentos: true },
      }),
      prisma.presencaFormacao.findMany({
        where: { formandoId: id, organizacaoId: user.organizacaoId },
        orderBy: { data: "desc" },
      }),
      formandoRow.grupoFormacaoId
        ? prisma.grupoFormacao.findFirst({ where: { id: formandoRow.grupoFormacaoId } })
        : Promise.resolve(null),
      prisma.grupoFormacao.findMany({
        where: { organizacaoId: user.organizacaoId, ativo: true },
        select: { id: true, nome: true, nivelFormativo: true },
        orderBy: { nome: "asc" },
      }),
    ]);

  const agendamentosRows = await prisma.agendamento.findMany({
    where: {
      organizacaoId: user.organizacaoId,
      nivelFormativo: formandoRow.nivelFormativo,
      ...(formandoRow.grupoFormacaoId ? { grupoFormacaoId: formandoRow.grupoFormacaoId } : {}),
      deletedAt: null,
    },
    orderBy: { dataInicio: "desc" },
  });

  // Grade total from the formando's morada grade
  let gradeTotal: number | null = null;
  if (grupoFormacaoRow?.gradeId) {
    const grade = await prisma.gradeFormativa.findUnique({
      where: { id: grupoFormacaoRow.gradeId },
      select: { totalFormacoes: true },
    });
    gradeTotal = grade?.totalFormacoes ?? null;
  }

  return (
    <FormandoDetailClient
      id={id}
      formando={toFormando({
        ...formandoRow,
        totalFormacoes: gradeTotal ?? formandoRow.totalFormacoes,
      })}
      comentarios={comentariosRows.map(toComentario)}
      eventos={eventosRows.map((r) => ({
        ...toEvento(r),
        documentos: r.documentos.map(
          (d): DocumentoAnexo => ({
            id: d.id,
            nome: d.nome,
            tamanho: d.tamanho,
            tipo: d.tipo,
            criadoEm: d.criadoEm.toISOString(),
          })
        ),
      }))}
      presencas={presencasRows.map(toPresenca)}
      agendamentos={agendamentosRows.map(toAgendamento)}
      morada={grupoFormacaoRow ? toGrupoFormacao(grupoFormacaoRow) : null}
      todasMoradas={todosGruposFormacaoRows}
      userId={user.id!}
      userName={session?.user?.name ?? "Formador"}
      userRole={user.role ?? "formador_comunitario"}
      userGrupoFormacaoId={user.grupoFormacaoId ?? null}
      termoFormando={org?.termoFormando?.trim() || "Formando"}
      termoFormador={org?.termoFormador?.trim() || "Formador Comunitário"}
    />
  );
}
