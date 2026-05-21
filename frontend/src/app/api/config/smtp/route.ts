import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadSmtpConfig, saveSmtpConfig, isSmtpReady } from "@/lib/smtp-config";
import { logAction, getClientIp } from "@/lib/audit-log";

type SU = { id?: string; role?: string; organizacaoId?: string };

function isAdminOrAbove(role: string | undefined): boolean {
  return role === "administrador" || role === "formador_geral";
}

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdminOrAbove(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const config = await loadSmtpConfig(user.organizacaoId);
  return NextResponse.json({
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    pass: config.pass ? "***" : "",
    from: config.from,
    configured: isSmtpReady(config),
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdminOrAbove(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  try {
    const body = await request.json() as {
      host?: string; port?: number; secure?: boolean;
      user?: string; pass?: string; from?: string;
    };
    const current = await loadSmtpConfig(user.organizacaoId);
    const updated = {
      host: body.host ?? current.host,
      port: Number(body.port ?? current.port),
      secure: Boolean(body.secure ?? current.secure),
      user: body.user ?? current.user,
      pass: body.pass === "***" ? current.pass : (body.pass ?? current.pass),
      from: body.from ?? current.from,
    };
    await saveSmtpConfig(user.organizacaoId, updated);
    logAction("smtp_config_changed", user.id, getClientIp(request), {}, user.organizacaoId);
    return NextResponse.json({ ok: true, configured: isSmtpReady(updated) });
  } catch {
    return NextResponse.json({ error: "Falha ao salvar configuração SMTP" }, { status: 500 });
  }
}
