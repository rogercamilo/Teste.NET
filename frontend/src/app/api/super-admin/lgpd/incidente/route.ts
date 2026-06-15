import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendIncidentNotificationEmail } from "@/lib/email";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "super_admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  }

  let body: { organizacaoId?: string | null; descricao?: string; dataIncidente?: string; medidas?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const descricao = body.descricao?.trim() ?? "";
  const dataIncidente = body.dataIncidente?.trim() ?? "";
  const medidas = body.medidas?.trim() ?? "";

  if (!descricao || !dataIncidente || !medidas) {
    return NextResponse.json({ error: "Descrição, data e medidas são obrigatórios." }, { status: 400 });
  }
  if (descricao.length > 2000 || medidas.length > 2000) {
    return NextResponse.json({ error: "Descrição e medidas não podem exceder 2000 caracteres." }, { status: 400 });
  }

  const { organizacaoId } = body;

  try {
    const where = organizacaoId
      ? { organizacaoId, ativo: true, deletedAt: null }
      : { ativo: true, deletedAt: null };

    const usuarios = await prisma.usuario.findMany({
      where,
      select: {
        id: true,
        nome: true,
        email: true,
        organizacaoId: true,
        organizacao: { select: { nome: true } },
      },
      take: 10000,
    });

    let sent = 0;
    let failed = 0;

    const BATCH_SIZE = 20;
    for (let i = 0; i < usuarios.length; i += BATCH_SIZE) {
      const batch = usuarios.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((u) =>
          sendIncidentNotificationEmail({
            organizacaoId: u.organizacaoId,
            email: u.email,
            nome: u.nome,
            orgNome: u.organizacao.nome,
            descricao,
            dataIncidente,
            medidas,
          })
        )
      );
      for (const r of batchResults) {
        if (r.status === "fulfilled" && r.value.sent) sent++;
        else failed++;
      }
    }

    logAction(
      "lgpd_incident_notification_sent",
      user.id ?? undefined,
      getClientIp(request),
      { organizacaoId: organizacaoId ?? "todas", totalDestinatarios: usuarios.length, sent, failed },
      organizacaoId ?? undefined
    );

    return NextResponse.json({ ok: true, sent, failed, total: usuarios.length });
  } catch (err) {
    logError("super-admin/lgpd/incidente POST", err);
    return NextResponse.json({ error: "Falha ao enviar notificações" }, { status: 500 });
  }
}
