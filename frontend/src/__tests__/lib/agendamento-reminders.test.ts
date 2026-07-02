import { vi, describe, it, expect, beforeEach } from "vitest";

// server-only é um no-op fora do bundle de browser, mas o import precisa resolver.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/push", () => ({
  sendPushToOrg: vi.fn().mockResolvedValue({ sent: 1, removed: 0, failed: 0 }),
  sendPushToGroup: vi.fn().mockResolvedValue({ sent: 2, removed: 0, failed: 0 }),
}));
vi.mock("@/lib/email", () => ({
  sendAgendamentoReminderEmail: vi.fn().mockResolvedValue({ sent: true }),
}));
vi.mock("@/lib/notificacoes", () => ({
  formadorDoGrupo: vi.fn().mockResolvedValue("fc1"),
  criarNotificacao: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    agendamento: { findMany: vi.fn().mockResolvedValue([]), update: vi.fn().mockResolvedValue({}) },
    formando: { findMany: vi.fn().mockResolvedValue([]) },
    usuario: { findUnique: vi.fn().mockResolvedValue(null) },
  },
}));

import { checkAndSendReminders } from "@/lib/agendamento-reminders";
import { prisma } from "@/lib/prisma";
import { sendPushToOrg, sendPushToGroup } from "@/lib/push";
import { sendAgendamentoReminderEmail } from "@/lib/email";
import { formadorDoGrupo, criarNotificacao } from "@/lib/notificacoes";

const findMany = vi.mocked(prisma.agendamento.findMany);
const update = vi.mocked(prisma.agendamento.update);
const formandoFindMany = vi.mocked(prisma.formando.findMany);
const usuarioFindUnique = vi.mocked(prisma.usuario.findUnique);

const HORA = 60 * 60 * 1000;
const NOW = new Date("2026-07-02T12:00:00.000Z");

function baseRow(over: Record<string, unknown> = {}) {
  return {
    id: "ag1",
    organizacaoId: "org1",
    grupoFormacaoId: null,
    formacaoTema: "Encontro de Oração",
    dataInicio: new Date(NOW.getTime() + HORA),
    dataFim: new Date(NOW.getTime() + 2 * HORA),
    local: "Sala 1",
    linkOnline: null,
    ...over,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("checkAndSendReminders — janelas", () => {
  it("consulta T-24h entre now+2h e now+24h, e T-2h entre now e now+2h (só não-enviados)", async () => {
    findMany.mockResolvedValue([] as never);
    await checkAndSendReminders(NOW);

    const calls = findMany.mock.calls;
    expect(calls).toHaveLength(2);

    const w24 = (calls[0][0] as { where: Record<string, { gt: Date; lte: Date } | unknown> }).where as {
      status: string;
      deletedAt: null;
      lembrete24hEnviado: boolean;
      dataInicio: { gt: Date; lte: Date };
    };
    expect(w24.status).toBe("agendada");
    expect(w24.deletedAt).toBeNull();
    expect(w24.lembrete24hEnviado).toBe(false);
    expect(w24.dataInicio.gt.getTime()).toBe(NOW.getTime() + 2 * HORA);
    expect(w24.dataInicio.lte.getTime()).toBe(NOW.getTime() + 24 * HORA);

    const w2 = (calls[1][0] as { where: Record<string, unknown> }).where as {
      lembrete2hEnviado: boolean;
      dataInicio: { gt: Date; lte: Date };
    };
    expect(w2.lembrete2hEnviado).toBe(false);
    expect(w2.dataInicio.gt.getTime()).toBe(NOW.getTime());
    expect(w2.dataInicio.lte.getTime()).toBe(NOW.getTime() + 2 * HORA);
  });

  it("nada a enviar → não toca em push/e-mail e resumo zerado", async () => {
    findMany.mockResolvedValue([] as never);
    const summary = await checkAndSendReminders(NOW);
    expect(summary).toEqual({ agendamentos: 0, emails: 0, push: 0 });
    expect(sendPushToOrg).not.toHaveBeenCalled();
    expect(sendAgendamentoReminderEmail).not.toHaveBeenCalled();
  });
});

describe("checkAndSendReminders — escopo geral (org)", () => {
  it("dispara push à org, e-mail aos formandos com endereço, e marca a flag", async () => {
    findMany.mockResolvedValueOnce([] as never).mockResolvedValueOnce([baseRow()] as never);
    formandoFindMany.mockResolvedValueOnce([
      { nome: "Ana", email: "ana@x.com" },
      { nome: "Sem Email", email: "" },
    ] as never);

    const summary = await checkAndSendReminders(NOW);

    expect(sendPushToOrg).toHaveBeenCalledTimes(1);
    expect(sendPushToGroup).not.toHaveBeenCalled();
    expect(sendAgendamentoReminderEmail).toHaveBeenCalledTimes(1); // o de e-mail vazio é ignorado
    expect(sendAgendamentoReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ana@x.com", quando: "2h", agendamento: expect.objectContaining({ id: "ag1" }) })
    );
    expect(update).toHaveBeenCalledWith({ where: { id: "ag1" }, data: { lembrete2hEnviado: true } });
    expect(summary.agendamentos).toBe(1);
    expect(summary.emails).toBe(1);
  });
});

describe("checkAndSendReminders — escopo de grupo", () => {
  it("push ao grupo + e-mail aos formandos do grupo + bell e e-mail ao FC", async () => {
    findMany
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([baseRow({ grupoFormacaoId: "g1" })] as never);
    formandoFindMany.mockResolvedValueOnce([{ nome: "Caio", email: "caio@x.com" }] as never);
    usuarioFindUnique.mockResolvedValueOnce({ nome: "Formador", email: "fc@x.com" } as never);

    await checkAndSendReminders(NOW);

    expect(sendPushToGroup).toHaveBeenCalledWith("org1", "g1", expect.any(Object));
    expect(sendPushToOrg).not.toHaveBeenCalled();
    expect(formadorDoGrupo).toHaveBeenCalledWith("g1");
    expect(criarNotificacao).toHaveBeenCalledTimes(1);
    // formando (1) + FC (1)
    expect(sendAgendamentoReminderEmail).toHaveBeenCalledTimes(2);
  });
});
