import { vi, describe, it, expect, beforeEach } from "vitest";

const findUnique = vi.fn();
const upsert = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailSuppression: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      upsert: (...args: unknown[]) => upsert(...args),
    },
  },
}));

vi.mock("@/lib/audit-log", () => ({
  logAction: vi.fn(),
  logError: vi.fn(),
}));

import {
  normalizeEmail,
  isEmailSuppressed,
  suppressEmail,
  maskEmail,
} from "@/lib/email-suppression";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("maskEmail", () => {
  it("preserva 2 primeiros caracteres e o domínio, mascara o resto", () => {
    expect(maskEmail("joao.silva@gmail.com")).toBe("jo********@gmail.com");
  });

  it("nunca expõe o local inteiro em endereços curtos", () => {
    expect(maskEmail("ab@x.com")).toBe("ab*@x.com");
    expect(maskEmail("a@x.com")).toBe("a*@x.com");
  });

  it("degrada com segurança para entrada malformada", () => {
    expect(maskEmail("semarroba")).toBe("***");
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });
});

describe("isEmailSuppressed", () => {
  it("returns true when a row exists", async () => {
    findUnique.mockResolvedValueOnce({ id: "x" });
    expect(await isEmailSuppressed("a@b.com")).toBe(true);
  });

  it("returns false when no row exists", async () => {
    findUnique.mockResolvedValueOnce(null);
    expect(await isEmailSuppressed("a@b.com")).toBe(false);
  });

  it("queries with the normalized email", async () => {
    findUnique.mockResolvedValueOnce(null);
    await isEmailSuppressed("  Up@CASE.com ");
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "up@case.com" } })
    );
  });

  it("fails safe (returns false) on DB error", async () => {
    findUnique.mockRejectedValueOnce(new Error("db down"));
    expect(await isEmailSuppressed("a@b.com")).toBe(false);
  });
});

describe("suppressEmail", () => {
  it("upserts with normalized email and reason", async () => {
    upsert.mockResolvedValueOnce({});
    await suppressEmail({ email: "Bounce@X.com", motivo: "BOUNCE", detalhe: "msg" });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "bounce@x.com" },
        create: expect.objectContaining({ email: "bounce@x.com", motivo: "BOUNCE", detalhe: "msg" }),
        update: expect.objectContaining({ motivo: "BOUNCE", detalhe: "msg" }),
      })
    );
  });

  it("swallows DB errors without throwing", async () => {
    upsert.mockRejectedValueOnce(new Error("db down"));
    await expect(
      suppressEmail({ email: "a@b.com", motivo: "COMPLAINT" })
    ).resolves.toBeUndefined();
  });
});
