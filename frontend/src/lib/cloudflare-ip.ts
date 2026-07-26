/**
 * Detecta se um IP pertence às faixas de EGRESS da Cloudflare.
 *
 * Uso: quando o app está atrás do proxy da Cloudflare (nuvem laranja), o peer
 * imediato que a borda do Railway (Envoy) reporta é um IP da Cloudflare, e o IP
 * real do visitante vem no header `CF-Connecting-IP`. Só confiamos nesse header
 * quando o peer é comprovadamente Cloudflare — do contrário, um atacante batendo
 * direto no origin do Railway poderia forjar `CF-Connecting-IP` e burlar o
 * rate-limit por IP. Ver `getClientIp` em `audit-log.ts`.
 *
 * Faixas oficiais: https://www.cloudflare.com/ips/ (revisar ~1×/ano; mudam raro).
 * Última sincronização: 2026-07-25.
 */

const CLOUDFLARE_CIDRS: readonly string[] = [
  // IPv4 — https://www.cloudflare.com/ips-v4/
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
  // IPv6 — https://www.cloudflare.com/ips-v6/
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
];

type ParsedIp = { value: bigint; bits: 32 | 128 };

function ipv4ToBigInt(ip: string): ParsedIp | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = BigInt(0);
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n > 255) return null;
    value = (value << BigInt(8)) | BigInt(n);
  }
  return { value, bits: 32 };
}

function ipv6ToBigInt(input: string): ParsedIp | null {
  const ip = input.split("%")[0]; // descarta zone id (ex.: fe80::1%eth0)
  // Embedded IPv4 (ex.: ::ffff:1.2.3.4) é raro para egress da Cloudflare;
  // retornar null aqui é FAIL-SAFE (isCloudflareIp → false → usa o peer como IP).
  if (ip.includes(".")) return null;

  const halves = ip.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];

  let groups: string[];
  if (halves.length === 1) {
    if (head.length !== 8) return null; // sem "::" precisa dos 8 grupos
    groups = head;
  } else {
    const missing = 8 - (head.length + tail.length);
    if (missing < 0) return null;
    groups = [...head, ...Array(missing).fill("0"), ...tail];
  }
  if (groups.length !== 8) return null;

  let value = BigInt(0);
  for (const g of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    value = (value << BigInt(16)) | BigInt(parseInt(g, 16));
  }
  return { value, bits: 128 };
}

function parseIp(ip: string): ParsedIp | null {
  return ip.includes(":") ? ipv6ToBigInt(ip) : ipv4ToBigInt(ip);
}

function cidrContains(ip: string, cidr: string): boolean {
  const slash = cidr.indexOf("/");
  if (slash === -1) return false;
  const net = parseIp(cidr.slice(0, slash));
  const prefix = Number(cidr.slice(slash + 1));
  const addr = parseIp(ip);
  if (!net || !addr) return false;
  if (net.bits !== addr.bits) return false;
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > net.bits) return false;

  const hostBits = BigInt(net.bits - prefix);
  const mask =
    prefix === 0 ? BigInt(0) : ((BigInt(1) << BigInt(prefix)) - BigInt(1)) << hostBits;
  return (addr.value & mask) === (net.value & mask);
}

/** true se `ip` está dentro de qualquer faixa de egress publicada da Cloudflare. */
export function isCloudflareIp(ip: string): boolean {
  if (!ip) return false;
  const trimmed = ip.trim();
  return CLOUDFLARE_CIDRS.some((cidr) => cidrContains(trimmed, cidr));
}
