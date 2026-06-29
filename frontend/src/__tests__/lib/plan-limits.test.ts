import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizacao: { findUnique: vi.fn() },
    formando: { count: vi.fn() },
    usuario: { count: vi.fn(), findMany: vi.fn() },
    arquivo: { aggregate: vi.fn() },
    auditLog: { findFirst: vi.fn() },
  },
}));
vi.mock("@/lib/email", () => ({ sendPlanLimitReachedEmail: vi.fn(async () => {}) }));
vi.mock("@/lib/audit-log", () => ({ logAction: vi.fn() }));

import { getLimits, canAddUser, canAddGrupoFormacao, canAddFormando, canUpload, getUsage, notifyAvancadoLimitIfNeeded } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";
import { sendPlanLimitReachedEmail } from "@/lib/email";
import { logAction } from "@/lib/audit-log";

const orgFindUnique = vi.mocked(prisma.organizacao.findUnique);
const formandoCount = vi.mocked(prisma.formando.count);
const usuarioCount = vi.mocked(prisma.usuario.count);
const usuarioFindMany = vi.mocked(prisma.usuario.findMany);
const arquivoAggregate = vi.mocked(prisma.arquivo.aggregate);
const auditLogFindFirst = vi.mocked(prisma.auditLog.findFirst);
const mockSendEmail = vi.mocked(sendPlanLimitReachedEmail);
const mockLogAction = vi.mocked(logAction);

/** Aguarda o microtask do fire-and-forget `doNotify` drenar. */
const flush = () => new Promise((r) => setTimeout(r, 0));

type Plano = "GRATUITO" | "BASICO" | "INTERMEDIARIO" | "AVANCADO" | "PERSONALIZADO";

