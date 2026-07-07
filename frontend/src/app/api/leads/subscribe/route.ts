import { NextResponse } from "next/server";
import { z } from "zod";
import { subscribeLead } from "@/lib/leads-store";
import { limiters } from "@/lib/rate-limit";
import { parseJson } from "@/lib/schemas";
import { logError, getClientIp, anonymizeIp } from "@/lib/audit-log";

const SubscribeSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().email("E-mail inválido").max(200),
  // Telefone/WhatsApp opcional — aceita vazio.
  telefone: z.string().trim().max(40).optional().or(z.literal("")),
  whatsappOptIn: z.boolean().optional(),
  // Consentimento LGPD obrigatório (base legal: consentimento).
  consent: z.literal(true, { message: "É preciso aceitar para continuar" }),
  // Honeypot: campo invisível que só bots preenchem. Aceito no schema para poder
  // responder 200 silencioso (sem sinalizar a detecção); tratado abaixo.
  website: z.string().max(200).optional(),
});

/**
 * Cadastro público de lead (ímã eBook na landing). Double opt-in: sempre
 * responde sucesso genérico (anti-enumeração) — não revela se o e-mail já
 * existe. Protegido por honeypot + rate-limit por IP e por e-mail.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  try {
    const parsed = await parseJson(request, SubscribeSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    const { nome, email, telefone, whatsappOptIn, website } = parsed.data;

    // Honeypot preenchido = bot. Responde 200 sem fazer nada (não sinaliza a detecção).
    if (website) return NextResponse.json({ ok: true });

    const [rlIp, rlEmail] = await Promise.all([
      limiters.leadSubscribeIp(ip),
      limiters.leadSubscribeEmail(email),
    ]);
    if (!rlIp.allowed || !rlEmail.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
        { status: 429 }
      );
    }

    await subscribeLead({
      nome,
      email,
      telefone: telefone || null,
      whatsappOptIn: whatsappOptIn ?? false,
      origem: "landing",
      ipAnon: anonymizeIp(ip),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("leads/subscribe POST", err);
    // Resposta genérica mesmo em erro — não vaza estado.
    return NextResponse.json({ ok: true });
  }
}
