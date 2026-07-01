import { describe, it, expect } from "vitest";
import { isAllowedPushEndpoint, isPrivateIp } from "@/lib/ssrf";

describe("isAllowedPushEndpoint", () => {
  it("aceita endpoints dos provedores conhecidos (https)", () => {
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x")).toBe(true);
    expect(isAllowedPushEndpoint("https://db5p.notify.windows.com/w/?token=x")).toBe(true);
    expect(isAllowedPushEndpoint("https://web.push.apple.com/xyz")).toBe(true);
  });

  it("rejeita SSRF: IP interno, localhost e metadata de cloud", () => {
    expect(isAllowedPushEndpoint("http://169.254.169.254/latest/meta-data/")).toBe(false);
    expect(isAllowedPushEndpoint("https://169.254.169.254/")).toBe(false);
    expect(isAllowedPushEndpoint("http://localhost:6379/")).toBe(false);
    expect(isAllowedPushEndpoint("https://10.0.0.5/internal")).toBe(false);
  });

  it("rejeita http (não-TLS) mesmo em host de provedor", () => {
    expect(isAllowedPushEndpoint("http://fcm.googleapis.com/fcm/send/abc")).toBe(false);
  });

  it("rejeita host que só imita o sufixo do provedor", () => {
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com.attacker.com/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://evilfcm.googleapis.com.br/x")).toBe(false);
  });

  it("rejeita entrada inválida", () => {
    expect(isAllowedPushEndpoint("não-é-url")).toBe(false);
    expect(isAllowedPushEndpoint("")).toBe(false);
  });
});

describe("isPrivateIp", () => {
  it("identifica ranges privados/reservados IPv4", () => {
    for (const ip of ["10.0.0.1", "127.0.0.1", "169.254.169.254", "172.16.0.1", "172.31.255.255", "192.168.1.1", "100.64.0.1", "0.0.0.0"]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
  });

  it("identifica IPv6 loopback/ULA/link-local", () => {
    for (const ip of ["::1", "fc00::1", "fd12::1", "fe80::1", "::ffff:127.0.0.1"]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
  });

  it("aceita IPs públicos", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "172.15.0.1", "172.32.0.1", "2606:4700:4700::1111"]) {
      expect(isPrivateIp(ip), ip).toBe(false);
    }
  });
});
