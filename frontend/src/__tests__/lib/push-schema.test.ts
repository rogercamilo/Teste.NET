import { describe, it, expect } from "vitest";
import { PushSendSchema } from "@/lib/schemas";

const base = { titulo: "Aviso", corpo: "Mensagem" };

describe("PushSendSchema.url (anti open-redirect)", () => {
  it("aceita caminho relativo same-origin", () => {
    expect(PushSendSchema.safeParse({ ...base, url: "/agenda" }).success).toBe(true);
    expect(PushSendSchema.safeParse({ ...base, url: "/vocacional/abc123" }).success).toBe(true);
  });

  it("aceita ausência de url (campo opcional)", () => {
    expect(PushSendSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita URL absoluta externa", () => {
    expect(PushSendSchema.safeParse({ ...base, url: "https://evil.com" }).success).toBe(false);
    expect(PushSendSchema.safeParse({ ...base, url: "http://evil.com/x" }).success).toBe(false);
  });

  it("rejeita protocol-relative e backslash (normalizados para cross-origin pelo parser de URL)", () => {
    expect(PushSendSchema.safeParse({ ...base, url: "//evil.com" }).success).toBe(false);
    expect(PushSendSchema.safeParse({ ...base, url: "/\\evil.com" }).success).toBe(false);
  });
});
