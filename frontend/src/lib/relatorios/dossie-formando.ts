/**
 * Dossiê do formando para o Relatório de Etapa (motor puro, testável).
 *
 * Consolida, para a ETAPA ATUAL, o lastro factual do discernimento de passagem:
 * presença total e por categoria de atividade, requisitos cumpridos, prontidão,
 * acompanhamento 1:1, licenças no período e uma leitura de "fidelidade aos
 * compromissos" derivada das avaliações + pareceres. Também devolve as notas por
 * perspectiva sugeridas da ficha (pré-preenchimento) e os dados de identificação.
 *
 * Reaproveita os motores únicos (`progressoNaEtapa`, `avaliarRiscoFormando`,
 * `prontoParaAvancar`, `avaliarCadenciaAcompanhamento`, `consolidarPerspectivas`)
 * — a MESMA régua da ficha/dashboard, para o relatório jamais divergir.
 */

import {
  REQUISITOS_ETAPAS,
  ESTADO_CIVIL_LABELS,
  type EstadoCivil,
  type NivelFormativo,
  type NotaAdesao,
  type PerspectivaFormativa,
  type ProgressoEtapa,
} from "@/types";
import { idadeEmAnos } from "@/lib/utils";
import { progressoNaEtapa, avaliarRiscoFormando } from "@/lib/jornada-progresso";
import { prontoParaAvancar } from "@/lib/relatorios/acompanhamento-morada-relatorio";
import {
  avaliarCadenciaAcompanhamento,
  normalizarCadencia,
  type StatusCadencia,
} from "@/lib/acompanhamento-cadencia";
import {
  consolidarPerspectivas,
  notasMaisRecentesPorPerspectiva,
  type AvaliacaoPerspectivaInput,
} from "@/lib/parecer-consolidado";

// ── Entradas ────────────────────────────────────────────────────────────────

export interface DossieFormandoInput {
  id: string;
  nome: string;
  nivelFormativo: NivelFormativo;
  dataNascimento?: string | null;
  estadoCivil: EstadoCivil;
  foto?: string | null;
  progressoEtapas?: ProgressoEtapa[];
}

export interface PresencaDossie {
  formandoId: string;
  agendamentoId: string;
  data: string; // ISO
  presente: boolean;
  statusFormador?: string | null;
  nivelFormativo: NivelFormativo;
}

export interface EventoDossie {
  tipo: string; // avaliacao-adesao | licenca | ...
  perspectiva?: PerspectivaFormativa | null;
  notaAdesao?: NotaAdesao | null;
  textoAvaliacao?: string | null;
  dataInicioLicenca?: string | null;
  dataFimLicenca?: string | null;
  motivo?: string | null;
  criadoEm: string; // ISO
}

export interface EvidenciaParecer {
  texto: string;
  data: string; // ISO
}

// ── Saída ───────────────────────────────────────────────────────────────────

export interface ContagemPresenca {
  presentes: number;
  total: number;
  pct: number | null;
}

export interface CategoriaPresenca extends ContagemPresenca {
  chave: string;
  label: string;
  /** Linha de contagem simples (realizados/requerido) em vez de % de presença. */
  contagemSimples?: boolean;
}

export interface LicencaPeriodo {
  inicio: string | null;
  fim: string | null;
  dias: number | null;
  motivo: string | null;
}

export interface DossieFormando {
  identificacao: {
    nome: string;
    idade: number | null;
    estadoCivilLabel: string;
    fotoKey: string | null;
  };
  etapa: NivelFormativo;
  requisitos: {
    formacoesComunitarias: { done: number; req: number };
    retirosComunitarios: { done: number; req: number };
    retirosPessoais: { done: number; req: number };
  };
  progressoPct: number;
  prontoParaAvancar: boolean;
  situacao: "risco" | "pronto" | "em_dia";
  motivos: string[];
  presencaTotal: ContagemPresenca;
  presencaPorCategoria: CategoriaPresenca[];
  acompanhamento1a1: {
    realizados: number;
    status: StatusCadencia;
    diasAtraso: number;
  };
  licencas: LicencaPeriodo[];
  totalLicencas: number;
  fidelidade: {
    banda: NotaAdesao | null;
    avaliadas: number;
    presencaPct: number | null;
    pronto: boolean;
    evidencias: EvidenciaParecer[];
  };
  perspectivasSugeridas: Partial<Record<PerspectivaFormativa, NotaAdesao>>;
}

