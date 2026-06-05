import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizacao: { findUnique: vi.fn() },
    grupoFormacao: { count: vi.fn() },
    formando: { count: vi.fn() },
    arquivo: { aggregate: vi.fn() },
  },
}));

import { getLimits, canAddGrupoFormacao, canAddFormando, canUpload, getUsage } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";

const orgFindUnique = vi.mocked(prisma.organizacao.findUnique);
const grupoFormacaoCount = vi.mocked(prisma.grupoFormacao.count);
const formandoCount = vi.mocked(prisma.formando.count);
const arquivoAggregate = vi.mocked(prisma.arquivo.aggregate);

const activeOrg = (plano: "GRATUITO" | "ESSENCIAL" | "PROFISSIONAL") => ({
  planoAssinatura: plano,
  status: "ATIVO",
  trialExpiresAt: null,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ── getLimits ────────────────────────────────────────────────────────────────

describe("getLimits", () => {
  it("returns GRATUITO limits", () => {
    const l = getLimits("GRATUITO");
    expect(l.gruposFormacao).toBe(1);
    expect(l.formandos).toBe(30);
    expect(l.storageBytes).toBe(500 * 1024 * 1024);
  });

  it("returns ESSENCIAL limits", () => {
    const l = getLimits("ESSENCIAL");
    expect(l.gruposFormacao).toBe(3);
    expect(l.formandos).toBe(150);
    expect(l.storageBytes).toBe(2 * 1024 * 1024 * 1024);
  });

  it("returns Infinity limits for PROFISSIONAL", () => {
    const l = getLimits("PROFISSIONAL");
    expect(l.gruposFormacao).toBe(Infinity);
    expect(l.formandos).toBe(Infinity);
    expect(l.storageBytes).toBe(Infinity);
  });
});

// ── canAddGrupoFormacao ─────────────────────────────────────────────────────────────

describe("canAddGrupoFormacao", () => {
  it("denies when org not found", async () => {
    orgFindUnique.mockResolvedValue(null as never);
    const result = await canAddGrupoFormacao("org1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("não encontrada");
  });

  it("denies when org is suspended", async () => {
    orgFindUnique.mockResolvedValue({ ...activeOrg("GRATUITO"), status: "SUSPENSO" } as never);
    const result = await canAddGrupoFormacao("org1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("suspensa");
  });

  it("denies when org is cancelled", async () => {
    orgFindUnique.mockResolvedValue({ ...activeOrg("GRATUITO"), status: "CANCELADO" } as never);
    const result = await canAddGrupoFormacao("org1");
    expect(result.allowed).toBe(false);
  });

  it("denies when trial is expired", async () => {
    const expired = new Date(Date.now() - 1000);
    orgFindUnique.mockResolvedValue({
      ...activeOrg("GRATUITO"),
      status: "TRIAL",
      trialExpiresAt: expired,
    } as never);
    const result = await canAddGrupoFormacao("org1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("expirado");
  });

  it("allows when trial has not expired", async () => {
    const future = new Date(Date.now() + 86_400_000);
    orgFindUnique.mockResolvedValue({
      ...activeOrg("GRATUITO"),
      status: "TRIAL",
      trialExpiresAt: future,
    } as never);
    grupoFormacaoCount.mockResolvedValue(0 as never);
    const result = await canAddGrupoFormacao("org1");
    expect(result.allowed).toBe(true);
  });

  it("allows when under morada limit", async () => {
    orgFindUnique.mockResolvedValue(activeOrg("GRATUITO") as never);
    grupoFormacaoCount.mockResolvedValue(0 as never);
    const result = await canAddGrupoFormacao("org1");
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(0);
    expect(result.limit).toBe(1);
  });

  it("denies when at morada limit", async () => {
    orgFindUnique.mockResolvedValue(activeOrg("GRATUITO") as never);
    grupoFormacaoCount.mockResolvedValue(1 as never);
    const result = await canAddGrupoFormacao("org1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Limite");
  });

  it("always allows for PROFISSIONAL (infinite)", async () => {
    orgFindUnique.mockResolvedValue(activeOrg("PROFISSIONAL") as never);
    const result = await canAddGrupoFormacao("org1");
    expect(result.allowed).toBe(true);
    expect(grupoFormacaoCount).not.toHaveBeenCalled();
  });

  it("reports percentUsed", async () => {
    orgFindUnique.mockResolvedValue(activeOrg("ESSENCIAL") as never);
    grupoFormacaoCount.mockResolvedValue(1 as never);
    const result = await canAddGrupoFormacao("org1");
    expect(result.percentUsed).toBe(33); // round(1/3 * 100)
  });
});

// ── canAddFormando ───────────────────────────────────────────────────────────

describe("canAddFormando", () => {
  it("allows when under formando limit", async () => {
    orgFindUnique.mockResolvedValue(activeOrg("GRATUITO") as never);
    formandoCount.mockResolvedValue(10 as never);
    const result = await canAddFormando("org1");
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(30);
  });

  it("denies when at formando limit", async () => {
    orgFindUnique.mockResolvedValue(activeOrg("GRATUITO") as never);
    formandoCount.mockResolvedValue(30 as never);
    const result = await canAddFormando("org1");
    expect(result.allowed).toBe(false);
    expect(result.current).toBe(30);
  });

  it("always allows for PROFISSIONAL", async () => {
    orgFindUnique.mockResolvedValue(activeOrg("PROFISSIONAL") as never);
    const result = await canAddFormando("org1");
    expect(result.allowed).toBe(true);
    expect(formandoCount).not.toHaveBeenCalled();
  });

  it("denies when org not found", async () => {
    orgFindUnique.mockResolvedValue(null as never);
    const result = await canAddFormando("org1");
    expect(result.allowed).toBe(false);
  });
});

// ── canAddFormando (status checks) ──────────────────────────────────────────

describe("canAddFormando (status checks)", () => {
  it("denies when org is suspended", async () => {
    orgFindUnique.mockResolvedValue({ ...activeOrg("ESSENCIAL"), status: "SUSPENSO" } as never);
    const result = await canAddFormando("org1");
    expect(result.allowed).toBe(false);
  });

  it("denies when org is cancelled", async () => {
    orgFindUnique.mockResolvedValue({ ...activeOrg("ESSENCIAL"), status: "CANCELADO" } as never);
    const result = await canAddFormando("org1");
    expect(result.allowed).toBe(false);
  });

  it("denies when trial is expired", async () => {
    const expired = new Date(Date.now() - 1000);
    orgFindUnique.mockResolvedValue({
      ...activeOrg("GRATUITO"),
      status: "TRIAL",
      trialExpiresAt: expired,
    } as never);
    const result = await canAddFormando("org1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("expirado");
  });
});

// ── canUpload ────────────────────────────────────────────────────────────────

describe("canUpload", () => {
  it("allows upload within storage limit", async () => {
    orgFindUnique.mockResolvedValue(activeOrg("GRATUITO") as never);
    arquivoAggregate.mockResolvedValue({ _sum: { tamanho: 100 * 1024 * 1024 } } as never);
    const result = await canUpload("org1", 1024 * 1024); // 1 MB upload
    expect(result.allowed).toBe(true);
  });

  it("denies upload that would exceed storage limit", async () => {
    orgFindUnique.mockResolvedValue(activeOrg("GRATUITO") as never);
    const limitBytes = 500 * 1024 * 1024;
    arquivoAggregate.mockResolvedValue({ _sum: { tamanho: limitBytes - 100 } } as never);
    const result = await canUpload("org1", 1024 * 1024); // 1 MB pushes over
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("armazenamento");
  });

  it("handles null sum (no files yet)", async () => {
    orgFindUnique.mockResolvedValue(activeOrg("ESSENCIAL") as never);
    arquivoAggregate.mockResolvedValue({ _sum: { tamanho: null } } as never);
    const result = await canUpload("org1", 1024);
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(0);
  });

  it("always allows for PROFISSIONAL", async () => {
    orgFindUnique.mockResolvedValue(activeOrg("PROFISSIONAL") as never);
    const result = await canUpload("org1", 999_999_999);
    expect(result.allowed).toBe(true);
    expect(arquivoAggregate).not.toHaveBeenCalled();
  });

  it("denies when org not found", async () => {
    orgFindUnique.mockResolvedValue(null as never);
    const result = await canUpload("org1", 100);
    expect(result.allowed).toBe(false);
  });

  it("denies when org is suspended", async () => {
    orgFindUnique.mockResolvedValue({ ...activeOrg("ESSENCIAL"), status: "SUSPENSO" } as never);
    const result = await canUpload("org1", 1024);
    expect(result.allowed).toBe(false);
  });

  it("denies when trial is expired", async () => {
    const expired = new Date(Date.now() - 1000);
    orgFindUnique.mockResolvedValue({
      ...activeOrg("GRATUITO"),
      status: "TRIAL",
      trialExpiresAt: expired,
    } as never);
    const result = await canUpload("org1", 1024);
    expect(result.allowed).toBe(false);
  });
});

// ── getUsage ─────────────────────────────────────────────────────────────────

describe("getUsage", () => {
  it("returns correct usage for GRATUITO plan", async () => {
    orgFindUnique.mockResolvedValue({ planoAssinatura: "GRATUITO" } as never);
    grupoFormacaoCount.mockResolvedValue(1 as never);
    formandoCount.mockResolvedValue(10 as never);
    arquivoAggregate.mockResolvedValue({ _sum: { tamanho: 50 * 1024 * 1024 } } as never);

    const usage = await getUsage("org1");
    expect(usage.plano).toBe("GRATUITO");
    expect(usage.gruposFormacao.current).toBe(1);
    expect(usage.gruposFormacao.limit).toBe(1);
    expect(usage.formandos.current).toBe(10);
    expect(usage.formandos.limit).toBe(30);
    expect(usage.storage.current).toBe(50 * 1024 * 1024);
  });

  it("returns null limits for PROFISSIONAL plan", async () => {
    orgFindUnique.mockResolvedValue({ planoAssinatura: "PROFISSIONAL" } as never);
    grupoFormacaoCount.mockResolvedValue(0 as never);
    formandoCount.mockResolvedValue(0 as never);
    arquivoAggregate.mockResolvedValue({ _sum: { tamanho: null } } as never);

    const usage = await getUsage("org1");
    expect(usage.gruposFormacao.limit).toBeNull();
    expect(usage.formandos.limit).toBeNull();
    expect(usage.storage.limit).toBeNull();
    expect(usage.gruposFormacao.percentUsed).toBe(0);
  });

  it("throws when org not found", async () => {
    orgFindUnique.mockResolvedValue(null as never);
    await expect(getUsage("org1")).rejects.toThrow("não encontrada");
  });

  it("computes percentUsed for ESSENCIAL plan", async () => {
    orgFindUnique.mockResolvedValue({ planoAssinatura: "ESSENCIAL" } as never);
    grupoFormacaoCount.mockResolvedValue(3 as never);
    formandoCount.mockResolvedValue(75 as never);
    arquivoAggregate.mockResolvedValue({ _sum: { tamanho: 1024 * 1024 * 1024 } } as never);

    const usage = await getUsage("org1");
    expect(usage.gruposFormacao.percentUsed).toBe(100); // 3/3 * 100
    expect(usage.formandos.percentUsed).toBe(50); // 75/150 * 100
    expect(usage.storage.percentUsed).toBe(50);   // 1GB / 2GB * 100
  });
});
