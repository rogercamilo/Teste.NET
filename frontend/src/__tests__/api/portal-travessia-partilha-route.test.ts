/**
 * Rota do portal para registrar/remover a partilha textual de um capítulo na
 * Trilha da Travessia (Fatia 3). Mesma régua de autorização por PERTENÇA da rota
 * de leitura irmã: o capítulo precisa ser de um livro ativo da turma do formando
 * (guard anti-IDOR → 404). Mocka o Prisma.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    formando: { findFirst: vi.fn() },
    capituloLeitura: { findFirst: vi.fn() },
    acaoLeitura: { upsert: vi.fn(), deleteMany: vi.fn() },
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

import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit-log";
import { POST, DELETE } from "@/app/api/portal/travessia/capitulos/[capituloId]/partilha/route";

const ORG = "org_default";
const FORMANDO = "fmd_1";
const TURMA = "grp_voc_1";
const CAP = "cap_1";

function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://test/api/portal/travessia/capitulos/x/partilha", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }) as never;
}
const ctx = (id: string) => ({ params: Promise.resolve({ capituloId: id }) });
const authedHeaders = { "x-formando-id": FORMANDO, "x-formando-org": ORG };
const authed = (body: unknown) => req(body, authedHeaders);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST partilha", () => {
  it("401 sem headers de sessão do portal", async () => {
    const res = await POST(req({ texto: "oi" }), ctx(CAP));
    expect(res.status).toBe(401);
    expect(prisma.formando.findFirst).not.toHaveBeenCalled();
  });

  it("400 quando o texto é vazio", async () => {
    const res = await POST(authed({ texto: "   " }), ctx(CAP));
    expect(res.status).toBe(400);
    expect(prisma.acaoLeitura.upsert).not.toHaveBeenCalled();
  });

  it("404 quando o capítulo é de outra turma/org (guard IDOR)", async () => {
    vi.mocked(prisma.formando.findFirst).mockResolvedValue({ grupoFormacaoId: TURMA } as never);
    vi.mocked(prisma.capituloLeitura.findFirst).mockResolvedValue(null as never);
    const res = await POST(authed({ texto: "reflexão" }), ctx(CAP));
    expect(res.status).toBe(404);
    expect(prisma.acaoLeitura.upsert).not.toHaveBeenCalled();
  });

  it("200 grava partilha (frutos=3, tipo=partilha) e audita", async () => {
    vi.mocked(prisma.formando.findFirst).mockResolvedValue({ grupoFormacaoId: TURMA } as never);
    vi.mocked(prisma.capituloLeitura.findFirst).mockResolvedValue({ id: CAP, leituraId: "liv_1" } as never);
    vi.mocked(prisma.acaoLeitura.upsert).mockResolvedValue({ texto: "reflexão" } as never);

    const res = await POST(authed({ texto: "reflexão" }), ctx(CAP));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, texto: "reflexão" });
    const arg = vi.mocked(prisma.acaoLeitura.upsert).mock.calls[0][0];
    expect(arg.where).toEqual({
      formandoId_capituloId_tipo: { formandoId: FORMANDO, capituloId: CAP, tipo: "partilha" },
    });
    expect(arg.create).toMatchObject({ tipo: "partilha", frutos: 3, texto: "reflexão", capituloId: CAP });
    // Editar preserva reação — só o texto muda.
    expect(arg.update).toEqual({ texto: "reflexão" });
    expect(logAction).toHaveBeenCalledWith(
      "travessia_partilha_registrada",
      undefined,
      "10.0.0.1",
      expect.objectContaining({ formandoId: FORMANDO, capituloId: CAP }),
      ORG
    );
  });
});

describe("DELETE partilha", () => {
  it("200 remove só a linha de partilha do capítulo", async () => {
    vi.mocked(prisma.formando.findFirst).mockResolvedValue({ grupoFormacaoId: TURMA } as never);
    vi.mocked(prisma.capituloLeitura.findFirst).mockResolvedValue({ id: CAP, leituraId: "liv_1" } as never);
    vi.mocked(prisma.acaoLeitura.deleteMany).mockResolvedValue({ count: 1 } as never);

    const res = await DELETE(req({}, authedHeaders), ctx(CAP));

    expect(res.status).toBe(200);
    expect(prisma.acaoLeitura.deleteMany).toHaveBeenCalledWith({
      where: { formandoId: FORMANDO, capituloId: CAP, tipo: "partilha" },
    });
  });
});
