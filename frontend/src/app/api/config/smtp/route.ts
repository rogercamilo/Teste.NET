import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadSmtpConfig, saveSmtpConfig, isSmtpReady } from "@/lib/smtp-config";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";

import { SessionUser as SU } from "@/lib/auth-helpers";
import { temPermissao } from "@/types";

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!user.organizacaoId) return NextResponse.json({ error: "Configuração disponível apenas para organizações" }, { status: 403 });
  if (!temPermissao(user.role, "administrador")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  try {
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
  } catch (err) {
    logError("config/smtp", err);
    return NextResponse.json({ error: "Falha ao carregar configuração SMTP" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!user.organizacaoId) return NextResponse.json({ error: "Configuração disponível apenas para organizações" }, { status: 403 });
  if (!temPermissao(user.role, "administrador")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });

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
  } catch (err) {
    logError("config/smtp", err);
    return NextResponse.json({ error: "Falha ao salvar configuração SMTP" }, { status: 500 });
  }
}
