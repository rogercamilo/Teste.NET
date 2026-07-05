/**
 * getPortalAniversariantes: aniversariantes do mês no grupo/turma. Verifica o
 * filtro por mês (fuso SP), a marcação de "hoje"/"você" e a ordenação por dia.
 * A data é fixada com fake timers para ser determinística. Mocka o Prisma.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    formando: { findFirst: vi.fn(), findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { getPortalAniversariantes } from "@/lib/portal-data";

const ORG = "org_default";
const EU = "fmd_1";

// Datas de nascimento como meia-noite UTC (padrão YYYY-MM-DD do app).
const nasc = (mes1a12: number, dia: number) => new Date(Date.UTC(1990, mes1a12 - 1, dia));

beforeEach(() => {
  vi.clearAllMocks();
  // 15/07/2026 12:00 UTC → 15/07 09:00 em São Paulo (mês 7, dia 15).
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-15T12:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("getPortalAniversariantes", () => {
  it("retorna [] quando o formando não tem grupo", async () => {
    vi.mocked(prisma.formando.findFirst).mockResolvedValue({ grupoFormacaoId: null } as never);
    const r = await getPortalAniversariantes(EU, ORG);
    expect(r).toEqual([]);
    expect(prisma.formando.findMany).not.toHaveBeenCalled();
  });

  it("filtra pelo mês, ordena por dia e marca hoje/você", async () => {
    vi.mocked(prisma.formando.findFirst).mockResolvedValue({ grupoFormacaoId: "grp_1" } as never);
    vi.mocked(prisma.formando.findMany).mockResolvedValue([
      { id: "fmd_3", nome: "Carla", dataNascimento: nasc(7, 3) }, // julho, dia 3
      { id: EU, nome: "Eu Mesmo", dataNascimento: nasc(7, 15) }, // julho, HOJE + você
      { id: "fmd_ago", nome: "Fora", dataNascimento: nasc(8, 22) }, // agosto — excluído
    ] as never);

    const r = await getPortalAniversariantes(EU, ORG);

    expect(r).toHaveLength(2);
    // Ordenado por dia: Carla (3) antes de Eu (15)
    expect(r[0]).toEqual({ nome: "Carla", dia: 3, ehVoce: false, hoje: false });
    expect(r[1]).toEqual({ nome: "Eu Mesmo", dia: 15, ehVoce: true, hoje: true });
  });

  it("ignora registros sem data de nascimento", async () => {
    vi.mocked(prisma.formando.findFirst).mockResolvedValue({ grupoFormacaoId: "grp_1" } as never);
    vi.mocked(prisma.formando.findMany).mockResolvedValue([
      { id: "fmd_x", nome: "Sem Data", dataNascimento: null },
      { id: "fmd_y", nome: "Com Data", dataNascimento: nasc(7, 10) },
    ] as never);

    const r = await getPortalAniversariantes(EU, ORG);
    expect(r).toEqual([{ nome: "Com Data", dia: 10, ehVoce: false, hoje: false }]);
  });
});
