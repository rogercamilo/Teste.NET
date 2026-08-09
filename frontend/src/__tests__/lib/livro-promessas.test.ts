import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mapProcessoParaTipoPromessa,
  processoGeraPromessa,
  montarFormulaPromessa,
  montarRefPromessa,
  lavrarRegistroPromessa,
} from "@/lib/livro-promessas";

describe("mapProcessoParaTipoPromessa", () => {
  it("mapeia os 3 tipos de processo de promessa", () => {
    expect(mapProcessoParaTipoPromessa("promessas_iniciais")).toBe("iniciais_temporarias");
    expect(mapProcessoParaTipoPromessa("renovacao_promessas")).toBe("renovacao");
    expect(mapProcessoParaTipoPromessa("promessas_definitivas")).toBe("definitivas");
  });

  it("retorna null para processos que não geram promessa", () => {
    expect(mapProcessoParaTipoPromessa("inicio_vocacional")).toBeNull();
    expect(mapProcessoParaTipoPromessa("admissao_etapa")).toBeNull();
    expect(mapProcessoParaTipoPromessa("ministerio")).toBeNull();
    expect(mapProcessoParaTipoPromessa("desligamento")).toBeNull();
  });

  it("processoGeraPromessa reflete o mapeamento", () => {
    expect(processoGeraPromessa("promessas_iniciais")).toBe(true);
    expect(processoGeraPromessa("transferencia")).toBe(false);
  });
});

describe("montarFormulaPromessa", () => {
  it("temporárias citam o período de vigência", () => {
    const txt = montarFormulaPromessa({
      formandoNome: "Maria",
      orgNome: "Comunidade X",
      tipo: "iniciais_temporarias",
      periodoVigencia: "dois anos",
    });
    expect(txt).toContain("Maria");
    expect(txt).toContain("Comunidade X");
    expect(txt).toContain("por um período de dois anos");
    expect(txt).toContain("Primeiras Promessas");
  });

  it("definitivas são perpétuas (sem prazo)", () => {
    const txt = montarFormulaPromessa({
      formandoNome: "João",
      orgNome: "Comunidade X",
      tipo: "definitivas",
    });
    expect(txt).toContain("renovando-se perpetuamente");
    expect(txt).not.toContain("por um período de");
  });
});

describe("montarRefPromessa", () => {
  it("formata Tomo/Folha/Registro com folha zero-paddada", () => {
    expect(
      montarRefPromessa({ tomo: "I", folha: 7, numeroRegistro: "0007" })
    ).toBe("Livro de Promessas, Tomo I, Folha 007, Registro nº 0007");
  });
});

describe("lavrarRegistroPromessa", () => {
  function makeTx(opts: { existente?: unknown; maxNumero?: number | null } = {}) {
    const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "reg1", ...data }));
    return {
      tx: {
        registroPromessa: {
          findUnique: vi.fn(async () => opts.existente ?? null),
          aggregate: vi.fn(async () => ({ _max: { numero: opts.maxNumero ?? null } })),
          create,
        },
      } as never,
      create,
    };
  }

  const base = {
    organizacaoId: "org1",
    formandoId: "f1",
    processoId: "p1",
    tipo: "iniciais_temporarias" as const,
    dataVigenciaInicio: new Date("2026-06-29T12:00:00"),
    dataVigenciaFim: new Date("2027-06-29T12:00:00"),
    formulaTexto: "Eu, Maria…",
    celebrante: "Pe. Antônio",
    localCelebracao: "Capela",
    moderadorGeral: "Madre Clara",
    secretario: "Irmã Joana",
  };

  beforeEach(() => vi.clearAllMocks());

  it("atribui numero/numeroRegistro/folha sequenciais a partir do 1º assento", async () => {
    const { tx, create } = makeTx({ maxNumero: null });
    await lavrarRegistroPromessa(tx, base);
    const data = create.mock.calls[0][0].data;
    expect(data.numero).toBe(1);
    expect(data.numeroRegistro).toBe("0001");
    expect(data.folha).toBe(1);
    expect(data.tomo).toBe("I");
  });

  it("incrementa a partir do maior numero existente no tomo", async () => {
    const { tx, create } = makeTx({ maxNumero: 12 });
    await lavrarRegistroPromessa(tx, base);
    const data = create.mock.calls[0][0].data;
    expect(data.numero).toBe(13);
    expect(data.numeroRegistro).toBe("0013");
    expect(data.folha).toBe(13);
  });

  it("é idempotente: retorna o registro existente sem reinserir", async () => {
    const existente = { id: "jaExiste", numero: 5 };
    const { tx, create } = makeTx({ existente });
    const out = await lavrarRegistroPromessa(tx, base);
    expect(out).toBe(existente);
    expect(create).not.toHaveBeenCalled();
  });
});
