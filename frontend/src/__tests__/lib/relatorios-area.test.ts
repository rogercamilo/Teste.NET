import { describe, it, expect } from "vitest";
import { NIVEL_FORMATIVO_LABELS, type NivelFormativo, type ProgressoEtapa } from "@/types";
import {
  montarRelatorioAcompanhamentoMorada,
  type FormandoAcomp,
  type PresencaAcomp,
} from "@/lib/relatorios/acompanhamento-morada-relatorio";
import { montarRelatorioFrequencia, type PresencaFreq } from "@/lib/relatorios/frequencia-relatorio";
import {
  montarRelatorioConsolidado,
  type FormandoConsolidado,
  type MoradaMeta,
} from "@/lib/relatorios/consolidado-relatorio";
import { montarRelatorioJornada, type FormandoJornada } from "@/lib/relatorios/jornada-relatorio";
import { montarRelatorioCobertura, type FormandoCobertura } from "@/lib/relatorios/cobertura-relatorio";
import { montarRelatorioExecutivo } from "@/lib/relatorios/executivo-relatorio";

const etapaLabel = (n: NivelFormativo) => NIVEL_FORMATIVO_LABELS[n];
const hoje = new Date("2026-07-01T12:00:00Z");
const diasAtras = (d: number) => new Date(hoje.getTime() - d * 86_400_000).toISOString();
const dataAtras = (d: number) => new Date(hoje.getTime() - d * 86_400_000);

// Progresso que cumpre os requisitos de pre-discipulado (104/2/8) → "pronto".
const progPronto = (): ProgressoEtapa[] => [
  {
    nivel: "pre-discipulado",
    formacoesComunitariasRealizadas: 104,
    retirosComunitariosRealizados: 2,
    retirosPessoaisRealizados: 8,
  },
];

describe("montarRelatorioAcompanhamentoMorada (R1)", () => {
  it("classifica situação, acompanhamento e pareceres; resume a morada", () => {
    const formandos: FormandoAcomp[] = [
      { id: "a", nome: "Ana", nivelFormativo: "pre-discipulado", ativo: true, progressoEtapas: progPronto() },
      { id: "b", nome: "Bruno", nivelFormativo: "discipulado", ativo: true, progressoEtapas: [] },
      { id: "c", nome: "Carla", nivelFormativo: "discipulado", ativo: false }, // inativo: fora
    ];
    const presencas: PresencaAcomp[] = [
      // Bruno presença baixa → risco
      { formandoId: "b", data: diasAtras(5), presente: false, statusFormador: "ausente" },
      { formandoId: "b", data: diasAtras(10), presente: false, statusFormador: "ausente" },
      { formandoId: "b", data: diasAtras(15), presente: true, statusFormador: "presente" },
    ];
    const acomp = new Map<string, Date | null>([
      ["a", dataAtras(10)], // mensal → em dia
      ["b", null], // nunca
    ]);
    const pareceres = new Map([["a", { humana: "boa" as const, espiritual: "otima" as const }]]);

    const rel = montarRelatorioAcompanhamentoMorada(formandos, presencas, acomp, pareceres, 1, etapaLabel, hoje);

    expect(rel.resumo.totalMembros).toBe(2); // só ativos
    const ana = rel.membros.find((m) => m.nome === "Ana")!;
    const bruno = rel.membros.find((m) => m.nome === "Bruno")!;
    expect(ana.situacao).toBe("pronto");
    expect(ana.acompanhamentoStatus).toBe("em_dia");
    expect(ana.pareceres.humana).toBe("boa");
    expect(bruno.situacao).toBe("risco");
    expect(bruno.acompanhamentoStatus).toBe("nunca");
    expect(rel.resumo.prontos).toBe(1);
    expect(rel.resumo.emAtencao).toBe(1);
    expect(rel.resumo.semAcompanhamento).toBe(1);
  });
});

describe("montarRelatorioFrequencia (R2)", () => {
  it("monta a matriz, ordena encontros por data e exclui justificado do denominador", () => {
    const presencas: PresencaFreq[] = [
      { formandoId: "a", agendamentoId: "e2", data: diasAtras(5), titulo: "Mais recente", presente: true, statusFormador: "presente" },
      { formandoId: "a", agendamentoId: "e1", data: diasAtras(20), titulo: "Mais antigo", presente: false, statusFormador: "ausente" },
      { formandoId: "b", agendamentoId: "e1", data: diasAtras(20), titulo: "Mais antigo", presente: false, statusFormador: "justificado" },
      { formandoId: "b", agendamentoId: "e2", data: diasAtras(5), titulo: "Mais recente", presente: true, statusFormador: "presente" },
    ];
    const rel = montarRelatorioFrequencia([{ id: "a", nome: "Ana" }, { id: "b", nome: "Bruno" }], presencas);

    expect(rel.encontros.map((e) => e.titulo)).toEqual(["Mais antigo", "Mais recente"]);
    const ana = rel.linhas.find((l) => l.nome === "Ana")!;
    expect(ana.celulas).toEqual(["ausente", "presente"]);
    expect(ana.pct).toBe(50); // 1 presente / (1 presente + 1 ausente)
    const bruno = rel.linhas.find((l) => l.nome === "Bruno")!;
    expect(bruno.celulas).toEqual(["justificado", "presente"]);
    expect(bruno.pct).toBe(100); // justificado fora do denominador
    // Coluna "Mais antigo": Ana ausente, Bruno justificado → 0% (1 falta, 0 presente)
    expect(rel.encontros[0].pct).toBe(0);
    expect(rel.encontros[1].pct).toBe(100);
  });
});