const activeOrg = (plano: Plano) => ({
  planoAssinatura: plano,
  status: "ATIVO",
  trialExpiresAt: null,
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ── getLimits ────────────────────────────────────────────────────────────────

describe("getLimits", () => {
  it("GRATUITO blocks all users", () => {
    const l = getLimits("GRATUITO");
    expect(l.usuarios).toBe(0);
    expect(l.storageBytes).toBe(0);
  });

  it("BASICO has 60 users and 2 GB", () => {
    const l = getLimits("BASICO");
    expect(l.usuarios).toBe(60);
    expect(l.storageBytes).toBe(2 * 1024 * 1024 * 1024);
  });

  it("INTERMEDIARIO has 140 users and 10 GB", () => {
    const l = getLimits("INTERMEDIARIO");
    expect(l.usuarios).toBe(140);
    expect(l.storageBytes).toBe(10 * 1024 * 1024 * 1024);
  });

  it("AVANCADO has 350 users and 30 GB", () => {
    const l = getLimits("AVANCADO");
    expect(l.usuarios).toBe(350);
    expect(l.storageBytes).toBe(30 * 1024 * 1024 * 1024);
  });

  it("PERSONALIZADO is unlimited", () => {
    const l = getLimits("PERSONALIZADO");
    expect(l.usuarios).toBe(Infinity);
    expect(l.storageBytes).toBe(Infinity);
  });
});

// ── canAddGrupoFormacao ──────────────────────────────────────────────────────

describe("canAddGrupoFormacao", () => {
  it("always returns allowed (grupos are unlimited in all plans)", async () => {
    const result = await canAddGrupoFormacao();
    expect(result.allowed).toBe(true);
    expect(orgFindUnique).not.toHaveBeenCalled();
  });
});

// ── canAddUser ───────────────────────────────────────────────────────────────

describe("canAddUser", () => {
  it("denies when org not found", async () => {
    orgFindUnique.mockResolvedValue(null as never);
    const result = await canAddUser("org1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("não encontrada");
  });

  it("denies when org is suspended", async () => {
    orgFindUnique.mockResolvedValue({ ...activeOrg("BASICO"), status: "SUSPENSO" } as never);
    const result = await canAddUser("org1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("suspensa");
  });

  it("denies when org is cancelled", async () => {
    orgFindUnique.mockResolvedValue({ ...activeOrg("INTERMEDIARIO"), status: "CANCELADO" } as never);
    const result = await canAddUser("org1");
    expect(result.allowed).toBe(false);
  });

  it("denies when trial is expired", async () => {
    const expired = new Date(Date.now() - 1000);
    orgFindUnique.mockResolvedValue({
      ...activeOrg("BASICO"),
      status: "TRIAL",
      trialExpiresAt: expired,
    } as never);
    const result = await canAddUser("org1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("expirado");
  });

  it("allows when trial has not expired (counts against limit)", async () => {
    const future = new Date(Date.now() + 86_400_000);
    orgFindUnique.mockResolvedValue({
      ...activeOrg("BASICO"),
      status: "TRIAL",
      trialExpiresAt: future,
    } as never);
    formandoCount.mockResolvedValue(10 as never);
    usuarioCount.mockResolvedValue(2 as never);
    const result = await canAddUser("org1");
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(12);
    expect(result.limit).toBe(60);
  });

  it("denies GRATUITO (no subscription) regardless of count", async () => {
    orgFindUnique.mockResolvedValue(activeOrg("GRATUITO") as never);
    const result = await canAddUser("org1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Sem assinatura");
    expect(formandoCount).not.toHaveBeenCalled();
  });

  it("allows when under BASICO user limit (formandos + usuarios combined)", async () => {
    orgFindUnique.mockResolvedValue(activeOrg("BASICO") as never);
    formandoCount.mockResolvedValue(30 as never);
    usuarioCount.mockResolvedValue(5 as never);
    const result = await canAddUser("org1");
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(35);
    expect(result.limit).toBe(60);
  });

  it("denies when at BASICO user limit", async () => {
    orgFindUnique.mockResolvedValue(activeOrg("BASICO") as never);
    formandoCount.mockResolvedValue(55 as never);
    usuarioCount.mockResolvedValue(5 as never);
    const result = await canAddUser("org1");
    expect(result.allowed).toBe(false);
    expect(result.current).toBe(60);
    expect(result.limit).toBe(60);
  });

  it("always allows for PERSONALIZADO (infinite)", async () => {
    orgFindUnique.mockResolvedValue(activeOrg("PERSONALIZADO") as never);
    const result = await canAddUser("org1");
    expect(result.allowed).toBe(true);
    expect(formandoCount).not.toHaveBeenCalled();
    expect(usuarioCount).not.toHaveBeenCalled();
  });

  it("reports percentUsed correctly", async () => {
    orgFindUnique.mockResolvedValue(activeOrg("INTERMEDIARIO") as never);
    formandoCount.mockResolvedValue(70 as never);
    usuarioCount.mockResolvedValue(0 as never);
    const result = await canAddUser("org1");
    expect(result.percentUsed).toBe(50); // 70/140 * 100
  });
});

// ── canAddFormando (delegates to canAddUser) ─────────────────────────────────

describe("canAddFormando", () => {
  it("delegates to canAddUser", async () => {
    orgFindUnique.mockResolvedValue(activeOrg("BASICO") as never);
    formandoCount.mockResolvedValue(10 as never);
    usuarioCount.mockResolvedValue(2 as never);
    const result = await canAddFormando("org1");
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(60);
  });

  it("denies when org not found", async () => {
    orgFindUnique.mockResolvedValue(null as never);
    const result = await canAddFormando("org1");
    expect(result.allowed).toBe(false);
  });
});

// ── canUpload ────────────────────────────────────────────────────────────────

describe("canUpload", () => {
  it("denies GRATUITO (no subscription) regardless of size", async () => {
    orgFindUnique.mockResolvedValue(activeOrg("GRATUITO") as never);
    const result = await canUpload("org1", 1024);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Sem assinatura");
    expect(arquivoAggregate).not.toHaveBeenCalled();
  });

  it("allows upload within BASICO storage limit (2 GB)", async () => {
    orgFindUnique.mockResolvedValue(activeOrg("BASICO") as never);
    arquivoAggregate.mockResolvedValue({ _sum: { tamanho: 100 * 1024 * 1024 } } as never);
    const result = await canUpload("org1", 1024 * 1024);
    expect(result.allowed).toBe(true);
  });

  it("denies upload that would exceed BASICO storage limit", async () => {
    orgFindUnique.mockResolvedValue(activeOrg("BASICO") as never);
    const limitBytes = 2 * 1024 * 1024 * 1024;
    arquivoAggregate.mockResolvedValue({ _sum: { tamanho: limitBytes - 100 } } as never);
    const result = await canUpload("org1", 1024 * 1024);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("armazenamento");
  });

  it("handles null sum (no files yet)", async () => {
    orgFindUnique.mockResolvedValue(activeOrg("INTERMEDIARIO") as never);
    arquivoAggregate.mockResolvedValue({ _sum: { tamanho: null } } as never);
    const result = await canUpload("org1", 1024);
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(0);
  });

  it("always allows for PERSONALIZADO", async () => {
    orgFindUnique.mockResolvedValue(activeOrg("PERSONALIZADO") as never);
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
    orgFindUnique.mockResolvedValue({ ...activeOrg("INTERMEDIARIO"), status: "SUSPENSO" } as never);
    const result = await canUpload("org1", 1024);
    expect(result.allowed).toBe(false);
  });

  it("denies when trial is expired", async () => {
    const expired = new Date(Date.now() - 1000);
    orgFindUnique.mockResolvedValue({
      ...activeOrg("BASICO"),
      status: "TRIAL",
      trialExpiresAt: expired,
    } as never);
    const result = await canUpload("org1", 1024);
    expect(result.allowed).toBe(false);
  });
});

// ── getUsage ─────────────────────────────────────────────────────────────────

describe("getUsage", () => {
  it("returns null limits for GRATUITO (0 limit = no subscription)", async () => {
    orgFindUnique.mockResolvedValue({ planoAssinatura: "GRATUITO" } as never);
    formandoCount.mockResolvedValue(0 as never);
    usuarioCount.mockResolvedValue(0 as never);
    arquivoAggregate.mockResolvedValue({ _sum: { tamanho: null } } as never);

    const usage = await getUsage("org1");
    expect(usage.plano).toBe("GRATUITO");
    expect(usage.usuarios.limit).toBeNull();
    expect(usage.storage.limit).toBeNull();
  });

  it("returns correct usage for BASICO plan", async () => {
    orgFindUnique.mockResolvedValue({ planoAssinatura: "BASICO" } as never);
    formandoCount.mockResolvedValue(20 as never);
    usuarioCount.mockResolvedValue(5 as never);
    arquivoAggregate.mockResolvedValue({ _sum: { tamanho: 500 * 1024 * 1024 } } as never);

    const usage = await getUsage("org1");
    expect(usage.plano).toBe("BASICO");
    expect(usage.usuarios.current).toBe(25);
    expect(usage.usuarios.limit).toBe(60);
    expect(usage.usuarios.percentUsed).toBe(42); // round(25/60*100)
    expect(usage.storage.limit).toBe(2 * 1024 * 1024 * 1024);
  });

  it("returns null limits for PERSONALIZADO plan", async () => {
    orgFindUnique.mockResolvedValue({ planoAssinatura: "PERSONALIZADO" } as never);
    formandoCount.mockResolvedValue(0 as never);
    usuarioCount.mockResolvedValue(0 as never);
    arquivoAggregate.mockResolvedValue({ _sum: { tamanho: null } } as never);

    const usage = await getUsage("org1");
    expect(usage.usuarios.limit).toBeNull();
    expect(usage.storage.limit).toBeNull();
    expect(usage.usuarios.percentUsed).toBe(0);
  });

  it("throws when org not found", async () => {
    orgFindUnique.mockResolvedValue(null as never);
    await expect(getUsage("org1")).rejects.toThrow("não encontrada");
  });

  it("computes percentUsed correctly for INTERMEDIARIO plan", async () => {
    orgFindUnique.mockResolvedValue({ planoAssinatura: "INTERMEDIARIO" } as never);
    formandoCount.mockResolvedValue(70 as never);
    usuarioCount.mockResolvedValue(0 as never);
    arquivoAggregate.mockResolvedValue({ _sum: { tamanho: 5 * 1024 * 1024 * 1024 } } as never);

    const usage = await getUsage("org1");
    expect(usage.usuarios.percentUsed).toBe(50); // 70/140 * 100
    expect(usage.storage.percentUsed).toBe(50);  // 5GB / 10GB * 100
  });
});

describe("canAddGrupoFormacao", () => {
  it("nunca limita a criação de grupos de formação", async () => {
    const r = await canAddGrupoFormacao();
    expect(r.allowed).toBe(true);
  });
});

describe("notifyAvancadoLimitIfNeeded", () => {
  it("não notifica quando a org não é AVANCADO (early-return), sem lançar", async () => {
    orgFindUnique.mockResolvedValue({ nome: "Org", planoAssinatura: "BASICO" } as never);
    expect(() => notifyAvancadoLimitIfNeeded("org1", "usuarios")).not.toThrow();
    await flush();
    expect(orgFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "org1" } }));
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("notifica os admins e audita quando AVANCADO sem envio recente", async () => {
    orgFindUnique.mockResolvedValue({ nome: "Comunidade X", planoAssinatura: "AVANCADO" } as never);
    auditLogFindFirst.mockResolvedValue(null as never);
    usuarioFindMany.mockResolvedValue([
      { id: "a1", email: "a1@x.org" },
      { id: "a2", email: "a2@x.org" },
    ] as never);

    notifyAvancadoLimitIfNeeded("org1", "storage");
    await flush();

    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ organizacaoId: "org1", orgNome: "Comunidade X", tipoLimite: "storage", email: "a1@x.org" }),
    );
    expect(mockLogAction).toHaveBeenCalledWith(
      "plan_limit_email_enviado",
      "system",
      undefined,
      { tipoLimite: "storage" },
      "org1",
    );
  });

  it("respeita o cooldown: não reenvia quando há notificação recente", async () => {
    orgFindUnique.mockResolvedValue({ nome: "Org", planoAssinatura: "AVANCADO" } as never);
    auditLogFindFirst.mockResolvedValue({ id: "log_recent" } as never);

    notifyAvancadoLimitIfNeeded("org1", "usuarios");
    await flush();

    expect(usuarioFindMany).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("não envia quando a org AVANCADO não tem administradores ativos", async () => {
    orgFindUnique.mockResolvedValue({ nome: "Org", planoAssinatura: "AVANCADO" } as never);
    auditLogFindFirst.mockResolvedValue(null as never);
    usuarioFindMany.mockResolvedValue([] as never);

    notifyAvancadoLimitIfNeeded("org1", "usuarios");
    await flush();

    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockLogAction).not.toHaveBeenCalled();
  });
});
