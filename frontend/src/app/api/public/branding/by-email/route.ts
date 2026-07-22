import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicBranding, NEUTRAL_BRANDING } from "@/lib/public-branding";
import { findByEmailGlobal } from "@/lib/users-store";
import { limiters } from "@/lib/rate-limit";
import { parseJson } from "@/lib/schemas";
import { getClientIp } from "@/lib/audit-log";

const Schema = z.object({ email: z.string().email() });

// Login em 2 passos: recebe o e-mail e devolve a identidade visual da ORGANIZAÇÃO
// do usuário (logo/tema/nome) para o passo da senha ser renderizado já com a marca
// da comunidade. A invariante "1 e-mail = 1 org" torna a resolução determinística.
//
// Anti-abuso: e-mail desconhecido devolve a marca NEUTRA (mesma do 1º paint) e SEMPRE
// 200 — nunca 404 — então não dá para distinguir "existe" de "não existe" pelo status.
// O que ele revela (por design do requisito) é a marca associada a um e-mail existente;
// o rate-limit por IP encarece varreduras. Rota somente-leitura (sem escrita).
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = await limiters.brandingLookup(ip);
  if (!rl.allowed) {
    // Degrada para neutro em vez de 429: a tela nunca trava por causa do branding.
    return NextResponse.json(NEUTRAL_BRANDING);
  }

  const parsed = await parseJson(request, Schema);
  if (!parsed.ok) return NextResponse.json(NEUTRAL_BRANDING);

  const email = parsed.data.email.toLowerCase().trim();
  const user = await findByEmailGlobal(email);
  if (!user?.organizacaoId) return NextResponse.json(NEUTRAL_BRANDING);

  const branding = await getPublicBranding(user.organizacaoId);
  return NextResponse.json(branding);
}
