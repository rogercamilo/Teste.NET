/**
 * Testes da rota de carta de etapa do formando (backlog P1.1).
 *
 * Reaproveita o modelo Arquivo (sem migração): a etapa é codificada no
 * `tipoEvento` como `carta_etapa:{nivel}`. Cobre authz, validação e o caminho
 * feliz, mockando apenas I/O.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    formando: { findFirst: vi.fn() },
    arquivo: { create: vi.fn() },
  },
}));
vi.mock("@/lib/audit-log", () => ({
  logAction: vi.fn(),
  logError: vi.fn(),
  getClientIp: vi.fn(() => "10.0.0.1"),
}));
vi.mock("@/lib/rate-limit", () => ({
  limiters: { upload: vi.fn(async () => ({ allowed: true })) },
}));
vi.mock("@/lib/storage", () => ({ uploadFile: vi.fn(async () => "cartas-etapa/key.pdf") }));
vi.mock("@/lib/plan-limits", () => ({
  canUpload: vi.fn(async () => ({ allowed: true })),
  notifyAvancadoLimitIfNeeded: vi.fn(),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit-log";
import { POST } from "@/app/api/formandos/[id]/cartas/route";

const mockAuth = vi.mocked(auth);
const ORG = "org_a";

function session(role: string, opts: { id?: string; org?: string; grupo?: string | null } = {}) {
  return {
    user: { id: opts.id ?? "u1", role, organizacaoId: opts.org ?? ORG, grupoFormacaoId: opts.grupo ?? null },
  } as never;
}

// Cabeçalho PDF válido (12+ bytes, "%PDF-1.4…") — passa na validação de magic-bytes.
const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3]);

function multipartReq(fields: { nivel?: string; withFile?: boolean }) {
  const fd = new FormData();
  if (fields.nivel !== undefined) fd.append("nivelFormativo", fields.nivel);
  if (fields.withFile) fd.append("arquivo", new File([PDF_BYTES], "carta.pdf", { type: "application/pdf" }));
  return new Request("http://test/api", { method: "POST", body: fd });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => vi.clearAllMocks());

describe("POST /api/formandos/[id]/cartas", () => {
  it("401 sem sessão", async () => {
    mockAuth.mockResolvedValue(null as never);
    const res = await POST(multipartReq({ nivel: "vocacional", withFile: true }), ctx("f1"));
    expect(res.status).toBe(401);
  });

  it("404 quando o formando não está na org (escopo de tenant)", async () => {
    mockAuth.mockResolvedValue(session("administrador"));
    vi.mocked(prisma.formando.findFirst).mockResolvedValue(null as never);
    const res = await POST(multipartReq({ nivel: "vocacional", withFile: true }), ctx("f_alheio"));
    expect(res.status).toBe(404);
    const where = vi.mocked(prisma.formando.findFirst).mock.calls[0][0] as { where: { organizacaoId: string } };
    expect(where.where.organizacaoId).toBe(ORG);
  });

  it("400 quando a etapa é inválida", async () => {
    mockAuth.mockResolvedValue(session("administrador"));
    vi.mocked(prisma.formando.findFirst).mockResolvedValue({ id: "f1", nome: "Fulano" } as never);
    const res = await POST(multipartReq({ nivel: "nivel_inexistente", withFile: true }), ctx("f1"));
    expect(res.status).toBe(400);
  });

  it("400 quando o arquivo está ausente", async () => {
    mockAuth.mockResolvedValue(session("administrador"));
    vi.mocked(prisma.formando.findFirst).mockResolvedValue({ id: "f1", nome: "Fulano" } as never);
    const res = await POST(multipartReq({ nivel: "vocacional", withFile: false }), ctx("f1"));
    expect(res.status).toBe(400);
  });

  it("400 quando o conteúdo não corresponde ao MIME declarado (anti-spoof P2.1)", async () => {
    mockAuth.mockResolvedValue(session("administrador"));
    vi.mocked(prisma.formando.findFirst).mockResolvedValue({ id: "f1", nome: "Fulano" } as never);
    const fd = new FormData();
    fd.append("nivelFormativo", "vocacional");
    // Declara PDF mas envia bytes que não são PDF.
    fd.append("arquivo", new File([new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])], "fake.pdf", { type: "application/pdf" }));
    const res = await POST(new Request("http://test/api", { method: "POST", body: fd }), ctx("f1"));
    expect(res.status).toBe(400);
  });

  it("201 registra a carta com tipoEvento codificado e audita", async () => {
    mockAuth.mockResolvedValue(session("administrador", { id: "adm" }));
    vi.mocked(prisma.formando.findFirst).mockResolvedValue({ id: "f1", nome: "Fulano" } as never);
    vi.mocked(prisma.arquivo.create).mockResolvedValue({ id: "arq1" } as never);

    const res = await POST(multipartReq({ nivel: "discipulado", withFile: true }), ctx("f1"));
    expect(res.status).toBe(201);

    const createArg = vi.mocked(prisma.arquivo.create).mock.calls[0][0] as {
      data: { tipoEvento: string; formandoId: string; organizacaoId: string };
    };
    expect(createArg.data.tipoEvento).toBe("carta_etapa:discipulado");
    expect(createArg.data.formandoId).toBe("f1");
    expect(createArg.data.organizacaoId).toBe(ORG);

    expect(logAction).toHaveBeenCalledWith(
      "carta_etapa_registrada",
      "adm",
      expect.any(String),
      { formandoId: "f1", nivel: "discipulado", arquivoId: "arq1" },
      ORG,
    );
  });
});