// ── Categorização de presença por tipo de evento ─────────────────────────────

const CATEGORIA_POR_TIPO_EVENTO: Record<string, { chave: string; label: string }> = {
  formacao: { chave: "encontros", label: "Encontros formativos" },
  formacao_complementar: { chave: "encontros", label: "Encontros formativos" },
  retiro: { chave: "retiros_comunitarios", label: "Retiros comunitários" },
  convocacao: { chave: "convocacoes", label: "Convocações gerais" },
  reuniao: { chave: "reunioes", label: "Reuniões/assembleias" },
  outro: { chave: "outros", label: "Outras atividades" },
};

const CATEGORIA_OUTROS = { chave: "outros", label: "Outras atividades" };

/**
 * Conta presença por uma régua consistente com o restante do app (`taxaPresenca90d`):
 * "presente"/"ausente" entram no denominador; "justificado" fica de fora; sem
 * estado explícito (null/undefined) cai no booleano `presente` (retrocompat).
 */
function contarPresenca(regs: PresencaDossie[]): ContagemPresenca {
  let total = 0;
  let presentes = 0;
  for (const r of regs) {
    const st = r.statusFormador;
    if (st === "presente") {
      total++;
      presentes++;
    } else if (st === "ausente") {
      total++;
    } else if (st === "justificado") {
      // fora do denominador
    } else {
      total++;
      if (r.presente) presentes++;
    }
  }
  return { presentes, total, pct: total > 0 ? Math.round((presentes / total) * 100) : null };
}

// ── Motor ─────────────────────────────────────────────────────────────────────

export interface MontarDossieArgs {
  formando: DossieFormandoInput;
  presencas: PresencaDossie[];
  tipoEventoPorAgendamento: Map<string, string>;
  acompanhamentoDatas: string[]; // ISO — todos os 1:1 do formando
  eventos: EventoDossie[];
  evidenciasParecer: EvidenciaParecer[];
  cadenciaMeses: number | null | undefined;
  hoje?: Date;
}

