import { describe, it, expect } from "vitest";
import { assinaturaConfere } from "@/lib/file-signature";

// Cabeçalhos mínimos (12 bytes) de cada formato aceito.
const PDF = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const WEBP = Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const HEIC = Buffer.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]);

describe("assinaturaConfere", () => {
  it("aceita cada formato com assinatura coerente", () => {
    expect(assinaturaConfere(PDF, "application/pdf")).toBe(true);
    expect(assinaturaConfere(JPEG, "image/jpeg")).toBe(true);
    expect(assinaturaConfere(PNG, "image/png")).toBe(true);
    expect(assinaturaConfere(WEBP, "image/webp")).toBe(true);
    expect(assinaturaConfere(HEIC, "image/heic")).toBe(true);
  });

  it("rejeita MIME spoofado (assinatura não bate com o tipo declarado)", () => {
    expect(assinaturaConfere(PNG, "application/pdf")).toBe(false);
    expect(assinaturaConfere(PDF, "image/png")).toBe(false);
    expect(assinaturaConfere(WEBP, "image/heic")).toBe(false);
  });

  it("rejeita HEIC com brand desconhecida", () => {
    const fake = Buffer.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x78, 0x78, 0x78, 0x78]);
    expect(assinaturaConfere(fake, "image/heic")).toBe(false);
  });

  it("rejeita MIME não suportado e buffers curtos demais", () => {
    expect(assinaturaConfere(PDF, "application/zip")).toBe(false);
    expect(assinaturaConfere(Buffer.from([0x25, 0x50]), "application/pdf")).toBe(false);
  });
});
