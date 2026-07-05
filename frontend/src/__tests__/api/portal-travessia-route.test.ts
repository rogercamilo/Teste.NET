/**
 * Rota do portal para marcar/desmarcar capítulos lidos na Trilha da Travessia.
 *
 * A autorização é pela PERTENÇA: o capítulo precisa pertencer a um livro ativo
 * da MESMA turma vocacional em que o formando está vinculado — um `capituloId`
 * de outra turma/organização não resolve (guard anti-IDOR → 404). Mocka o Prisma.
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
import { POST, DELETE } from "@/app/api/portal/travessia/capitulos/[capituloId]/route";

const ORG = "org_default";
const FORMANDO = "fmd_1";
const TURMA = "grp_voc_1";
const CAP = "cap_1";

function req(headers: Record<string, string> = {}) {
  return new Request("http://test/api/portal/travessia/capitulos/x", { method: "POST", headers }) as never;
}
const ctx = (id: string) => ({ params: Promise.resolve({ capituloId: id }) });
const authed = () => req({ "x-formando-id": FORMANDO, "x-formando-org": ORG });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/portal/travessia/capitulos/[capituloId]", () => {
  it("401 sem headers de sessão do portal", async () => {
    const res = await POST(req(), ctx(CAP));
    expect(res.status).toBe(401);
    expect(prisma.formando.findFirst).not.toHaveBeenCalled();
  });

  it("404 quando o formando não tem turma", async () => {
    vi.mocked(prisma.formando.findFirst).mockResolvedValue({ grupoFormacaoId: null } as never);
    const res = await POST(authed(), ctx(CAP));
    expect(res.status).toBe(404);
    expect(prisma.acaoLeitura.upsert).not.toHaveBeenCalled();
  });

  it("404 quando o capítulo é de outra turma/org (guard IDOR)", async () => {
    vi.mocked(prisma.formando.findFirst).mockResolvedValue({ grupoFormacaoId: TURMA } as never);
    vi.mocked(prisma.capituloLeitura.findFirst).mockResolvedValue(null as never);
    const res = await POST(authed(), ctx(CAP));
    expect(res.status).toBe(404);
    expect(prisma.acaoLeitura.upsert).not.toHaveBeenCalled();
  });

  it("200 registra a leitura (upsert idempotente) e audita", async () => {
    vi.mocked(prisma.formando.findFirst).mockResolvedValue({ grupoFormacaoId: TURMA } as never);
    vi.mocked(prisma.capituloLeitura.findFirst).mockResolvedValue({ id: CAP, leituraId: "liv_1" } as never);
    vi.mocked(prisma.acaoLeitura.upsert).mockResolvedValue({} as never);

    const res = await POST(authed(), ctx(CAP));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, lido: true });
    const arg = vi.mocked(prisma.acaoLeitura.upsert).mock.calls[0][0];
    expect(arg.create).toMatchObject({ formandoId: FORMANDO, capituloId: CAP, leituraId: "liv_1", tipo: "leitura", frutos: 1 });
    expect(logAction).toHaveBeenCalledWith(
      "travessia_capitulo_lido",
      undefined,
      "10.0.0.1",
      expect.objectContaining({ formandoId: FORMANDO, capituloId: CAP }),
      ORG
    );
  });
});

describe("DELETE /api/portal/travessia/capitulos/[capituloId]", () => {
  it("404 quando o capítulo não pertence à turma do formando", async () => {
    vi.mocked(prisma.formando.findFirst).mockResolvedValue({ grupoFormacaoId: TURMA } as never);
    vi.mocked(prisma.capituloLeitura.findFirst).mockResolvedValue(null as never);
    const res = await DELETE(authed(), ctx(CAP));
    expect(res.status).toBe(404);
    expect(prisma.acaoLeitura.deleteMany).not.toHaveBeenCalled();
  });

  it("200 desmarca (remove só a linha daquele capítulo)", async () => {
    vi.mocked(prisma.formando.findFirst).mockResolvedValue({ grupoFormacaoId: TURMA } as never);
    vi.mocked(prisma.capituloLeitura.findFirst).mockResolvedValue({ id: CAP, leituraId: "liv_1" } as never);
    vi.mocked(prisma.acaoLeitura.deleteMany).mockResolvedValue({ count: 1 } as never);

    const res = await DELETE(authed(), ctx(CAP));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, lido: false });
    expect(prisma.acaoLeitura.deleteMany).toHaveBeenCalledWith({ where: { formandoId: FORMANDO, capituloId: CAP, tipo: "leitura" } });
  });
});
