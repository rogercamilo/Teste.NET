import { prisma } from "@/lib/prisma";
import { decryptField } from "@/lib/crypto";
import { logAction, logError } from "@/lib/audit-log";

/**
 * Integração Formattio → Fidellis (#80). Config por organização + chamadas server-to-server ao canal
 * autenticado do Fidellis (dízimo/oferta do membro; "Formattio lança, não armazena"). A chave de serviço
 * (`X-Integration-Key`) é guardada cifrada e só sai daqui no header — nunca vai ao browser.
 * Contrato: docs/integrations/formattio-fidellis-contract.md (repo Fidellis).
 */

/** Versão do texto de consentimento específico do cruzamento (LGPD art. 11, I). */
export const CONSENTIMENTO_DIZIMO_VERSAO = "1.0";

export type FidellisConfig = {
  tenantSlug: string;
  organizationId: string;
  baseUrl: string;
  serviceKey: string;
};

/** Config da integração da organização, com a chave decifrada. `null` se ausente ou desabilitada. */
export async function getFidellisConfig(organizacaoId: string): Promise<FidellisConfig | null> {
  const cfg = await prisma.integracaoFidellis.findUnique({ where: { organizacaoId } });
  if (!cfg || !cfg.habilitado) return null;
  return {
    tenantSlug: cfg.tenantSlug,
    organizationId: cfg.organizationId,
    baseUrl: cfg.baseUrl.replace(/\/+$/, ""),
    serviceKey: decryptField(cfg.serviceKeyEnc),
  };
}

export type FidellisResult = { ok: boolean; status: number; data: unknown };

type GiveInput = { externalId: string; amount: number; entryType: "tithe" | "offering"; method: "pix" | "boleto" };
type PledgeInput = { externalId: string; amount: number; dayOfMonth: number; method: "pix" | "boleto" };
type OffboardInput = { externalId: string; permanent: boolean };

export function fidellisGive(cfg: FidellisConfig, input: GiveInput): Promise<FidellisResult> {
  return callFidellis(cfg, "give", {
    externalId: input.externalId,
    organizationId: cfg.organizationId,
    amount: input.amount,
    entryType: input.entryType,
    method: input.method,
  });
}

export function fidellisPledge(cfg: FidellisConfig, input: PledgeInput): Promise<FidellisResult> {
  return callFidellis(cfg, "pledge", {
    externalId: input.externalId,
    organizationId: cfg.organizationId,
    amount: input.amount,
    dayOfMonth: input.dayOfMonth,
    method: input.method,
  });
}

export function fidellisOffboard(cfg: FidellisConfig, input: OffboardInput): Promise<FidellisResult> {
  return callFidellis(cfg, "offboard", { externalId: input.externalId, permanent: input.permanent });
}

/**
 * Offboarding best-effort (#80 fatia F3): ao perder o vínculo (formando inativado/excluído), sinaliza ao
 * Fidellis para pausar (`permanent=false`) ou encerrar (`permanent=true`) a recorrência de dízimo. Nunca
 * lança — a mutação do formando não pode falhar se o Fidellis estiver indisponível. No-op se a integração
 * não estiver habilitada para a organização.
 */
export async function offboardFidellis(organizacaoId: string, formandoId: string, permanent: boolean): Promise<void> {
  try {
    const cfg = await getFidellisConfig(organizacaoId);
    if (!cfg) return;
    const r = await fidellisOffboard(cfg, { externalId: formandoId, permanent });
    logAction("fidellis_offboard", undefined, undefined, { formandoId, permanent, ok: r.ok, status: r.status }, organizacaoId);
  } catch (err) {
    logError("offboardFidellis", err);
  }
}

async function callFidellis(cfg: FidellisConfig, path: string, body: unknown): Promise<FidellisResult> {
  const res = await fetch(`${cfg.baseUrl}/api/public/${cfg.tenantSlug}/integration/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "X-Integration-Key": cfg.serviceKey },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
