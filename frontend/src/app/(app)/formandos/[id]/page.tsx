import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toFormando, toComentario, toEvento, toPresenca, toAgendamento, toMorada, toRelatorio } from "@/lib/converters";
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

  const moradaFilter =
    user.role === "formador_comunitario" ? { moradaId: user.moradaId ?? null } : {};

  const [formandoRow, org] = await Promise.all([
    prisma.formando.findFirst({
      where: { id, organizacaoId: user.organizacaoId, deletedAt: null, ...moradaFilter },
      include: { progressoEtapas: true },
    }),
    prisma.organizacao.findUnique({
      where: { id: user.organizacaoId },
      select: { termoFormando: true, termoFormador: true },
    }),
  ]);

  if (!formandoRow) redirect("/formandos");

  const [comentariosRows, eventosRows, presencasRows, moradaRow, todasMoradasRows] =
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
      formandoRow.moradaId
        ? prisma.morada.findFirst({ where: { id: formandoRow.moradaId } })
        : Promise.resolve(null),
      prisma.morada.findMany({
        where: { organizacaoId: user.organizacaoId, ativo: true },
        select: { id: true, nome: true, nivelFormativo: true },
        orderBy: { nome: "asc" },
      }),
    ]);

  const agendamentosRows = await prisma.agendamento.findMany({
    where: {
      organizacaoId: user.organizacaoId,
      nivelFormativo: formandoRow.nivelFormativo,
      ...(formandoRow.moradaId ? { moradaId: formandoRow.moradaId } : {}),
      deletedAt: null,
    },
    orderBy: { dataInicio: "desc" },
  });

  // Grade total from the formando's morada grade
  let gradeTotal: number | null = null;
  if (moradaRow?.gradeId) {
    const grade = await prisma.gradeFormativa.findUnique({
      where: { id: moradaRow.gradeId },
      select: { totalFormacoes: true },
    });
    gradeTotal = grade?.totalFormacoes ?? null;
  }

  // Relatório finalizado da etapa atual (para exibição inline)
  const relatorioRow = await prisma.relatorioEtapa.findUnique({
    where: {
      formandoId_nivelFormativo: {
        formandoId: id,
        nivelFormativo: formandoRow.nivelFormativo,
      },
    },
  });
  const relatorioFinalizado =
    relatorioRow?.status === "finalizado" ? toRelatorio(relatorioRow) : null;

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
      morada={moradaRow ? toMorada(moradaRow) : null}
      todasMoradas={todasMoradasRows}
      userId={user.id!}
      userName={session?.user?.name ?? "Formador"}
      userRole={user.role ?? "formador_comunitario"}
      userMoradaId={user.moradaId ?? null}
      termoFormando={org?.termoFormando?.trim() || "Formando"}
      termoFormador={org?.termoFormador?.trim() || "Formador Comunitário"}
      relatorioFinalizado={relatorioFinalizado}
    />
  );
}