describe("montarRelatorioConsolidado (R3)", () => {
  it("agrega por morada e soma totais", () => {
    const moradas: MoradaMeta[] = [
      { id: "m1", nome: "Efraim", formadorNome: "Hana", temPlano: true, temGrade: true },
      { id: "m2", nome: "Betânia", formadorNome: null, temPlano: false, temGrade: false },
    ];
    const formandos: FormandoConsolidado[] = [
      { id: "a", moradaId: "m1", nivelFormativo: "discipulado", ativo: true, progressoEtapas: [] },
      { id: "b", moradaId: "m1", nivelFormativo: "discipulado", ativo: false, progressoEtapas: [] },
      { id: "c", moradaId: "m2", nivelFormativo: "discipulado", ativo: true, progressoEtapas: [] },
    ];
    const presencas = [
      { formandoId: "a", data: diasAtras(5), presente: true, statusFormador: "presente" },
    ];
    const acomp = new Map<string, Date | null>([["a", dataAtras(10)], ["c", null]]);

    const rel = montarRelatorioConsolidado(moradas, formandos, presencas, acomp, 1, hoje);

    expect(rel.moradas.map((m) => m.nome)).toEqual(["Betânia", "Efraim"]); // ordenado pt-BR
    const efraim = rel.moradas.find((m) => m.nome === "Efraim")!;
    expect(efraim.ativos).toBe(1);
    expect(efraim.total).toBe(2);
    expect(efraim.coberturaEmDia).toBe(1);
    expect(rel.totais.ativos).toBe(2);
    expect(rel.totais.semPlano).toBe(1);
    expect(rel.totais.semGrade).toBe(1);
  });
});

describe("montarRelatorioJornada (R4)", () => {
  it("monta funil e classifica situação com a morada", () => {
    const formandos: FormandoJornada[] = [
      { id: "a", nome: "Ana", moradaNome: "Efraim", nivelFormativo: "pre-discipulado", ativo: true, progressoEtapas: progPronto() },
      { id: "b", nome: "Bruno", moradaNome: null, nivelFormativo: "discipulado", ativo: true, progressoEtapas: [] },
    ];
    const rel = montarRelatorioJornada(formandos, [], etapaLabel, hoje);
    expect(rel.resumo.totalAtivos).toBe(2);
    expect(rel.resumo.prontos).toBe(1);
    const ana = rel.membros.find((m) => m.nome === "Ana")!;
    expect(ana.situacao).toBe("pronto");
    expect(ana.moradaNome).toBe("Efraim");
    const bruno = rel.membros.find((m) => m.nome === "Bruno")!;
    expect(bruno.moradaNome).toBe("—");
    const preDisc = rel.funil.find((f) => f.etapaLabel === NIVEL_FORMATIVO_LABELS["pre-discipulado"])!;
    expect(preDisc.quantidade).toBe(1);
  });
});

describe("montarRelatorioCobertura (R5)", () => {
  it("conta estados da cadência e ordena pendentes (atrasado antes de nunca)", () => {
    const moradas = [{ id: "m1", nome: "Efraim", formadorNome: "Hana" }];
    const formandos: FormandoCobertura[] = [
      { id: "a", nome: "Ana", moradaId: "m1", ativo: true }, // atrasado
      { id: "b", nome: "Bruno", moradaId: "m1", ativo: true }, // nunca
      { id: "c", nome: "Carla", moradaId: "m1", ativo: true }, // em dia
      { id: "d", nome: "Davi", moradaId: "m1", ativo: false }, // fora (inativo)
    ];
    const acomp = new Map<string, Date | null>([
      ["a", dataAtras(90)], // mensal → muito atrasado
      ["b", null], // nunca
      ["c", dataAtras(5)], // em dia
    ]);
    const rel = montarRelatorioCobertura(moradas, formandos, acomp, 1, hoje);
    const efraim = rel.moradas[0];
    expect(efraim.total).toBe(3);
    expect(efraim.atrasado).toBe(1);
    expect(efraim.nunca).toBe(1);
    expect(efraim.emDia).toBe(1);
    expect(rel.pendentes.map((p) => p.status)).toEqual(["atrasado", "nunca"]);
    expect(rel.totais.total).toBe(3);
  });
});

describe("montarRelatorioExecutivo (R6)", () => {
  it("calcula retenção, presença global, progresso e crescimento por mês", () => {
    const months = [
      { yearMonth: "2026-06", label: "Jun" },
      { yearMonth: "2026-07", label: "Jul" },
    ];
    const rel = montarRelatorioExecutivo({
      ingressos: [new Date("2026-06-10"), new Date("2026-07-02"), new Date("2026-07-20")],
      totalFormandos: 10,
      formandosAtivos: 8,
      inativos: 2,
      presencaPorMorada: [{ total: 20, presentes: 15 }, { total: 10, presentes: 5 }],
      presencaPorMoradaMes: [
        { ym: "2026-06", total: 10, presentes: 8 },
        { ym: "2026-07", total: 20, presentes: 12 },
      ],
      formandosJornada: [
        { nivelFormativo: "pre-discipulado", progressoEtapas: progPronto() },
        { nivelFormativo: "discipulado", progressoEtapas: [] },
      ],
      totalMoradas: 2,
      totalFormadores: 3,
      months,
    });
    expect(rel.retencaoPct).toBe(80);
    expect(rel.taxaPresencaGlobal).toBe(67); // 20/30
    expect(rel.crescimentoMensal).toEqual([
      { mes: "Jun", novos: 1 },
      { mes: "Jul", novos: 2 },
    ]);
    expect(rel.presencaTendencia[0]).toEqual({ mes: "Jun", taxa: 80 });
    expect(rel.progressoMedioJornada).toBe(50); // (100 + 0)/2
  });
});
