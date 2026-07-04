import { NextResponse } from "next/server";
import { z } from "zod";
import { loginFormando } from "@/lib/portal-formando-auth";
import { signPortalToken, portalCookieOptions } from "@/lib/portal-auth";
import { limiters } from "@/lib/rate-limit";
import { parseJson } from "@/lib/schemas";
import { logAction, logError, getClientIp } from "@/lib/audit-log";

const LoginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);

  try {
    const parsed = await parseJson(request, LoginSchema);
    if (!parsed.ok) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    const { email, senha } = parsed.data;

    const [rlIp, rlEmail] = await Promise.all([
      limiters.portalLogin(ip),
      limiters.portalLoginEmail(email),
    ]);
    if (!rlIp.allowed || !rlEmail.allowed) {
      logAction("portal_login_blocked", undefined, ip, { email, reason: "rate_limit" });
      return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, { status: 429 });
    }

    const result = await loginFormando(email, senha);
    if (!result.ok) {
      // Mensagem única para credencial inválida e conta bloqueada — não revela estado da conta.
      logAction("portal_login_failure", undefined, ip, { email, code: result.code });
      return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
    }

    const token = await signPortalToken({ formandoId: result.formandoId, organizacaoId: result.organizacaoId });
    const opts = portalCookieOptions();
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: opts.name,
      value: token,
      maxAge: opts.maxAge,
      httpOnly: opts.httpOnly,
      sameSite: opts.sameSite,
      secure: opts.secure,
      path: opts.path,
    });
    logAction("portal_login", undefined, ip, { formandoId: result.formandoId }, result.organizacaoId);
    return response;
  } catch (err) {
    logError("portal/login POST", err);
    return NextResponse.json({ error: "Falha ao entrar. Tente novamente." }, { status: 500 });
  }
}
