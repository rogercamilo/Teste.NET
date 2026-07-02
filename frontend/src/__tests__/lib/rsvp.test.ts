import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/notificacoes", () => ({ criarNotificacao: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    formando: { findUnique: vi.fn() },
    agendamento: { findFirst: vi.fn() },
    presencaFormacao: { upsert: vi.fn().mockResolvedValue({}) },
  },
}));

import { registrarRsvpPorToken } from "@/lib/rsvp";
import { prisma } from "@/lib/prisma";
import { criarNotificacao } from "@/lib/notificacoes";

const findFormando = vi.mocked(prisma.formando.findUnique);
const findAgendamento = vi.mocked(prisma.agendamento.findFirst);
const upsert = vi.mocked(prisma.presencaFormacao.upsert);

const formando = {
  id: "f1",
  nome: "Ana",
  organizacaoId: "org1",
  grupoFormacaoId: "g1",
  nivelFormativo: "pre-discipulado",
  deletedAt: null,
};
const agendamento = {
  id: "ag1",
  formacaoTema: "Encontro de Oração",
  dataInicio: new Date("2026-07-10T19:00:00Z"),
  formadorId: "fc1",
};

beforeEach(() => vi.clearAllMocks());

describe("registrarRsvpPorToken", () => {
  it("token inválido → 404", async () => {
    findFormando.mockResolvedValueOnce(null as never);
    const r = await registrarRsvpPorToken({ token: "x", agendamentoId: "ag1", resposta: "sim" });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(404);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("agendamento de outra org / irrelevante → 404 (guard)", async () => {
    findFormando.mockResolvedValueOnce(formando as never);
    findAgendamento.mockResolvedValueOnce(null as never);
    const r = await registrarRsvpPorToken({ token: "t", agendamentoId: "ag1", resposta: "sim" });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(404);
    // o findFirst deve escopar por org do formando
    expect(findAgendamento).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizacaoId: "org1" }) })
    );
  });

  it('"sim" → upsert confirmacaoFormando true, sem notificar', async () => {
    findFormando.mockResolvedValueOnce(formando as never);
    findAgendamento.mockResolvedValueOnce(agendamento as never);
    const r = await registrarRsvpPorToken({ token: "t", agendamentoId: "ag1", resposta: "sim" });
    expect(r.ok).toBe(true);
    const arg = upsert.mock.calls[0][0] as { create: { confirmacaoFormando: boolean } };
    expect(arg.create.confirmacaoFormando).toBe(true);
    expect(criarNotificacao).not.toHaveBeenCalled();
  });

  it('"nao" + motivo → false + justificativa + notifica formador', async () => {
    findFormando.mockResolvedValueOnce(formando as never);
    findAgendamento.mockResolvedValueOnce(agendamento as never);
    const r = await registrarRsvpPorToken({
      token: "t",
      agendamentoId: "ag1",
      resposta: "nao",
      justificativa: "Estarei viajando",
    });
    expect(r.ok).toBe(true);
    const arg = upsert.mock.calls[0][0] as { create: { confirmacaoFormando: boolean; justificativaFormando: string | null } };
    expect(arg.create.confirmacaoFormando).toBe(false);
    expect(arg.create.justificativaFormando).toBe("Estarei viajando");
    expect(criarNotificacao).toHaveBeenCalledTimes(1);
  });

  it("resposta inválida → 400", async () => {
    const r = await registrarRsvpPorToken({ token: "t", agendamentoId: "ag1", resposta: "talvez" as never });
    expect(r.status).toBe(400);
    expect(findFormando).not.toHaveBeenCalled();
  });

  it("motivo curto demais → 400", async () => {
    const r = await registrarRsvpPorToken({ token: "t", agendamentoId: "ag1", resposta: "nao", justificativa: "x" });
    expect(r.status).toBe(400);
  });
});
