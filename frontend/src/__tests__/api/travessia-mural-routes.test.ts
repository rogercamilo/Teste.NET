/**
 * Rotas do Mural de Frutos (Fatia 4):
 *  - Portal: o vocacionado opta por aparecer (`PATCH /api/portal/travessia/mural`)
 *    — só quando o formador ligou o Mural na turma (senão 403). Gate por pertença.
 *  - Formador: liga/desliga o Mural na turma (`PATCH /api/vocacional/turmas/[id]/mural`)
 *    — gate `requireTurmaLeituraAccess` (mockado). Mocka o Prisma.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    formando: { findFirst: vi.fn() },
    participacaoVocacional: { findFirst: vi.fn(), update: vi.fn() },
    grupoFormacao: { update: vi.fn() },
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
import { PATCH as PORTAL_PATCH } from "@/app/api/portal/travessia/mural/route";
import { PATCH as FORMADOR_PATCH } from "@/app/api/vocacional/turmas/[id]/mural/route";

const ORG = "org_default";
const FORMANDO = "fmd_1";
const TURMA = "grp_voc_1";
const USER = "usr_formador";

function portalReq(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://test/api/portal/travessia/mural", {
    method: "PATCH",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }) as never;
}
const H = { "x-formando-id": FORMANDO, "x-formando-org": ORG };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PATCH /api/portal/travessia/mural (opt-in do vocacionado)", () => {
  it("401 sem headers do portal", async () => {
    const res = await PORTAL_PATCH(portalReq({ optIn: true }));
    expect(res.status).toBe(401);
  });

  it("403 quando o Mural está desligado na turma", async () => {
    vi.mocked(prisma.formando.findFirst).mockResolvedValue({
      grupoFormacaoId: TURMA,
      grupoFormacao: { muralFrutosAtivo: false },
    } as never);
    const res = await PORTAL_PATCH(portalReq({ optIn: true }, H));
    expect(res.status).toBe(403);
    expect(prisma.participacaoVocacional.update).not.toHaveBeenCalled();
  });

  it("404 quando não há participação ativa (guard IDOR)", async () => {
    vi.mocked(prisma.formando.findFirst).mockResolvedValue({
      grupoFormacaoId: TURMA,
      grupoFormacao: { muralFrutosAtivo: true },
    } as never);
    vi.mocked(prisma.participacaoVocacional.findFirst).mockResolvedValue(null as never);
    const res = await PORTAL_PATCH(portalReq({ optIn: true }, H));
    expect(res.status).toBe(404);
  });

  it("200 grava o opt-in e audita", async () => {
    vi.mocked(prisma.formando.findFirst).mockResolvedValue({
      grupoFormacaoId: TURMA,
      grupoFormacao: { muralFrutosAtivo: true },
    } as never);
    vi.mocked(prisma.participacaoVocacional.findFirst).mockResolvedValue({ id: "part_1" } as never);
    vi.mocked(prisma.participacaoVocacional.update).mockResolvedValue({} as never);

    const res = await PORTAL_PATCH(portalReq({ optIn: true }, H));

    expect(res.status).toBe(200);
    expect(prisma.participacaoVocacional.update).toHaveBeenCalledWith({
      where: { id: "part_1" },
      data: { muralOptIn: true },
    });
    expect(logAction).toHaveBeenCalledWith(
      "travessia_mural_optin",
      undefined,
      "10.0.0.1",
      expect.objectContaining({ formandoId: FORMANDO, optIn: true }),
      ORG
    );
  });
});

describe("PATCH /api/vocacional/turmas/[id]/mural (formador liga/desliga)", () => {
  function formadorReq(body: unknown) {
    return new Request("http://test/mural", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }) as never;
  }
  const ctx = { params: Promise.resolve({ id: TURMA }) };

  function allowAccess() {
    vi.mocked(requireTurmaLeituraAccess).mockResolvedValue({
      access: { user: { id: USER, role: "administrador" }, organizacaoId: ORG, turmaId: TURMA },
    } as never);
  }

  it("propaga o erro do guard (sem permissão)", async () => {
    vi.mocked(requireTurmaLeituraAccess).mockResolvedValue({
      error: new Response("nope", { status: 403 }),
    } as never);
    const res = await FORMADOR_PATCH(formadorReq({ ativo: true }), ctx);
    expect(res.status).toBe(403);
    expect(prisma.grupoFormacao.update).not.toHaveBeenCalled();
  });

  it("400 corpo inválido", async () => {
    allowAccess();
    const res = await FORMADOR_PATCH(formadorReq({ ativo: "sim" }), ctx);
    expect(res.status).toBe(400);
  });

  it("200 liga o Mural na turma e audita", async () => {
    allowAccess();
    vi.mocked(prisma.grupoFormacao.update).mockResolvedValue({} as never);

    const res = await FORMADOR_PATCH(formadorReq({ ativo: true }), ctx);

    expect(res.status).toBe(200);
    expect(prisma.grupoFormacao.update).toHaveBeenCalledWith({
      where: { id: TURMA },
      data: { muralFrutosAtivo: true },
    });
    expect(logAction).toHaveBeenCalledWith(
      "travessia_mural_turma",
      USER,
      "10.0.0.1",
      expect.objectContaining({ turmaId: TURMA, ativo: true }),
      ORG
    );
  });
});
