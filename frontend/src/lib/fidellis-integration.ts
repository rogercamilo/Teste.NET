import { prisma } from "@/lib/prisma";
import { decryptField } from "@/lib/crypto";

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
