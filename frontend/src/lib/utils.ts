import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInYears, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Idade em anos a partir de uma data YYYY-MM-DD, ou `null` quando não informada.
 * Centraliza o cálculo usado nos cards/detalhe do formando — `dataNascimento` é
 * opcional desde o cadastro mínimo (o formando completa no portal).
 */
export function idadeEmAnos(dataNascimento?: string | null): number | null {
  if (!dataNascimento) return null;
  return differenceInYears(new Date(), parseISO(dataNascimento));
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

/** Só a data (sem hora) no fuso da comunidade — para eventos de "Dia inteiro". */
export function formatDiaBr(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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
