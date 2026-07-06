/**
 * Rota do portal para registrar a evangelização da Travessia POR CAPÍTULO:
 * Instagram (link opcional) ou YouTube (link obrigatório). Rende Fruto UMA vez por
 * rede em cada capítulo. Autorização pela PERTENÇA (guard anti-IDOR → 404 quando o
 * capítulo não é de um livro ativo da turma do formando). Mocka o Prisma.
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
import { POST, DELETE } from "@/app/api/portal/travessia/capitulos/[capituloId]/evangelizacao/route";

const ORG = "org_default";
const FORMANDO = "fmd_1";
const TURMA = "grp_voc_1";
const LIVRO = "liv_1";
const CAP = "cap_1";

const params = { params: Promise.resolve({ capituloId: CAP }) };

function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://test/api/portal/travessia/capitulos/${CAP}/evangelizacao`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }) as never;
}
const H = { "x-formando-id": FORMANDO, "x-formando-org": ORG };
const authed = (body: unknown) => req(body, H);

function comCapitulo() {
  vi.mocked(prisma.formando.findFirst).mockResolvedValue({ grupoFormacaoId: TURMA } as never);
  vi.mocked(prisma.capituloLeitura.findFirst).mockResolvedValue({ id: CAP, leituraId: LIVRO } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST evangelização por capítulo", () => {
  it("401 sem headers de sessão do portal", async () => {
    const res = await POST(req({ rede: "instagram" }), params);
    expect(res.status).toBe(401);
    expect(prisma.formando.findFirst).not.toHaveBeenCalled();
  });

  it("400 quando o corpo é inválido (rede fora do enum)", async () => {
    const res = await POST(authed({ rede: "tiktok" }), params);
    expect(res.status).toBe(400);
  });

  it("400 YouTube sem link", async () => {
    const res = await POST(authed({ rede: "youtube" }), params);
    expect(res.status).toBe(400);
  });

  it("400 YouTube com URL que não é do YouTube", async () => {
    const res = await POST(authed({ rede: "youtube", url: "https://vimeo.com/123" }), params);
    expect(res.status).toBe(400);
  });

  it("400 Instagram com URL que não é do Instagram", async () => {
    const res = await POST(authed({ rede: "instagram", url: "https://exemplo.com/x" }), params);
    expect(res.status).toBe(400);
  });

  it("404 quando o capítulo não é de um livro ativo da turma", async () => {
    vi.mocked(prisma.formando.findFirst).mockResolvedValue({ grupoFormacaoId: TURMA } as never);
    vi.mocked(prisma.capituloLeitura.findFirst).mockResolvedValue(null as never);
    const res = await POST(authed({ rede: "instagram" }), params);
    expect(res.status).toBe(404);
    expect(prisma.acaoLeitura.upsert).not.toHaveBeenCalled();
  });

  it("200 registra o Instagram sem link (2 Frutos) no capítulo e audita", async () => {
    comCapitulo();
    vi.mocked(prisma.acaoLeitura.upsert).mockResolvedValue({ id: "acao_x" } as never);

    const res = await POST(authed({ rede: "instagram" }), params);

    expect(res.status).toBe(200);
    const arg = vi.mocked(prisma.acaoLeitura.upsert).mock.calls[0][0];
    expect(arg.where).toMatchObject({
      formandoId_capituloId_tipo: { formandoId: FORMANDO, capituloId: CAP, tipo: "evangelizacao_instagram" },
    });
    expect(arg.create).toMatchObject({
      formandoId: FORMANDO,
      leituraId: LIVRO,
      capituloId: CAP,
      tipo: "evangelizacao_instagram",
      frutos: 2,
      texto: null,
    });
    expect(logAction).toHaveBeenCalledWith(
      "travessia_evangelizacao_registrada",
      undefined,
      "10.0.0.1",
      expect.objectContaining({ formandoId: FORMANDO, capituloId: CAP, rede: "instagram" }),
      ORG
    );
  });

  it("200 Instagram com link opcional: guarda no texto", async () => {
    comCapitulo();
    vi.mocked(prisma.acaoLeitura.upsert).mockResolvedValue({ id: "acao_ig" } as never);

    const res = await POST(authed({ rede: "instagram", url: "https://instagram.com/p/abc" }), params);

    expect(res.status).toBe(200);
    const arg = vi.mocked(prisma.acaoLeitura.upsert).mock.calls[0][0];
    expect(arg.create).toMatchObject({ tipo: "evangelizacao_instagram", texto: "https://instagram.com/p/abc" });
    expect(arg.update).toMatchObject({ texto: "https://instagram.com/p/abc" });
  });

  it("200 YouTube: guarda o link (2 Frutos)", async () => {
    comCapitulo();
    vi.mocked(prisma.acaoLeitura.upsert).mockResolvedValue({ id: "acao_yt" } as never);

    const res = await POST(authed({ rede: "youtube", url: "https://youtu.be/abc" }), params);

    expect(res.status).toBe(200);
    const arg = vi.mocked(prisma.acaoLeitura.upsert).mock.calls[0][0];
    expect(arg.create).toMatchObject({ tipo: "evangelizacao_youtube", frutos: 2, texto: "https://youtu.be/abc" });
  });
});

describe("DELETE evangelização por capítulo", () => {
  function reqDel(rede?: string) {
    const url = rede
      ? `http://test/api/portal/travessia/capitulos/${CAP}/evangelizacao?rede=${rede}`
      : `http://test/api/portal/travessia/capitulos/${CAP}/evangelizacao`;
    return new Request(url, { method: "DELETE", headers: H }) as never;
  }

  it("400 rede inválida", async () => {
    const res = await DELETE(reqDel("tiktok"), params);
    expect(res.status).toBe(400);
  });

  it("200 remove a ação da rede no capítulo (aditivo) e audita", async () => {
    comCapitulo();
    vi.mocked(prisma.acaoLeitura.deleteMany).mockResolvedValue({ count: 1 } as never);

    const res = await DELETE(reqDel("instagram"), params);

    expect(res.status).toBe(200);
    expect(prisma.acaoLeitura.deleteMany).toHaveBeenCalledWith({
      where: { formandoId: FORMANDO, capituloId: CAP, tipo: "evangelizacao_instagram" },
    });
    expect(logAction).toHaveBeenCalledWith(
      "travessia_evangelizacao_removida",
      undefined,
      "10.0.0.1",
      expect.objectContaining({ capituloId: CAP, rede: "instagram" }),
      ORG
    );
  });
});
