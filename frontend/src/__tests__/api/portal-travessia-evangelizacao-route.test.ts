/**
 * Rota do portal para registrar a evangelização da Travessia (Fatia 4): Instagram
 * (sem URL) ou YouTube (com link). Rende Fruto UMA vez por rede na travessia —
 * ancorada ao 1º livro ativo da turma. Autorização pela PERTENÇA (guard anti-IDOR
 * → 404 sem livro ativo). Mocka o Prisma.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    formando: { findFirst: vi.fn() },
    leituraVocacional: { findFirst: vi.fn() },
    acaoLeitura: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
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
import { POST, DELETE } from "@/app/api/portal/travessia/evangelizacao/route";

const ORG = "org_default";
const FORMANDO = "fmd_1";
const TURMA = "grp_voc_1";
const LIVRO = "liv_1";

function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://test/api/portal/travessia/evangelizacao", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }) as never;
}
const H = { "x-formando-id": FORMANDO, "x-formando-org": ORG };
const authed = (body: unknown) => req(body, H);

function comTurmaEAncora() {
  vi.mocked(prisma.formando.findFirst).mockResolvedValue({ grupoFormacaoId: TURMA } as never);
  vi.mocked(prisma.leituraVocacional.findFirst).mockResolvedValue({ id: LIVRO, turmaId: TURMA } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST evangelização", () => {
  it("401 sem headers de sessão do portal", async () => {
    const res = await POST(req({ rede: "instagram" }));
    expect(res.status).toBe(401);
    expect(prisma.formando.findFirst).not.toHaveBeenCalled();
  });

  it("400 quando o corpo é inválido (rede fora do enum)", async () => {
    const res = await POST(authed({ rede: "tiktok" }));
    expect(res.status).toBe(400);
  });

  it("400 YouTube sem link", async () => {
    const res = await POST(authed({ rede: "youtube" }));
    expect(res.status).toBe(400);
  });

  it("400 YouTube com URL que não é do YouTube", async () => {
    const res = await POST(authed({ rede: "youtube", url: "https://vimeo.com/123" }));
    expect(res.status).toBe(400);
  });

  it("404 quando a turma não tem livro ativo", async () => {
    vi.mocked(prisma.formando.findFirst).mockResolvedValue({ grupoFormacaoId: TURMA } as never);
    vi.mocked(prisma.leituraVocacional.findFirst).mockResolvedValue(null as never);
    const res = await POST(authed({ rede: "instagram" }));
    expect(res.status).toBe(404);
    expect(prisma.acaoLeitura.create).not.toHaveBeenCalled();
  });

  it("200 cria a ação de Instagram (5 Frutos, capítulo nulo) e audita", async () => {
    comTurmaEAncora();
    vi.mocked(prisma.acaoLeitura.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.acaoLeitura.create).mockResolvedValue({} as never);

    const res = await POST(authed({ rede: "instagram" }));

    expect(res.status).toBe(200);
    const arg = vi.mocked(prisma.acaoLeitura.create).mock.calls[0][0];
    expect(arg.data).toMatchObject({
      formandoId: FORMANDO,
      leituraId: LIVRO,
      capituloId: null,
      tipo: "evangelizacao_instagram",
      frutos: 5,
    });
    expect(logAction).toHaveBeenCalledWith(
      "travessia_evangelizacao_registrada",
      undefined,
      "10.0.0.1",
      expect.objectContaining({ formandoId: FORMANDO, rede: "instagram" }),
      ORG
    );
  });

  it("200 idempotente: Instagram já registrado não duplica o Fruto", async () => {
    comTurmaEAncora();
    vi.mocked(prisma.acaoLeitura.findFirst).mockResolvedValue({ id: "acao_x" } as never);

    const res = await POST(authed({ rede: "instagram" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ jaRegistrado: true });
    expect(prisma.acaoLeitura.create).not.toHaveBeenCalled();
  });

  it("200 YouTube: guarda o link no texto ao criar", async () => {
    comTurmaEAncora();
    vi.mocked(prisma.acaoLeitura.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.acaoLeitura.create).mockResolvedValue({} as never);

    const res = await POST(authed({ rede: "youtube", url: "https://youtu.be/abc" }));

    expect(res.status).toBe(200);
    const arg = vi.mocked(prisma.acaoLeitura.create).mock.calls[0][0];
    expect(arg.data).toMatchObject({ tipo: "evangelizacao_youtube", frutos: 5, texto: "https://youtu.be/abc" });
  });

  it("200 YouTube já registrado: atualiza o link, sem novo Fruto", async () => {
    comTurmaEAncora();
    vi.mocked(prisma.acaoLeitura.findFirst).mockResolvedValue({ id: "acao_yt" } as never);
    vi.mocked(prisma.acaoLeitura.update).mockResolvedValue({} as never);

    const res = await POST(authed({ rede: "youtube", url: "https://youtube.com/watch?v=xyz" }));

    expect(res.status).toBe(200);
    expect(prisma.acaoLeitura.create).not.toHaveBeenCalled();
    expect(prisma.acaoLeitura.update).toHaveBeenCalledWith({
      where: { id: "acao_yt" },
      data: { texto: "https://youtube.com/watch?v=xyz" },
    });
  });
});

describe("DELETE evangelização", () => {
  function reqDel(rede?: string) {
    const url = rede
      ? `http://test/api/portal/travessia/evangelizacao?rede=${rede}`
      : "http://test/api/portal/travessia/evangelizacao";
    return new Request(url, { method: "DELETE", headers: H }) as never;
  }

  it("400 rede inválida", async () => {
    const res = await DELETE(reqDel("tiktok"));
    expect(res.status).toBe(400);
  });

  it("200 remove a ação da rede (aditivo) e audita", async () => {
    comTurmaEAncora();
    vi.mocked(prisma.acaoLeitura.deleteMany).mockResolvedValue({ count: 1 } as never);

    const res = await DELETE(reqDel("instagram"));

    expect(res.status).toBe(200);
    expect(prisma.acaoLeitura.deleteMany).toHaveBeenCalledWith({
      where: { formandoId: FORMANDO, organizacaoId: ORG, tipo: "evangelizacao_instagram", leitura: { turmaId: TURMA, ativo: true } },
    });
    expect(logAction).toHaveBeenCalledWith(
      "travessia_evangelizacao_removida",
      undefined,
      "10.0.0.1",
      expect.objectContaining({ rede: "instagram" }),
      ORG
    );
  });
});
