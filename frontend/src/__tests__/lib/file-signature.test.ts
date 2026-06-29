import { describe, it, expect } from "vitest";
import { assinaturaConfere, sanitizeFilename } from "@/lib/file-signature";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// Cabeçalhos mínimos (12 bytes) de cada formato aceito.
const PDF = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const WEBP = Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const HEIC = Buffer.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]);
const DOCX = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0, 0, 0, 0, 0]); // ZIP
const DOC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]); // OLE2

describe("assinaturaConfere", () => {
  it("aceita cada formato com assinatura coerente", () => {
    expect(assinaturaConfere(PDF, "application/pdf")).toBe(true);
    expect(assinaturaConfere(JPEG, "image/jpeg")).toBe(true);
    expect(assinaturaConfere(JPEG, "image/jpg")).toBe(true); // alias não-padrão
    expect(assinaturaConfere(PNG, "image/png")).toBe(true);
    expect(assinaturaConfere(WEBP, "image/webp")).toBe(true);
    expect(assinaturaConfere(HEIC, "image/heic")).toBe(true);
    expect(assinaturaConfere(DOCX, DOCX_MIME)).toBe(true);
    expect(assinaturaConfere(DOC, "application/msword")).toBe(true);
    expect(assinaturaConfere(DOCX, "application/msword")).toBe(true); // .doc OOXML tolerado
  });

  it("rejeita MIME spoofado (assinatura não bate com o tipo declarado)", () => {
    expect(assinaturaConfere(PNG, "application/pdf")).toBe(false);
    expect(assinaturaConfere(PDF, "image/png")).toBe(false);
    expect(assinaturaConfere(WEBP, "image/heic")).toBe(false);
    expect(assinaturaConfere(PDF, DOCX_MIME)).toBe(false);
    expect(assinaturaConfere(PNG, "application/msword")).toBe(false);
  });

  it("rejeita HEIC com brand desconhecida", () => {
    const fake = Buffer.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x78, 0x78, 0x78, 0x78]);
    expect(assinaturaConfere(fake, "image/heic")).toBe(false);
  });

  it("rejeita MIME não suportado e buffers curtos demais", () => {
    expect(assinaturaConfere(PDF, "application/zip")).toBe(false);
    expect(assinaturaConfere(Buffer.from([0x25, 0x50]), "application/pdf")).toBe(false);
    expect(assinaturaConfere(Buffer.from([]), "application/pdf")).toBe(false); // vazio
  });
});

describe("sanitizeFilename", () => {
  it("mantém um nome simples", () => {
    expect(sanitizeFilename("relatorio.pdf")).toBe("relatorio.pdf");
  });
  it("descarta componentes de diretório (path traversal)", () => {
    expect(sanitizeFilename("../../../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("..\\..\\windows\\system32\\x.dll")).toBe("x.dll");
  });
  it("apara espaços", () => {
    expect(sanitizeFilename("  nome.docx  ")).toBe("nome.docx");
  });
});
