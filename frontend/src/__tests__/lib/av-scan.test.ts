import { describe, it, expect } from "vitest";
import { heuristicScan, scanUpload } from "@/lib/av-scan";

const PDF_MIME = "application/pdf";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const DOC_MIME = "application/msword";

// EICAR montada em runtime (não como literal contíguo) para o arquivo de teste
// não ser sinalizado por scanners de verdade.
const EICAR = ["X5O!P%@AP[4\\PZX54(P^)7CC)7}", "$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"].join("");

function pdf(body: string): Buffer {
  return Buffer.concat([Buffer.from("%PDF-1.4\n", "latin1"), Buffer.from(body, "latin1")]);
}
function zipWith(name: string): Buffer {
  // "PK\x03\x04" + nome da parte em texto claro, como num cabeçalho local de ZIP.
  return Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]), Buffer.from(name, "latin1")]);
}

describe("heuristicScan — rejeições", () => {
  it("rejeita EICAR em qualquer tipo", () => {
    const r = heuristicScan(Buffer.from(EICAR, "latin1"), PDF_MIME);
    expect(r.clean).toBe(false);
    if (!r.clean) expect(r.reason).toMatch(/EICAR/);
  });

  it("rejeita DOCX com macro VBA (vbaProject.bin)", () => {
    const r = heuristicScan(zipWith("word/vbaProject.bin"), DOCX_MIME);
    expect(r.clean).toBe(false);
    if (!r.clean) expect(r.reason).toMatch(/macro/i);
  });

  it("rejeita DOC legado com stream _VBA_PROJECT", () => {
    const buf = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.from("_VBA_PROJECT", "latin1")]);
    const r = heuristicScan(buf, DOC_MIME);
    expect(r.clean).toBe(false);
  });

  it.each(["/JavaScript", "/JS", "/Launch"])("rejeita PDF com conteúdo ativo (%s)", (token) => {
    const r = heuristicScan(pdf(`1 0 obj <<${token} (x)>>`), PDF_MIME);
    expect(r.clean).toBe(false);
    if (!r.clean) expect(r.reason).toContain(token);
  });
});

describe("heuristicScan — aprovações", () => {
  it("aceita PDF de documento sem conteúdo ativo", () => {
    expect(heuristicScan(pdf("1 0 obj << /Type /Catalog >>"), PDF_MIME).clean).toBe(true);
  });

  it("aceita DOCX (zip) sem macro", () => {
    expect(heuristicScan(zipWith("word/document.xml"), DOCX_MIME).clean).toBe(true);
  });

  it("aceita imagem sem EICAR", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    expect(heuristicScan(jpeg, "image/jpeg").clean).toBe(true);
  });

  it("não confunde macro de Office com conteúdo em PDF (mime-scoped)", () => {
    // vbaProject.bin dentro de bytes de um PDF não dispara a regra de Office.
    expect(heuristicScan(pdf("vbaProject.bin como texto qualquer"), PDF_MIME).clean).toBe(true);
  });
});

describe("scanUpload — wrapper assíncrono", () => {
  it("delega à heurística (limpo)", async () => {
    expect((await scanUpload(pdf("ok"), PDF_MIME)).clean).toBe(true);
  });
  it("delega à heurística (malicioso)", async () => {
    expect((await scanUpload(zipWith("vbaProject.bin"), DOCX_MIME)).clean).toBe(false);
  });
});
