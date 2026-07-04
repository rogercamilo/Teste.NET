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

/** Valida o token de ativação (sem consumir) e devolve dados para a tela. */
export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const peek = await peekAccessToken(token, "ativacao");
  if (!peek) return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 404 });
  return NextResponse.json({ nome: peek.nome, email: peek.email, orgNome: peek.orgNome, grupoNome: peek.grupoNome });
}

const AtivarSchema = z.object({ senha: z.string().min(1) });

/** Define a senha (1º acesso), consome o token e abre a sessão do portal. */
export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const ip = getClientIp(request);

  const rl = await limiters.portalAtivacao(ip);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, { status: 429 });
  }

  try {
    const parsed = await parseJson(request, AtivarSchema);
    if (!parsed.ok) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    const { senha } = parsed.data;

    const pw = validatePassword(senha);
    if (!pw.valid) {
      return NextResponse.json({ error: `Senha inválida: ${pw.errors.join("; ")}` }, { status: 400 });
    }

    const result = await definirSenhaPorToken(token, senha, "ativacao");
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
    logAction("portal_ativado", undefined, ip, { formandoId: result.formandoId }, result.organizacaoId);
    return response;
  } catch (err) {
    logError("portal/ativar POST", err);
    return NextResponse.json({ error: "Falha ao definir a senha. Tente novamente." }, { status: 500 });
  }
}
