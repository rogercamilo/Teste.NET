import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendTrialExpiringEmail } from "@/lib/email";
import { logAction, logError } from "@/lib/audit-log";

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "super_admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  try {
    const agora = new Date();
    const limite = new Date(agora.getTime() + 3 * 86_400_000);

    const orgsExpirando = await prisma.organizacao.findMany({
      where: {
        status: "TRIAL",
        trialExpiresAt: { gte: agora, lte: limite },
      },
      include: {
        usuarios: {
          where: { perfil: { in: ["administrador", "formador_geral"] }, ativo: true, deletedAt: null },
          select: { nome: true, email: true },
          take: 3,
        },
      },
    });

    let sent = 0;
    let failed = 0;

    for (const org of orgsExpirando) {
      if (!org.trialExpiresAt) continue;
      for (const admin of org.usuarios) {
        const result = await sendTrialExpiringEmail({
          organizacaoId: org.id,
          email: admin.email,
          nome: admin.nome,
          orgNome: org.nome,
          trialExpiresAt: org.trialExpiresAt,
        });
        if (result.sent) sent++;
        else failed++;
      }
    }

    await logAction(
      "trial_reminder_sent",
      user.id,
      request.headers.get("x-forwarded-for") ?? undefined,
      { orgs: orgsExpirando.length, sent, failed },
      user.organizacaoId ?? undefined,
    );

    return NextResponse.json({ orgs: orgsExpirando.length, sent, failed });
  } catch (err) {
    logError("super-admin/trial-reminder POST", err);
    return NextResponse.json({ error: "Falha ao enviar lembretes" }, { status: 500 });
  }
}
