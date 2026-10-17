import { NextResponse } from "next/server";
import { z } from "zod";
import { criarPedidoAcessoAntecipado } from "@/lib/acesso-antecipado-store";
import { limiters } from "@/lib/rate-limit";
import { parseJson } from "@/lib/schemas";
import { logError, getClientIp, anonymizeIp } from "@/lib/audit-log";
import {
  valoresDe,
  TIPO_ORGANIZACAO_OPCOES,
  NUMERO_MEMBROS_OPCOES,
  INTENCAO_OPCOES,
} from "@/lib/acesso-antecipado-opcoes";

const Schema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(120),
  // Campos de seleção fechada — whitelist (enum) rejeita valores forjados.
  papel: z.string().trim().max(80).optional().or(z.literal("")),
  comunidade: z.string().trim().min(2, "Informe a comunidade ou instituto").max(160),
  tipoOrganizacao: z.enum(valoresDe(TIPO_ORGANIZACAO_OPCOES)),
  numeroMembros: z.enum(valoresDe(NUMERO_MEMBROS_OPCOES)),
  intencao: z.enum(valoresDe(INTENCAO_OPCOES)),
  // Contato — ambos obrigatórios (direcionamento do formulário).
  whatsapp: z.string().trim().min(8, "Informe um WhatsApp válido").max(40),
  email: z.string().trim().email("E-mail inválido").max(200),
  desafio: z.string().trim().max(2000).optional().or(z.literal("")),
  planoInteresse: z.string().trim().max(60).optional().or(z.literal("")),
  // Consentimento LGPD obrigatório (base legal: consentimento).
  consent: z.literal(true, { message: "É preciso aceitar para continuar" }),
  // Honeypot: campo invisível que só bots preenchem.
  website: z.string().max(200).optional(),
});

/**
 * Captura pública do pedido de acesso antecipado (lead de alta intenção na
 * landing). Protegido por honeypot + rate-limit por IP + CSRF same-origin (proxy).
 * A escrita no banco vive no store (`criarPedidoAcessoAntecipado`) — a rota só
 * valida, limita e delega. Ao contrário do ímã de eBook, NÃO há double opt-in
 * nem anti-enumeração: respondemos erro real para o cliente poder tentar de novo
 * e não perder o lead em silêncio.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  try {
    const parsed = await parseJson(request, Schema);
    if (!parsed.ok) {
      return NextResponse.json({ error: "Verifique os campos e tente novamente." }, { status: 400 });
    }
    const d = parsed.data;

    // Honeypot preenchido = bot. Responde 200 sem fazer nada (não sinaliza a detecção).
    if (d.website) return NextResponse.json({ ok: true });

    const rl = await limiters.acessoAntecipadoIp(ip);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
        { status: 429 }
      );
    }

    const res = await criarPedidoAcessoAntecipado({
      nome: d.nome,
      papel: d.papel || null,
      comunidade: d.comunidade,
      tipoOrganizacao: d.tipoOrganizacao,
      numeroMembros: d.numeroMembros,
      intencao: d.intencao,
      whatsapp: d.whatsapp,
      email: d.email,
      desafio: d.desafio || null,
      planoInteresse: d.planoInteresse || null,
      ipAnon: anonymizeIp(ip),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Não foi possível registrar seu pedido agora. Tente novamente em instantes." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("acesso-antecipado POST", err);
    return NextResponse.json({ error: "Erro ao processar. Tente novamente." }, { status: 500 });
  }
}
