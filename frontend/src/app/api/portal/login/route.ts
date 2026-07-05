import { NextResponse } from "next/server";
import { z } from "zod";
import { loginFormando } from "@/lib/portal-formando-auth";
import { getPortalAudiencia } from "@/lib/portal-data";
import { signPortalToken, portalCookieOptions } from "@/lib/portal-auth";
import { limiters } from "@/lib/rate-limit";
import { parseJson } from "@/lib/schemas";
import { logAction, logError, getClientIp } from "@/lib/audit-log";

const LoginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
  // Porta pela qual a pessoa entra — obrigatória. Cada portal só admite o seu
  // perfil; requisição sem porta válida não corresponde a portal algum → 400.
  portal: z.enum(["formando", "vocacional"]),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);

  try {
    const parsed = await parseJson(request, LoginSchema);
    if (!parsed.ok) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    const { email, senha, portal: portalSolicitado } = parsed.data;

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

    // Perfis distintos: cada portal só admite o seu público. Credenciais válidas
    // mas perfil incompatível com a porta → barra a entrada (sem emitir sessão) e
    // aponta a porta correta. Só o dono da conta chega aqui (autenticou), então
    // revelar a porta certa não é enumeração.
    const audiencia = await getPortalAudiencia(result.formandoId, result.organizacaoId);
    if (audiencia !== portalSolicitado) {
      logAction(
        "portal_login_wrong_portal",
        undefined,
        ip,
        { formandoId: result.formandoId, portalSolicitado, audiencia },
        result.organizacaoId
      );
      return NextResponse.json(
        {
          error:
            audiencia === "vocacional"
              ? "Esta conta é do Portal do Vocacionado. Entre por lá."
              : "Esta conta é do Portal do Formando. Entre por lá.",
          portalCorreto: audiencia,
        },
        { status: 403 }
      );
    }

    const token = await signPortalToken({ formandoId: result.formandoId, organizacaoId: result.organizacaoId, audiencia });
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
