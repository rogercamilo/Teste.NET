import "server-only";
import net from "node:net";
import { lookup } from "node:dns/promises";

/**
 * Defesas contra SSRF (Server-Side Request Forgery) para os pontos onde o servidor
 * faz uma requisição de saída para um destino influenciado pelo usuário:
 *  - Web Push: `endpoint` vem do cliente no subscribe → allowlist de provedores.
 *  - SMTP: `host` é configurado pelo tenant → bloqueia IPs/hosts internos.
 */

// ── Web Push: só endpoints dos provedores conhecidos ────────────────────────
// Cobre praticamente todos os navegadores: Chrome/Edge/Android (FCM), Firefox
// (Mozilla autopush), Edge legado (WNS), Safari/iOS (Apple).
const PUSH_HOST_SUFFIXES = [
  "fcm.googleapis.com",
  "push.services.mozilla.com",
  "notify.windows.com",
  "push.apple.com",
];

export function isAllowedPushEndpoint(endpoint: string): boolean {
  let u: URL;
  try {
    u = new URL(endpoint);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  return PUSH_HOST_SUFFIXES.some((s) => host === s || host.endsWith("." + s));
}

// ── Detecção de IP privado/reservado (metadata de cloud, loopback, LAN) ──────
export function isPrivateIp(ip: string): boolean {
  const fam = net.isIP(ip);
  if (fam === 4) {
    const p = ip.split(".").map(Number);
    if (p[0] === 0 || p[0] === 10 || p[0] === 127) return true;
    if (p[0] === 169 && p[1] === 254) return true; // link-local + metadata (169.254.169.254)
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT
    return false;
  }
  if (fam === 6) {
    const l = ip.toLowerCase();
    if (l === "::1" || l === "::") return true;
    if (l.startsWith("::ffff:")) return isPrivateIp(l.slice(7)); // IPv4-mapeado
    if (l.startsWith("fe80")) return true; // link-local
    if (l.startsWith("fc") || l.startsWith("fd")) return true; // ULA fc00::/7
    return false;
  }
  return false;
}

function isInternalHostname(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, "");
  return (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h === "metadata.google.internal"
  );
}

/**
 * Lança se `host` (de config de SMTP do tenant) apontar para um destino interno.
 * Resolve o hostname e rejeita se QUALQUER endereço for privado/reservado — evita
 * que um host público aponte para IP interno. Use antes de conectar.
 */
export async function assertPublicHost(host: string): Promise<void> {
  const h = (host ?? "").trim();
  if (!h || isInternalHostname(h)) throw new Error("Host de destino não permitido");

  if (net.isIP(h)) {
    if (isPrivateIp(h)) throw new Error("Host de destino não permitido (IP interno)");
    return;
  }

  let addrs: { address: string }[];
  try {
    addrs = await lookup(h, { all: true });
  } catch {
    throw new Error("Host de destino não resolve");
  }
  if (addrs.length === 0) throw new Error("Host de destino não resolve");
  for (const a of addrs) {
    if (isPrivateIp(a.address)) throw new Error("Host de destino resolve para IP interno");
  }
}
