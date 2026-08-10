/**
 * Rota de download do material de formação no Portal do Formando.
 *
 * A autorização é pela PONTE de dados (existe `PresencaFormacao` do formando para
 * o agendamento), nunca pelo id do arquivo — protege contra IDOR. Cobre: falta de
 * sessão, id inválido, ausência de presença (não escalado), encontro futuro,
 * formação sem anexo e o caminho feliz servindo do disco local. Mocka apenas I/O.
 */
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    presencaFormacao: { findFirst: vi.fn() },
    agendamento: { findFirst: vi.fn() },
    arquivo: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/storage", () => ({
  // A rota serve os bytes SAME-ORIGIN (via readFileBuffer), sem redirect ao R2 —
  // o visualizador pdf.js do portal busca o arquivo por fetch (302→R2 quebra CORS).
  readFileBuffer: vi.fn(async () => Buffer.from("conteudo-pdf")),
  localFileExists: vi.fn(async () => true),
  R2_ENABLED: false,
}));
vi.mock("@/lib/audit-log", () => ({
  logAction: vi.fn(),
  logError: vi.fn(),
  getClientIp: vi.fn(() => "10.0.0.1"),
}));

import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit-log";
import { GET } from "@/app/api/portal/formacoes/[agendamentoId]/material/route";

const ORG = "org_default";
const FORMANDO = "fmd_1";
const AGENDA = "agd_past_1";

function req(headers: Record<string, string> = {}) {
  return new Request("http://test/api/portal/formacoes/x/material", { headers }) as never;
}
const ctx = (id: string) => ({ params: Promise.resolve({ agendamentoId: id }) });
const authed = () => req({ "x-formando-id": FORMANDO, "x-formando-org": ORG });

const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);

beforeEach(() => {
  vi.clearAllMocks();
  // Modo local (sem R2) para exercitar o serve direto do disco.
  vi.stubEnv("R2_ACCOUNT_ID", "");
  vi.stubEnv("R2_ACCESS_KEY_ID", "");
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
  vi.stubEnv("R2_BUCKET_NAME", "");
});

describe("GET /api/portal/formacoes/[agendamentoId]/material", () => {
  it("401 sem headers de sessão do portal", async () => {
    const res = await GET(req(), ctx(AGENDA));
    expect(res.status).toBe(401);
    expect(prisma.presencaFormacao.findFirst).not.toHaveBeenCalled();
  });

  it("404 quando o id do agendamento é inválido", async () => {
    const res = await GET(authed(), ctx("id com espaço!"));
    expect(res.status).toBe(404);
    expect(prisma.presencaFormacao.findFirst).not.toHaveBeenCalled();
  });

  it("404 quando o formando NÃO foi escalado para o encontro (guard IDOR)", async () => {
    vi.mocked(prisma.presencaFormacao.findFirst).mockResolvedValue(null as never);
    const res = await GET(authed(), ctx(AGENDA));
    expect(res.status).toBe(404);
    expect(prisma.agendamento.findFirst).not.toHaveBeenCalled();
  });

  it("403 quando o encontro ainda não chegou (material fechado)", async () => {
    vi.mocked(prisma.presencaFormacao.findFirst).mockResolvedValue({ data: amanha } as never);
    const res = await GET(authed(), ctx(AGENDA));
    expect(res.status).toBe(403);
    expect(prisma.agendamento.findFirst).not.toHaveBeenCalled();
  });

  it("404 quando a formação não tem anexo", async () => {
    vi.mocked(prisma.presencaFormacao.findFirst).mockResolvedValue({ data: ontem } as never);
    vi.mocked(prisma.agendamento.findFirst).mockResolvedValue({ formacao: { documentoAnexoId: null } } as never);
    const res = await GET(authed(), ctx(AGENDA));
    expect(res.status).toBe(404);
    expect(prisma.arquivo.findUnique).not.toHaveBeenCalled();
  });

  it("200 serve o anexo do disco quando autorizado", async () => {
    vi.mocked(prisma.presencaFormacao.findFirst).mockResolvedValue({ data: ontem } as never);
    vi.mocked(prisma.agendamento.findFirst).mockResolvedValue({ formacao: { documentoAnexoId: "arq_1" } } as never);
    vi.mocked(prisma.arquivo.findUnique).mockResolvedValue(
      { id: "arq_1", storageKey: "formacao/arq_1.pdf", tipo: "application/pdf", nome: "apostila.pdf" } as never
    );

    const res = await GET(authed(), ctx(AGENDA));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain("apostila.pdf");
    expect(logAction).toHaveBeenCalledWith(
      "portal_material_visualizado",
      undefined,
      "10.0.0.1",
      expect.objectContaining({ formandoId: FORMANDO, agendamentoId: AGENDA, arquivoId: "arq_1" }),
      ORG
    );
  });
});
