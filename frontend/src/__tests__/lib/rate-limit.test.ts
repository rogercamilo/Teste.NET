import { vi, describe, it, expect, afterEach } from "vitest";
import { rateLimit, limiters } from "@/lib/rate-limit";

// Upstash env vars are not set in tests — always uses in-memory path.

let _keySeq = 0;
const k = (prefix = "test") => `${prefix}_${++_keySeq}`;

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit (in-memory path)", () => {
  it("allows first request", async () => {
    const result = await rateLimit(k(), 3, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.resetInMs).toBe(60_000);
  });

  it("decrements remaining on consecutive requests", async () => {
    const key = k();
    await rateLimit(key, 5, 60_000);
    await rateLimit(key, 5, 60_000);
    const result = await rateLimit(key, 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("allows last request at exact limit", async () => {
    const key = k();
    await rateLimit(key, 3, 60_000);
    await rateLimit(key, 3, 60_000);
    const last = await rateLimit(key, 3, 60_000);
    expect(last.allowed).toBe(true);
    expect(last.remaining).toBe(0);
  });

  it("blocks when limit is exceeded", async () => {
    const key = k();
    await rateLimit(key, 2, 60_000);
    await rateLimit(key, 2, 60_000);
    const blocked = await rateLimit(key, 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("returns resetInMs > 0 while blocked", async () => {
    const key = k();
    await rateLimit(key, 1, 60_000);
    const blocked = await rateLimit(key, 1, 60_000);
    expect(blocked.resetInMs).toBeGreaterThan(0);
    expect(blocked.resetInMs).toBeLessThanOrEqual(60_000);
  });

  it("resets counter after window expires", async () => {
    vi.useFakeTimers();
    const key = k();
    const windowMs = 1_000;

    await rateLimit(key, 1, windowMs);
    const blocked = await rateLimit(key, 1, windowMs);
    expect(blocked.allowed).toBe(false);

    vi.advanceTimersByTime(windowMs + 1);

    const reset = await rateLimit(key, 1, windowMs);
    expect(reset.allowed).toBe(true);
    expect(reset.remaining).toBe(0);
  });

  it("treats different keys independently", async () => {
    const key1 = k("a");
    const key2 = k("b");
    await rateLimit(key1, 1, 60_000);
    await rateLimit(key1, 1, 60_000);
    const result = await rateLimit(key2, 1, 60_000);
    expect(result.allowed).toBe(true);
  });

  it("triggers periodic cleanup after CLEANUP_INTERVAL (5 min)", async () => {
    vi.useFakeTimers({ now: Date.now() });
    const key = k("pre-cleanup");
    const shortWindow = 500;

    // Create an entry that will expire
    await rateLimit(key, 5, shortWindow);

    // Jump past both the entry window AND the cleanup interval
    vi.advanceTimersByTime(5 * 60 * 1000 + shortWindow + 100);

    // Next call triggers cleanup and starts a fresh window
    const key2 = k("post-cleanup");
    const result = await rateLimit(key2, 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("resetInMs decreases within the window", async () => {
    vi.useFakeTimers();
    const key = k();
    const windowMs = 10_000;

    await rateLimit(key, 5, windowMs);
    vi.advanceTimersByTime(3_000);
    const later = await rateLimit(key, 5, windowMs);
    expect(later.resetInMs).toBeLessThan(windowMs);
    expect(later.resetInMs).toBeGreaterThan(0);
  });
});

describe("limiters", () => {
  it("login blocks after 50 attempts", async () => {
    const ip = k("login-ip");
    // Limite por IP deliberadamente alto: usuários legítimos partilham IP (Wi-Fi comunitário,
    // CGNAT). A proteção por conta vem de loginPerEmail + bloqueio de conta.
    for (let i = 0; i < 50; i++) await limiters.login(ip);
    const result = await limiters.login(ip);
    expect(result.allowed).toBe(false);
  });

  it("register blocks after 3 attempts", async () => {
    const ip = k("reg-ip");
    for (let i = 0; i < 3; i++) await limiters.register(ip);
    const result = await limiters.register(ip);
    expect(result.allowed).toBe(false);
  });

  it("upload blocks after 20 attempts", async () => {
    const uid = k("upload-user");
    for (let i = 0; i < 20; i++) await limiters.upload(uid);
    const result = await limiters.upload(uid);
    expect(result.allowed).toBe(false);
  });

  it("email blocks after 5 attempts", async () => {
    const uid = k("email-user");
    for (let i = 0; i < 5; i++) await limiters.email(uid);
    const result = await limiters.email(uid);
    expect(result.allowed).toBe(false);
  });

  it("smtpTest blocks after 3 attempts", async () => {
    const uid = k("smtp-user");
    for (let i = 0; i < 3; i++) await limiters.smtpTest(uid);
    const result = await limiters.smtpTest(uid);
    expect(result.allowed).toBe(false);
  });

  it("mutation blocks after 60 attempts", async () => {
    const uid = k("mutation-user");
    for (let i = 0; i < 60; i++) await limiters.mutation(uid);
    const result = await limiters.mutation(uid);
    expect(result.allowed).toBe(false);
  });

  it("export blocks after 5 attempts", async () => {
    const uid = k("export-user");
    for (let i = 0; i < 5; i++) await limiters.export(uid);
    const result = await limiters.export(uid);
    expect(result.allowed).toBe(false);
  });

  it("conviteAccept blocks after 10 attempts", async () => {
    const ip = k("convite-ip");
    for (let i = 0; i < 10; i++) await limiters.conviteAccept(ip);
    const result = await limiters.conviteAccept(ip);
    expect(result.allowed).toBe(false);
  });

  it("passwordChange blocks after 3 attempts", async () => {
    const uid = k("pwd-user");
    for (let i = 0; i < 3; i++) await limiters.passwordChange(uid);
    const result = await limiters.passwordChange(uid);
    expect(result.allowed).toBe(false);
  });
});
