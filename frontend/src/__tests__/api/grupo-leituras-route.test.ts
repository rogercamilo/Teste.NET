/**
 * Rotas de leitura por GRUPO DE FORMAÇÃO (jornada por níveis). Mesmo motor da
 * Travessia vocacional, sem exigir o módulo vocacional: a autorização é papel
 * mínimo FC + (gestão OU formador responsável pelo grupo). Mocka auth, prisma
 * (só o guard) e o store de leituras.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { grupoFormacao: { findFirst: vi.fn() } } }));
vi.mock("@/lib/leituras-store", () => ({
  listLeituras: vi.fn(async () => []),
  createLeitura: vi.fn(async () => ({ id: "liv_1", titulo: "Livro", capitulos: [] })),
  updateLeitura: vi.fn(async () => ({ id: "liv_1" })),
  deleteLeitura: vi.fn(async () => true),
}));
vi.mock("@/lib/rate-limit", () => ({ limiters: { mutation: vi.fn(async () => ({ allowed: true })) } }));
vi.mock("@/lib/audit-log", () => ({ logAction: vi.fn(), logError: vi.fn(), getClientIp: vi.fn(() => "10.0.0.1") }));

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createLeitura, deleteLeitura } from "@/lib/leituras-store";
import { logAction } from "@/lib/audit-log";
import { POST } from "@/app/api/grupos-formacao/[id]/leituras/route";
import { DELETE } from "@/app/api/grupos-formacao/[id]/leituras/[leituraId]/route";

const ORG = "org_default";
const GRUPO = "grp_1";

function postReq(body?: unknown) {
  return new Request("http://test/api/grupos-formacao/grp_1/leituras", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }) as never;
}
const ctx = { params: Promise.resolve({ id: GRUPO }) };
const ctxLeitura = { params: Promise.resolve({ id: GRUPO, leituraId: "liv_1" }) };
const setUser = (u: Record<string, unknown> | null) =>
  vi.mocked(auth).mockResolvedValue((u ? { user: u } : null) as never);
// Capítulos são objetos: título obrigatório + material formativo opcional (aqui,
// um capítulo com objetivo preenchido e outro só com título).
const livroBody = {
  titulo: "A Imitação de Cristo",
  autor: "Tomás de Kempis",
  capitulos: [
    { titulo: "Cap 1", objetivo: "Desapegar das vaidades" },
    { titulo: "Cap 2" },
  ],
};

beforeEach(() => vi.clearAllMocks());

describe("POST /api/grupos-formacao/[id]/leituras", () => {
  it("401 sem sessão", async () => {
    setUser(null);
    const res = await POST(postReq(livroBody), ctx);
    expect(res.status).toBe(401);
    expect(createLeitura).not.toHaveBeenCalled();
  });

  it("403 quando o FC não é o responsável pelo grupo", async () => {
    setUser({ id: "u1", role: "formador_comunitario", organizacaoId: ORG, grupoFormacaoId: "outro_grupo" });
    vi.mocked(prisma.grupoFormacao.findFirst).mockResolvedValue({ id: GRUPO, formadorId: "u2" } as never);
    const res = await POST(postReq(livroBody), ctx);
    expect(res.status).toBe(403);
    expect(createLeitura).not.toHaveBeenCalled();
  });

  it("404 quando o grupo não existe na organização", async () => {
    setUser({ id: "a1", role: "administrador", organizacaoId: ORG });
    vi.mocked(prisma.grupoFormacao.findFirst).mockResolvedValue(null as never);
    const res = await POST(postReq(livroBody), ctx);
    expect(res.status).toBe(404);
    expect(createLeitura).not.toHaveBeenCalled();
  });

  it("201 quando gestão cadastra — chama o store e audita", async () => {
    setUser({ id: "a1", role: "administrador", organizacaoId: ORG });
    vi.mocked(prisma.grupoFormacao.findFirst).mockResolvedValue({ id: GRUPO, formadorId: null } as never);
    const res = await POST(postReq(livroBody), ctx);
    expect(res.status).toBe(201);
    expect(createLeitura).toHaveBeenCalledWith(GRUPO, ORG, {
      titulo: livroBody.titulo,
      autor: livroBody.autor,
      capitulos: livroBody.capitulos,
    });
    expect(logAction).toHaveBeenCalledWith(
      "grupo_leitura_criada",
      "a1",
      "10.0.0.1",
      expect.objectContaining({ grupoId: GRUPO }),
      ORG
    );
  });

  it("201 quando o FC responsável pelo grupo cadastra (vínculo por grupoFormacaoId)", async () => {
    setUser({ id: "u1", role: "formador_comunitario", organizacaoId: ORG, grupoFormacaoId: GRUPO });
    vi.mocked(prisma.grupoFormacao.findFirst).mockResolvedValue({ id: GRUPO, formadorId: "u9" } as never);
    const res = await POST(postReq(livroBody), ctx);
    expect(res.status).toBe(201);
    expect(createLeitura).toHaveBeenCalled();
  });

  it("400 quando o corpo é inválido (sem capítulos)", async () => {
    setUser({ id: "a1", role: "administrador", organizacaoId: ORG });
    vi.mocked(prisma.grupoFormacao.findFirst).mockResolvedValue({ id: GRUPO, formadorId: null } as never);
    const res = await POST(postReq({ titulo: "Só título" }), ctx);
    expect(res.status).toBe(400);
    expect(createLeitura).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/grupos-formacao/[id]/leituras/[leituraId]", () => {
  it("401 sem sessão", async () => {
    setUser(null);
    const res = await DELETE(postReq(), ctxLeitura);
    expect(res.status).toBe(401);
    expect(deleteLeitura).not.toHaveBeenCalled();
  });

  it("200 quando gestão remove (escopo por grupo+org no store)", async () => {
    setUser({ id: "a1", role: "administrador", organizacaoId: ORG });
    vi.mocked(prisma.grupoFormacao.findFirst).mockResolvedValue({ id: GRUPO, formadorId: null } as never);
    const res = await DELETE(postReq(), ctxLeitura);
    expect(res.status).toBe(200);
    expect(deleteLeitura).toHaveBeenCalledWith(GRUPO, ORG, "liv_1");
  });

  it("404 quando a leitura não pertence ao grupo/org", async () => {
    setUser({ id: "a1", role: "administrador", organizacaoId: ORG });
    vi.mocked(prisma.grupoFormacao.findFirst).mockResolvedValue({ id: GRUPO, formadorId: null } as never);
    vi.mocked(deleteLeitura).mockResolvedValueOnce(false);
    const res = await DELETE(postReq(), ctxLeitura);
    expect(res.status).toBe(404);
  });
});
