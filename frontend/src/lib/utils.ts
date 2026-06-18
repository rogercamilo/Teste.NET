import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Remove todos os não-dígitos — use antes de salvar no banco. */
export function stripPhone(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * Formata dígitos brutos para exibição: (xx) xxxxx-xxxx.
 * Aceita tanto dígitos puros quanto strings já formatadas.
 */
export function formatPhone(s: string): string {
  const d = s.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return s;
}

/**
 * Aplica máscara progressiva enquanto o usuário digita.
 * Use no onChange de inputs de telefone.
 */
export function applyPhoneMask(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function formatDataBr(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

/**
 * Converte o campo foto/imagemUrl do banco no src correto para <img>.
 * - base64 legado (começa com "data:"): retorna direto
 * - key R2/local: retorna /api/imagens/serve?key=<key>
 * - null/undefined: retorna undefined
 */
export function resolveImageSrc(keyOrBase64: string | undefined | null): string | undefined {
  if (!keyOrBase64) return undefined;
  if (keyOrBase64.startsWith("data:")) return keyOrBase64;
  return `/api/imagens/serve?key=${encodeURIComponent(keyOrBase64)}`;
}
