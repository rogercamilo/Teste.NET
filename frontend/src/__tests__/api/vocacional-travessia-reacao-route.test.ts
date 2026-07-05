/**
 * Rota do formador para reagir a uma partilha (curtida + nota) na Trilha da
 * Travessia (Fatia 3). Gate = `requireTurmaLeituraAccess` (mockado). Anti-IDOR:
 * a partilha precisa ser tipo=partilha e pertencer a um livro DESTA turma/org —
 * `acaoId` de outra turma não resolve → 404. Mocka o Prisma.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

const ORG = "org_default";
const TURMA = "grp_voc_1";
const USER = "usr_formador";
const ACAO = "acao_1";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    acaoLeitura: { findFirst: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("@/lib/rate-limit", () => ({
  limiters: { mutation: vi.fn(async () => ({ allowed: true })) },
}));
vi.mock("@/lib/audit-log", () => ({
  logAction: vi.fn(),
  logError: vi.fn(),
  getClientIp: vi.fn(() => "10.0.0.1"),
}));
vi.mock("@/app/api/vocacional/turmas/[id]/leituras/access", () => ({
  requireTurmaLeituraAccess: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit-log";
import { requireTurmaLeituraAccess } from "@/app/api/vocacional/turmas/[id]/leituras/access";
import { PATCH } from "@/app/api/vocacional/turmas/[id]/travessia/partilhas/[acaoId]/reacao/route";

function req(body: unknown) {
  return new Request("http://test/reacao", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}
const ctx = { params: Promise.resolve({ id: TURMA, acaoId: ACAO }) };

function allowAccess() {
  vi.mocked(requireTurmaLeituraAccess).mockResolvedValue({
    access: { user: { id: USER, role: "administrador" }, organizacaoId: ORG, turmaId: TURMA },
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PATCH reação à partilha", () => {
  it("propaga o erro do guard (ex.: 403)", async () => {
    vi.mocked(requireTurmaLeituraAccess).mockResolvedValue({
      error: new Response("no", { status: 403 }),
    } as never);
    const res = await PATCH(req({ curtiu: true }), ctx);
    expect(res.status).toBe(403);
    expect(prisma.acaoLeitura.findFirst).not.toHaveBeenCalled();
  });

  it("400 quando o corpo não traz curtida nem nota", async () => {
    allowAccess();
    const res = await PATCH(req({}), ctx);
    expect(res.status).toBe(400);
    expect(prisma.acaoLeitura.update).not.toHaveBeenCalled();
  });

  it("404 quando a partilha é de outra turma/org (guard IDOR)", async () => {
    allowAccess();
    vi.mocked(prisma.acaoLeitura.findFirst).mockResolvedValue(null as never);
    const res = await PATCH(req({ curtiu: true }), ctx);
    expect(res.status).toBe(404);
    expect(prisma.acaoLeitura.update).not.toHaveBeenCalled();
    // O gate consulta escopado por turma + tipo=partilha.
    const where = vi.mocked(prisma.acaoLeitura.findFirst).mock.calls[0][0].where;
    expect(where).toMatchObject({ id: ACAO, organizacaoId: ORG, tipo: "partilha" });
  });

  it("200 registra curtida + nota e audita", async () => {
    allowAccess();
    vi.mocked(prisma.acaoLeitura.findFirst).mockResolvedValue({ id: ACAO } as never);
    vi.mocked(prisma.acaoLeitura.update).mockResolvedValue({ formadorCurtiu: true, formadorNota: "Muito bom!" } as never);

    const res = await PATCH(req({ curtiu: true, nota: "Muito bom!" }), ctx);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, formadorCurtiu: true, formadorNota: "Muito bom!" });
    const arg = vi.mocked(prisma.acaoLeitura.update).mock.calls[0][0];
    expect(arg.data).toMatchObject({ formadorCurtiu: true, formadorNota: "Muito bom!", formadorReagiuId: USER });
    expect(logAction).toHaveBeenCalledWith(
      "travessia_partilha_reacao",
      USER,
      "10.0.0.1",
      expect.objectContaining({ turmaId: TURMA, acaoId: ACAO }),
      ORG
    );
  });

  it("nota em branco vira null (limpa a nota)", async () => {
    allowAccess();
    vi.mocked(prisma.acaoLeitura.findFirst).mockResolvedValue({ id: ACAO } as never);
    vi.mocked(prisma.acaoLeitura.update).mockResolvedValue({ formadorCurtiu: false, formadorNota: null } as never);

    const res = await PATCH(req({ nota: "   " }), ctx);

    expect(res.status).toBe(200);
    const arg = vi.mocked(prisma.acaoLeitura.update).mock.calls[0][0];
    expect(arg.data.formadorNota).toBeNull();
    // Sem `curtiu` no corpo, a curtida não é tocada.
    expect(arg.data).not.toHaveProperty("formadorCurtiu");
  });
});
