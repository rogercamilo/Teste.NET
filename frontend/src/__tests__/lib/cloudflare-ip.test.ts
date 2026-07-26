import { describe, it, expect } from "vitest";
import { isCloudflareIp } from "@/lib/cloudflare-ip";

describe("isCloudflareIp", () => {
  it("reconhece IPv4 dentro das faixas da Cloudflare", () => {
    expect(isCloudflareIp("104.16.0.1")).toBe(true); // 104.16.0.0/13 (104.16–23)
    expect(isCloudflareIp("104.25.1.1")).toBe(true); // 104.24.0.0/14 (104.24–27)
    expect(isCloudflareIp("172.64.0.1")).toBe(true); // 172.64.0.0/13
    expect(isCloudflareIp("173.245.48.10")).toBe(true); // 173.245.48.0/20
    expect(isCloudflareIp("131.0.72.1")).toBe(true); // 131.0.72.0/22
  });

  it("rejeita IPv4 fora das faixas", () => {
    expect(isCloudflareIp("9.9.9.9")).toBe(false);
    expect(isCloudflareIp("8.8.8.8")).toBe(false);
    expect(isCloudflareIp("192.168.1.1")).toBe(false);
    expect(isCloudflareIp("104.15.255.255")).toBe(false); // logo abaixo de 104.16.0.0/13
    expect(isCloudflareIp("172.63.255.255")).toBe(false); // logo abaixo de 172.64.0.0/13
  });

  it("reconhece IPv6 dentro das faixas da Cloudflare", () => {
    expect(isCloudflareIp("2606:4700::1")).toBe(true); // 2606:4700::/32
    expect(isCloudflareIp("2400:cb00:0:0:0:0:0:1")).toBe(true); // 2400:cb00::/32
    expect(isCloudflareIp("2a06:98c0::abcd")).toBe(true); // 2a06:98c0::/29
  });

  it("rejeita IPv6 fora das faixas", () => {
    expect(isCloudflareIp("2001:db8::1")).toBe(false);
    expect(isCloudflareIp("2606:4701::1")).toBe(false); // vizinho de 2606:4700::/32
  });

  it("é fail-safe (false) para entradas inválidas ou vazias", () => {
    expect(isCloudflareIp("")).toBe(false);
    expect(isCloudflareIp("not-an-ip")).toBe(false);
    expect(isCloudflareIp("999.999.999.999")).toBe(false);
    expect(isCloudflareIp("104.16.0")).toBe(false); // IPv4 incompleto
    expect(isCloudflareIp("::ffff:104.16.0.1")).toBe(false); // embedded IPv4 → fail-safe
  });

  it("tolera espaços em volta", () => {
    expect(isCloudflareIp("  104.16.0.1  ")).toBe(true);
  });
});
