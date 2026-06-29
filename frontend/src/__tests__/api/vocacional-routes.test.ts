/**
 * Testes de rota HTTP do módulo Período Vocacional (backlog P0.1).
 *
 * As decisões puras já têm cobertura em `vocacional-rules.test.ts`; aqui
 * exercitamos os *handlers* reais — guards, escopo de tenant, transições 409 e
 * a trilha de auditoria de leitura do foro íntimo (P0.2) — mockando apenas I/O
 * (`auth`, `prisma`, rate-limit, storage, crypto, audit-log). As regras puras,
 * schemas (zod) e o livro de registro permanecem reais.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizacao: { findUnique: vi.fn() },
    participacaoVocacional: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    acompanhamentoVocacional: { findMany: vi.fn(), create: vi.fn() },
    grupoFormacao: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    formando: { findFirst: vi.fn(), update: vi.fn() },
    usuario: { findFirst: vi.fn() },
    termoRegistro: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/audit-log", () => ({
  logAction: vi.fn(),
  logError: vi.fn(),
  getClientIp: vi.fn(() => "10.0.0.1"),
}));
vi.mock("@/lib/rate-limit", () => ({
  limiters: { mutation: vi.fn(async () => ({ allowed: true })) },
}));
vi.mock("@/lib/crypto", () => ({
  encryptField: (v: string) => v,
  decryptField: (v: string) => v,
}));
vi.mock("@/lib/storage", () => ({ uploadFile: vi.fn(async () => "storage-key") }));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit-log";

import { GET as turmasGET, POST as turmasPOST } from "@/app/api/vocacional/turmas/route";
import { POST as participacoesPOST } from "@/app/api/vocacional/participacoes/route";
import { PATCH as participacaoPATCH } from "@/app/api/vocacional/participacoes/[id]/route";
import { POST as cartaPOST } from "@/app/api/vocacional/participacoes/[id]/carta/route";
import {
  GET as acompanhamentoGET,
  POST as acompanhamentoPOST,
} from "@/app/api/vocacional/participacoes/[id]/acompanhamento/route";

const mockAuth = vi.mocked(auth);
const ORG = "org_a";

type Role = "formador_comunitario" | "formador_geral" | "administrador";

function session(role: Role, opts: { id?: string; org?: string } = {}) {
  return { user: { id: opts.id ?? "user_1", role, organizacaoId: opts.org ?? ORG } } as never;
}

function jsonReq(body: unknown, method = "POST") {
  return new Request("http://test/api", {
    method,
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  // Por padrão a org é canônica → módulo vocacional disponível.
  vi.mocked(prisma.organizacao.findUnique).mockResolvedValue({
    tipoOrganizacao: "nova_comunidade",
    vocacionalHabilitado: false,
  } as never);
});

// ── 401: sem sessão ─────────────────────────────────────────────────────────

describe("401 — sem sessão autenticada", () => {
  beforeEach(() => mockAuth.mockResolvedValue(null as never));

  it("GET /turmas → 401", async () => {
    const res = await turmasGET();
    expect(res.status).toBe(401);
  });

  it("POST /participacoes → 401", async () => {
    const res = await participacoesPOST(jsonReq({ formandoId: "f1", turmaId: "t1" }));
    expect(res.status).toBe(401);
  });

  it("GET /acompanhamento → 401", async () => {
    const res = await acompanhamentoGET(new Request("http://test/api"), ctx("p1"));
    expect(res.status).toBe(401);
  });

  it("PATCH /participacoes/[id] → 401", async () => {
    const res = await participacaoPATCH(jsonReq({ status: "ativa" }, "PATCH"), ctx("p1"));
    expect(res.status).toBe(401);
  });
});

// ── 403: papel insuficiente ─────────────────────────────────────────────────

describe("403 — papel insuficiente", () => {
  it("POST /turmas com formador_comunitario → 403 (exige formador_geral)", async () => {
    mockAuth.mockResolvedValue(session("formador_comunitario"));
    const res = await turmasPOST(jsonReq({ nome: "Turma 1" }));
    expect(res.status).toBe(403);
  });

  it("POST /participacoes com formador_comunitario → 403", async () => {
    mockAuth.mockResolvedValue(session("formador_comunitario"));
    const res = await participacoesPOST(jsonReq({ formandoId: "f1", turmaId: "t1" }));
    expect(res.status).toBe(403);
  });
});

// ── 403: módulo indisponível para a organização ─────────────────────────────

describe("403 — módulo vocacional indisponível para a org", () => {
  it("GET /turmas em org não-canônica sem flag → 403", async () => {
    mockAuth.mockResolvedValue(session("administrador"));
    vi.mocked(prisma.organizacao.findUnique).mockResolvedValue({
      tipoOrganizacao: "grupo_oracao",
      vocacionalHabilitado: false,
    } as never);
    const res = await turmasGET();
    expect(res.status).toBe(403);
  });
});

// ── Isolamento de tenant: recurso de outra org não é visível (404 por escopo) ─

describe("isolamento de tenant — escopo por organizacaoId", () => {
  it("GET /acompanhamento de participação fora da org → 404 e query escopada", async () => {
    mockAuth.mockResolvedValue(session("administrador", { org: ORG }));
    vi.mocked(prisma.participacaoVocacional.findFirst).mockResolvedValue(null as never);

    const res = await acompanhamentoGET(new Request("http://test/api"), ctx("p_alheia"));
    expect(res.status).toBe(404);

    const whereArg = vi.mocked(prisma.participacaoVocacional.findFirst).mock.calls[0][0] as {
      where: { organizacaoId: string };
    };
    expect(whereArg.where.organizacaoId).toBe(ORG);
  });

  it("PATCH /participacoes/[id] de outra org → 404", async () => {
    mockAuth.mockResolvedValue(session("administrador"));
    vi.mocked(prisma.participacaoVocacional.findFirst).mockResolvedValue(null as never);
    const res = await participacaoPATCH(jsonReq({ acompanhadorId: "x" }, "PATCH"), ctx("p_alheia"));
    expect(res.status).toBe(404);
  });
});

// ── 409: transições em participação terminal ────────────────────────────────

describe("409 — participação já encerrada", () => {
  it("PATCH re-encerramento de participação terminal → 409", async () => {
    mockAuth.mockResolvedValue(session("administrador"));
    vi.mocked(prisma.participacaoVocacional.findFirst).mockResolvedValue({
      id: "p1",
      status: "concluida_deferida",
      formando: { id: "f1", nome: "Fulano" },
    } as never);
    const res = await participacaoPATCH(jsonReq({ status: "recusada_arquivada" }, "PATCH"), ctx("p1"));
    expect(res.status).toBe(409);
  });

  it("POST /carta em participação terminal → 409", async () => {
    mockAuth.mockResolvedValue(session("administrador"));
    vi.mocked(prisma.participacaoVocacional.findFirst).mockResolvedValue({
      id: "p1",
      status: "cancelada",
      formando: { id: "f1", nome: "Fulano" },
      turma: { formadorId: "user_1" },
    } as never);
    const res = await cartaPOST(new Request("http://test/api", { method: "POST" }), ctx("p1"));
    expect(res.status).toBe(409);
  });
});

// ── 403: foro íntimo acessado por FC alheio ─────────────────────────────────

describe("403 — acompanhamento (foro íntimo) por FC alheio", () => {
  const alheio = {
    id: "p1",
    acompanhadorId: "outro_user",
    turma: { formadorId: "outro_formador" },
  };

  it("GET por FC que não acompanha nem é formador da turma → 403", async () => {
    mockAuth.mockResolvedValue(session("formador_comunitario", { id: "fc_x" }));
    vi.mocked(prisma.participacaoVocacional.findFirst).mockResolvedValue(alheio as never);
    const res = await acompanhamentoGET(new Request("http://test/api"), ctx("p1"));
    expect(res.status).toBe(403);
  });

  it("POST por FC alheio → 403", async () => {
    mockAuth.mockResolvedValue(session("formador_comunitario", { id: "fc_x" }));
    vi.mocked(prisma.participacaoVocacional.findFirst).mockResolvedValue(alheio as never);
    const res = await acompanhamentoPOST(jsonReq({ anotacaoEvolucao: "x" }), ctx("p1"));
    expect(res.status).toBe(403);
  });
});

// ── 403: cancelamento de inscrição por não-administrador ─────────────────────

describe("403 — cancelamento por não-administrador", () => {
  it("PATCH status=cancelada com formador_geral → 403", async () => {
    mockAuth.mockResolvedValue(session("formador_geral"));
    vi.mocked(prisma.participacaoVocacional.findFirst).mockResolvedValue({
      id: "p1",
      status: "ativa",
      formando: { id: "f1", nome: "Fulano" },
    } as never);
    const res = await participacaoPATCH(jsonReq({ status: "cancelada" }, "PATCH"), ctx("p1"));
    expect(res.status).toBe(403);
  });
});

// ── P0.2: trilha de auditoria de LEITURA do foro íntimo ─────────────────────

describe("P0.2 — auditoria de leitura do acompanhamento", () => {
  it("GET autorizado registra vocacional_acompanhamento_lido", async () => {
    mockAuth.mockResolvedValue(session("formador_geral", { id: "fg_1" }));
    vi.mocked(prisma.participacaoVocacional.findFirst).mockResolvedValue({
      id: "p1",
      acompanhadorId: null,
      turma: { formadorId: null },
    } as never);
    vi.mocked(prisma.acompanhamentoVocacional.findMany).mockResolvedValue([] as never);

    const res = await acompanhamentoGET(new Request("http://test/api"), ctx("p1"));
    expect(res.status).toBe(200);

    expect(logAction).toHaveBeenCalledWith(
      "vocacional_acompanhamento_lido",
      "fg_1",
      expect.any(String),
      { participacaoId: "p1", papel: "formador_geral" },
      ORG,
    );
  });
});