export function montarDossieFormando({
  formando,
  presencas,
  tipoEventoPorAgendamento,
  acompanhamentoDatas,
  eventos,
  evidenciasParecer,
  cadenciaMeses,
  hoje = new Date(),
}: MontarDossieArgs): DossieFormando {
  const nivel = formando.nivelFormativo;
  const agora = hoje.getTime();

  // Presenças DA ETAPA (mesmo nível), já ocorridas.
  const regsEtapa = presencas.filter(
    (p) =>
      p.formandoId === formando.id &&
      p.nivelFormativo === nivel &&
      new Date(p.data).getTime() <= agora
  );

  // Total consolidado dos eventos coletivos.
  const presencaTotal = contarPresenca(regsEtapa);

  // Por categoria (via tipoEvento do agendamento).
  const porChave = new Map<string, { label: string; regs: PresencaDossie[] }>();
  for (const r of regsEtapa) {
    const tipoEvento = tipoEventoPorAgendamento.get(r.agendamentoId);
    const cat = (tipoEvento && CATEGORIA_POR_TIPO_EVENTO[tipoEvento]) || CATEGORIA_OUTROS;
    const entry = porChave.get(cat.chave) ?? { label: cat.label, regs: [] };
    entry.regs.push(r);
    porChave.set(cat.chave, entry);
  }
  const presencaPorCategoria: CategoriaPresenca[] = [...porChave.entries()].map(
    ([chave, { label, regs }]) => ({ chave, label, ...contarPresenca(regs) })
  );

  // Requisitos da etapa.
  const req = REQUISITOS_ETAPAS[nivel];
  const prog = (formando.progressoEtapas ?? []).find((p) => p.nivel === nivel);
  const requisitos = {
    formacoesComunitarias: { done: prog?.formacoesComunitariasRealizadas ?? 0, req: req.formacoesComunitarias },
    retirosComunitarios: { done: prog?.retirosComunitariosRealizados ?? 0, req: req.retirosComunitarios },
    retirosPessoais: { done: prog?.retirosPessoaisRealizados ?? 0, req: req.retirosPessoais },
  };

  // Retiros pessoais entram no bloco de presença como contagem simples (são
  // individuais — não há "chamada" coletiva).
  if (req.retirosPessoais > 0 || requisitos.retirosPessoais.done > 0) {
    presencaPorCategoria.push({
      chave: "retiros_pessoais",
      label: "Retiros pessoais (individuais)",
      presentes: requisitos.retirosPessoais.done,
      total: req.retirosPessoais,
      pct: req.retirosPessoais > 0 ? Math.round((requisitos.retirosPessoais.done / req.retirosPessoais) * 100) : null,
      contagemSimples: true,
    });
  }

  const { pct: progressoPct } = progressoNaEtapa(nivel, formando.progressoEtapas);
  const pronto = prontoParaAvancar(nivel, formando.progressoEtapas);
  const presDoFormando = regsEtapa.map((p) => ({ formandoId: p.formandoId, data: p.data, presente: p.presente }));
  const risco = avaliarRiscoFormando(
    { nivelFormativo: nivel, progressoEtapas: formando.progressoEtapas },
    presDoFormando,
    hoje,
    formando.id
  );
  const situacao: DossieFormando["situacao"] = risco.emRisco ? "risco" : pronto ? "pronto" : "em_dia";

  // Acompanhamento 1:1 — realizados na etapa (desde iniciouEm, se houver) + cadência.
  const iniciouEm = prog?.iniciouEm ? new Date(prog.iniciouEm).getTime() : null;
  const datasAcomp = acompanhamentoDatas
    .map((d) => new Date(d))
    .filter((d) => !Number.isNaN(d.getTime()) && d.getTime() <= agora && (iniciouEm === null || d.getTime() >= iniciouEm));
  const realizados1a1 = datasAcomp.length;
  const ultimo1a1 = datasAcomp.length
    ? datasAcomp.reduce((a, b) => (a.getTime() >= b.getTime() ? a : b))
    : null;
  const cad = avaliarCadenciaAcompanhamento(normalizarCadencia(cadenciaMeses), ultimo1a1, hoje);

  // Licenças lavradas no histórico (EventoFormando tipo licenca).
  const licencas: LicencaPeriodo[] = eventos
    .filter((e) => e.tipo === "licenca")
    .map((e) => {
      const inicio = e.dataInicioLicenca ?? null;
      const fim = e.dataFimLicenca ?? null;
      let dias: number | null = null;
      if (inicio && fim) {
        const d = Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 86_400_000);
        dias = d >= 0 ? d : null;
      }
      return { inicio, fim, dias, motivo: e.motivo ?? null };
    })
    .sort((a, b) => (a.inicio ?? "").localeCompare(b.inicio ?? ""));

  // Fidelidade aos compromissos: leitura consolidada (avaliações) + presença +
  // prontidão, com as evidências textuais dos pareceres do formador.
  const avaisPerspectiva: AvaliacaoPerspectivaInput[] = eventos.map((e) => ({
    tipo: e.tipo,
    perspectiva: e.perspectiva,
    notaAdesao: e.notaAdesao,
    criadoEm: e.criadoEm,
  }));
  const consolidado = consolidarPerspectivas(avaisPerspectiva);

  return {
    identificacao: {
      nome: formando.nome,
      idade: idadeEmAnos(formando.dataNascimento),
      estadoCivilLabel: ESTADO_CIVIL_LABELS[formando.estadoCivil] ?? formando.estadoCivil,
      fotoKey: formando.foto ?? null,
    },
    etapa: nivel,
    requisitos,
    progressoPct,
    prontoParaAvancar: pronto,
    situacao,
    motivos: risco.motivos,
    presencaTotal,
    presencaPorCategoria,
    acompanhamento1a1: { realizados: realizados1a1, status: cad.status, diasAtraso: cad.diasAtraso },
    licencas,
    totalLicencas: licencas.length,
    fidelidade: {
      banda: consolidado?.nota ?? null,
      avaliadas: consolidado?.avaliadas ?? 0,
      presencaPct: presencaTotal.pct,
      pronto,
      evidencias: evidenciasParecer.slice(0, 6),
    },
    perspectivasSugeridas: notasMaisRecentesPorPerspectiva(avaisPerspectiva),
  };
}
