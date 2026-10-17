import { prisma } from "./prisma";
import { logAction, logError } from "./audit-log";
import { normalizeEmail } from "./email-suppression";
import { sendAcessoAntecipadoTeamEmail, sendAcessoAntecipadoAckEmail } from "./email";
import { ACESSO_ANTECIPADO_NOTIFY, CONSENT_VERSAO } from "./leads-config";
import {
  rotuloDe,
  TIPO_ORGANIZACAO_OPCOES,
  NUMERO_MEMBROS_OPCOES,
  INTENCAO_OPCOES,
} from "./acesso-antecipado-opcoes";

export interface AcessoAntecipadoInput {
  nome: string;
  papel?: string | null;
  comunidade: string;
  tipoOrganizacao: string;
  numeroMembros: string;
  intencao: string;
  whatsapp: string;
  email: string;
  desafio?: string | null;
  planoInteresse?: string | null;
  ipAnon?: string | null;
}

/**
 * Registra um pedido de acesso antecipado (lead de alta intenção) e dispara, de
 * forma best-effort, o aviso interno para a equipe (com reply-to no lead) e a
 * confirmação para quem pediu. A persistência é o caminho crítico: se ela falhar,
 * retorna `{ ok: false }` para o chamador pedir nova tentativa (não perder o
 * lead em silêncio). Falha de e-mail NÃO derruba o pedido. Sem double opt-in:
 * é um pedido explícito de contato.
 */
export async function criarPedidoAcessoAntecipado(
  input: AcessoAntecipadoInput
): Promise<{ ok: boolean }> {
  try {
    const email = normalizeEmail(input.email);
    const nome = input.nome.trim().slice(0, 120);
    const comunidade = input.comunidade.trim().slice(0, 160);
    const papel = input.papel?.trim().slice(0, 80) || null;
    const whatsapp = input.whatsapp.trim().slice(0, 40);
    const desafio = input.desafio?.trim().slice(0, 2000) || null;
    const planoInteresse = input.planoInteresse?.trim().slice(0, 60) || null;

    const lead = await prisma.acessoAntecipadoLead.create({
      data: {
        nome,
        papel,
        comunidade,
        tipoOrganizacao: input.tipoOrganizacao,
        numeroMembros: input.numeroMembros,
        intencao: input.intencao,
        whatsapp,
        email,
        desafio,
        planoInteresse,
        origem: "acesso-antecipado",
        consentLGPD: true,
        consentEm: new Date(),
        consentVersao: CONSENT_VERSAO,
        ipAnon: input.ipAnon ?? null,
      },
      select: { id: true },
    });

    logAction("acesso_antecipado_pedido", undefined, undefined, {
      leadId: lead.id,
      intencao: input.intencao,
      numeroMembros: input.numeroMembros,
    });

    // E-mails best-effort — nunca derrubam a resposta ao cliente.
    const tipoLabel = rotuloDe(TIPO_ORGANIZACAO_OPCOES, input.tipoOrganizacao);
    const porteLabel = rotuloDe(NUMERO_MEMBROS_OPCOES, input.numeroMembros);
    const intencaoLabel = rotuloDe(INTENCAO_OPCOES, input.intencao);
    const destinatarios = ACESSO_ANTECIPADO_NOTIFY.split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    await Promise.allSettled([
      ...destinatarios.map((to) =>
        sendAcessoAntecipadoTeamEmail({
          to,
          nome,
          papel,
          comunidade,
          tipoOrganizacao: tipoLabel,
          numeroMembros: porteLabel,
          intencao: intencaoLabel,
          whatsapp,
          email,
          desafio,
          planoInteresse,
        })
      ),
      sendAcessoAntecipadoAckEmail({ nome, email }),
    ]);

    return { ok: true };
  } catch (err) {
    logError("criarPedidoAcessoAntecipado", err);
    return { ok: false };
  }
}
