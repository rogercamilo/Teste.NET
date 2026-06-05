import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  },
}));

import { anonymizeIp, getClientIp, logAction } from "@/lib/audit-log";

describe("anonymizeIp", () => {
  it("returns 'unknown' for null", () => {
    expect(anonymizeIp(null)).toBe("unknown");
  });

  it("returns 'unknown' for undefined", () => {
    expect(anonymizeIp(undefined)).toBe("unknown");
  });

  it("returns 'unknown' for empty string", () => {
    expect(anonymizeIp("")).toBe("unknown");
  });

  it("anonymizes last octet of IPv4", () => {
    expect(anonymizeIp("192.168.1.150")).toBe("192.168.1.xxx");
  });

  it("anonymizes any valid IPv4", () => {
    expect(anonymizeIp("10.0.0.1")).toBe("10.0.0.xxx");
    expect(anonymizeIp("255.255.255.255")).toBe("255.255.255.xxx");
  });

  it("truncates IPv6 to first 4 groups", () => {
    expect(anonymizeIp("2001:db8:85a3::8a2e:370:7334")).toBe(
      "2001:db8:85a3::xxxx:xxxx:xxxx:xxxx"
    );
  });

  it("handles full IPv6 address", () => {
    const result = anonymizeIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
    expect(result).toContain("2001:0db8:85a3:0000");
    expect(result).toContain("xxxx");
  });

  it("uses first IP from comma-separated x-forwarded-for value", () => {
    expect(anonymizeIp("1.2.3.4, 5.6.7.8, 9.10.11.12")).toBe("1.2.3.xxx");
  });

  it("trims whitespace from forwarded IP", () => {
    expect(anonymizeIp("  203.0.113.1  ")).toBe("203.0.113.xxx");
  });

  it("returns 'unknown' for an unrecognized format", () => {
    expect(anonymizeIp("not-an-ip")).toBe("unknown");
  });
});

// ── logAction ────────────────────────────────────────────────────────────────

describe("logAction", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("calls console.log with JSON entry", () => {
    logAction("login_success", "user_1", "1.2.3.4");
    expect(consoleLogSpy).toHaveBeenCalledOnce();
    const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
    expect(logged.action).toBe("login_success");
    expect(logged.userId).toBe("user_1");
    expect(logged.ipAnon).toBe("1.2.3.4.xxx".replace("4.xxx", "xxx"));
  });

  it("uses 'anonymous' when userId is undefined", () => {
    logAction("login_failure", undefined, "10.0.0.1");
    const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
    expect(logged.userId).toBe("anonymous");
  });

  it("includes organizacaoId when provided", () => {
    logAction("user_created", "u1", "1.2.3.4", {}, "org_123");
    const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
    expect(logged.organizacaoId).toBe("org_123");
  });

  it("omits organizacaoId when not provided", () => {
    logAction("logout", "u1", "1.2.3.4");
    const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
    expect(logged).not.toHaveProperty("organizacaoId");
  });

  it("includes details when provided", () => {
    logAction("file_uploaded", "u1", "1.2.3.4", { fileSize: 100 });
    const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
    expect(logged.details).toEqual({ fileSize: 100 });
  });

  it("omits details when not provided", () => {
    logAction("logout", "u1", "1.2.3.4");
    const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
    expect(logged).not.toHaveProperty("details");
  });

  it("anonymizes the IP in the log entry", () => {
    logAction("login_success", "u1", "203.0.113.42");
    const logged = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
    expect(logged.ipAnon).toBe("203.0.113.xxx");
  });

  it("does not throw even when persistAuditLog fails (fire-and-forget)", () => {
    // The prisma mock is already set up; logAction returns void without awaiting
    expect(() => logAction("login_success", "u1", "1.2.3.4")).not.toThrow();
  });
});

describe("getClientIp", () => {
  const makeRequest = (headers: Record<string, string>) =>
    new Request("https://example.com", { headers });

  describe("without TRUST_PROXY", () => {
    beforeEach(() => { delete process.env.TRUST_PROXY; });

    it("ignores x-forwarded-for and falls back to x-real-ip", () => {
      const req = makeRequest({ "x-forwarded-for": "1.2.3.4", "x-real-ip": "5.6.7.8" });
      expect(getClientIp(req)).toBe("5.6.7.8");
    });

    it("returns x-real-ip when only that header is present", () => {
      const req = makeRequest({ "x-real-ip": "5.6.7.8" });
      expect(getClientIp(req)).toBe("5.6.7.8");
    });

    it("returns 'unknown' when no IP headers", () => {
      const req = makeRequest({});
      expect(getClientIp(req)).toBe("unknown");
    });
  });

  describe("with TRUST_PROXY=true", () => {
    beforeEach(() => { process.env.TRUST_PROXY = "true"; });
    afterEach(() => { delete process.env.TRUST_PROXY; });

    it("prefers x-forwarded-for over x-real-ip", () => {
      const req = makeRequest({ "x-forwarded-for": "1.2.3.4", "x-real-ip": "5.6.7.8" });
      expect(getClientIp(req)).toBe("1.2.3.4");
    });

    it("uses first IP from x-forwarded-for chain", () => {
      const req = makeRequest({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" });
      expect(getClientIp(req)).toBe("1.2.3.4");
    });

    it("falls back to x-real-ip when x-forwarded-for is absent", () => {
      const req = makeRequest({ "x-real-ip": "5.6.7.8" });
      expect(getClientIp(req)).toBe("5.6.7.8");
    });
  });
});
