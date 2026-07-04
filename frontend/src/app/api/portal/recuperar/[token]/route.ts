import { NextResponse } from "next/server";
import { z } from "zod";
import { peekAccessToken, definirSenhaPorToken } from "@/lib/portal-formando-auth";
import { getPortalAudiencia } from "@/lib/portal-data";
import { signPortalToken, portalCookieOptions } from "@/lib/portal-auth";
import { validatePassword } from "@/lib/password-validation";
import { limiters } from "@/lib/rate-limit";
import { parseJson } from "@/lib/schemas";
import { logAction, logError, getClientIp } from "@/lib/audit-log";

type Params = { params: Promise<{ token: string }> };

/** Valida o token de reset (sem consumir) para renderizar a tela. */
export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const peek = await peekAccessToken(token, "reset");
  if (!peek) return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 404 });
  return NextResponse.json({ nome: peek.nome, email: peek.email });
}

const ResetSchema = z.object({ senha: z.string().min(1) });

/** Define a nova senha via token de reset, consome o token e abre a sessão. */
export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const ip = getClientIp(request);

  const rl = await limiters.portalAtivacao(ip);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, { status: 429 });
  }

  try {
    const parsed = await parseJson(request, ResetSchema);
    if (!parsed.ok) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    const { senha } = parsed.data;

    const pw = validatePassword(senha);
    if (!pw.valid) {
      return NextResponse.json({ error: `Senha inválida: ${pw.errors.join("; ")}` }, { status: 400 });
    }

    const result = await definirSenhaPorToken(token, senha, "reset");
    if (!result.ok) {
      if (result.code === "conflict") {
        return NextResponse.json(
          { error: "Este e-mail já está vinculado a outra conta. Fale com o seu formador." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 404 });
    }

    const audiencia = await getPortalAudiencia(result.formandoId, result.organizacaoId);
    const jwt = await signPortalToken({ formandoId: result.formandoId, organizacaoId: result.organizacaoId, audiencia });
    const opts = portalCookieOptions();
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: opts.name,
      value: jwt,
      maxAge: opts.maxAge,
      httpOnly: opts.httpOnly,
      sameSite: opts.sameSite,
      secure: opts.secure,
      path: opts.path,
    });
    logAction("portal_reset_concluido", undefined, ip, { formandoId: result.formandoId }, result.organizacaoId);
    return response;
  } catch (err) {
    logError("portal/recuperar/[token] POST", err);
    return NextResponse.json({ error: "Falha ao redefinir a senha. Tente novamente." }, { status: 500 });
  }
}
