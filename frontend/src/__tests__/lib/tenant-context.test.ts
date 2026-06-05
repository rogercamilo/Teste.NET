import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizacao: { findUnique: vi.fn() },
  },
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_ORG_ID,
  assertTenant,
  getOrganizacaoId,
  getOrganizacaoIdOptional,
  getOrganizacao,
} from "@/lib/tenant-context";

const mockAuth = vi.mocked(auth);
const mockFindUnique = vi.mocked(prisma.organizacao.findUnique);

beforeEach(() => {
  vi.clearAllMocks();
});

// ── DEFAULT_ORG_ID ────────────────────────────────────────────────────────────

describe("DEFAULT_ORG_ID", () => {
  it("defaults to 'org_default' when env var not set", () => {
    // In test env, DEFAULT_ORG_ID env var is not set
    expect(DEFAULT_ORG_ID).toBe("org_default");
  });
});

// ── assertTenant ──────────────────────────────────────────────────────────────

describe("assertTenant", () => {
  it("passes when resource belongs to current tenant", () => {
    expect(() => assertTenant("org_abc", "org_abc")).not.toThrow();
  });

  it("passes when resourceOrgId is null (global resource)", () => {
    expect(() => assertTenant(null, "org_abc")).not.toThrow();
  });

  it("throws when resource belongs to different tenant", () => {
    expect(() => assertTenant("org_other", "org_mine")).toThrow(
      "Acesso negado"
    );
  });
});

// ── getOrganizacaoId ──────────────────────────────────────────────────────────

describe("getOrganizacaoId", () => {
  it("returns organizacaoId from session", async () => {
    mockAuth.mockResolvedValue({
      user: { organizacaoId: "org_123" },
    } as never);
    const id = await getOrganizacaoId();
    expect(id).toBe("org_123");
  });

  it("throws when session has no organizacaoId", async () => {
    mockAuth.mockResolvedValue({ user: {} } as never);
    await expect(getOrganizacaoId()).rejects.toThrow("Sessão sem organização");
  });

  it("throws when session is null", async () => {
    mockAuth.mockResolvedValue(null as never);
    await expect(getOrganizacaoId()).rejects.toThrow("Não autenticado");
  });
});

// ── getOrganizacaoIdOptional ──────────────────────────────────────────────────

describe("getOrganizacaoIdOptional", () => {
  it("returns the org id when authenticated", async () => {
    mockAuth.mockResolvedValue({
      user: { organizacaoId: "org_456" },
    } as never);
    const id = await getOrganizacaoIdOptional();
    expect(id).toBe("org_456");
  });

  it("returns null when not authenticated (no throw)", async () => {
    mockAuth.mockResolvedValue(null as never);
    const id = await getOrganizacaoIdOptional();
    expect(id).toBeNull();
  });
});

// ── getOrganizacao ────────────────────────────────────────────────────────────

describe("getOrganizacao", () => {
  it("returns org when found", async () => {
    const fakeOrg = { id: "org_1", nome: "Test Org" };
    mockFindUnique.mockResolvedValue(fakeOrg as never);
    const org = await getOrganizacao("org_1");
    expect(org).toEqual(fakeOrg);
  });

  it("throws when org not found", async () => {
    mockFindUnique.mockResolvedValue(null as never);
    await expect(getOrganizacao("missing")).rejects.toThrow(
      "Organização não encontrada"
    );
  });
});
