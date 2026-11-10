import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { limiters } from "@/lib/rate-limit";
import { logError } from "@/lib/audit-log";
import { criarNotificacao, formadorDoGrupo, revisoresDaOrg } from "@/lib/notificacoes";

/**
 * Pedido de LICENÇA (afastamento temporário) pelo FORMANDO no Portal.
 *
 * PONTE CANÔNICA: isto é só a MANIFESTAÇÃO DE VONTADE (requerimento) — nunca o ato.
 * Quem discerne, decide e lavra o termo no Livro é a autoridade (cân. 308; a licença
 * de uma associação de fiéis é regida pelos estatutos). Por isso a rota:
 *   1) registra o pedido (SolicitacaoLicencaFormando, status pendente);
 *   2) NOTIFICA o responsável (formador da morada + revisores/Formadores Gerais),
 *      que então abre o ProcessoEclesiastico (tipo=licenca) na aplicação.
 * Em hipótese alguma cria processo ou termo — a decisão permanece com a autoridade.
 *
 * Identidade vem dos headers injetados pelo proxy após verificar o portal_session
 * (não spoofáveis). Evita duplicação: havendo pedido pendente, retorna o existente.
 */
export async function POST(request: Request) {
  const formandoId = request.headers.get("x-formando-id");
  const organizacaoId = request.headers.get("x-formando-org");
  if (!formandoId || !organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const rl = await limiters.mutation(formandoId);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { motivo?: unknown };
    const motivo = typeof body.motivo === "string" ? body.motivo.slice(0, 2000).trim() : "";
    if (motivo.length < 10) {
      return NextResponse.json(
        { error: "Descreva brevemente o motivo do pedido de licença (ao menos 10 caracteres)." },
        { status: 422 }
      );
    }

    // Confere o vínculo e capta a morada para notificar o formador certo.
    const formando = await prisma.formando.findFirst({
      where: { id: formandoId, organizacaoId, deletedAt: null },
      select: { id: true, nome: true, grupoFormacaoId: true },
    });
    if (!formando) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });

    const pendente = await prisma.solicitacaoLicencaFormando.findFirst({
      where: { formandoId, organizacaoId, status: "pendente" },
      select: { id: true },
    });
    if (pendente) return NextResponse.json({ ok: true, jaPendente: true });

    await prisma.solicitacaoLicencaFormando.create({
      data: { formandoId, organizacaoId, motivo, status: "pendente" },
    });

    // Ponte: o requerimento chega à autoridade. Notifica o formador da morada e os
    // revisores (Formadores Gerais); de-duplicado. Falha de notificação não derruba
    // o pedido (ele fica registrado e visível na ficha do formando de todo modo).
    try {
      const [fcId, revisores] = await Promise.all([
        formando.grupoFormacaoId ? formadorDoGrupo(formando.grupoFormacaoId) : Promise.resolve(null),
        revisoresDaOrg(organizacaoId),
      ]);
      const destinatarios = [...new Set([...(fcId ? [fcId] : []), ...revisores])];
      await Promise.all(
        destinatarios.map((destinatarioId) =>
          criarNotificacao({
            organizacaoId,
            destinatarioId,
            tipo: "licenca_solicitada",
            titulo: `${formando.nome} solicitou licença`,
            corpo: "Pedido de afastamento temporário feito pelo portal. Converse com a pessoa e, havendo discernimento favorável, abra o processo de licença.",
            linkAcao: `/formandos/${formando.id}`,
          })
        )
      );
    } catch (err) {
      logError("portal licenca/solicitar notificacao", err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("portal licenca/solicitar POST", err);
    return NextResponse.json({ error: "Falha ao solicitar licença" }, { status: 500 });
  }
}

/**
 * Cancela (revoga) o próprio pedido de licença enquanto ainda está pendente.
 * Idempotente; escopado à identidade do portal (anti-IDOR). Não toca pedidos já
 * `atendida`/`recusada` (histórico preservado).
 */
export async function DELETE(request: Request) {
  const formandoId = request.headers.get("x-formando-id");
  const organizacaoId = request.headers.get("x-formando-org");
  if (!formandoId || !organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const rl = await limiters.mutation(formandoId);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  }

  try {
    await prisma.solicitacaoLicencaFormando.deleteMany({
      where: { formandoId, organizacaoId, status: "pendente" },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("portal licenca/solicitar DELETE", err);
    return NextResponse.json({ error: "Falha ao cancelar solicitação" }, { status: 500 });
  }
}
