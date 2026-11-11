/**
 * Exportação CSV dos relatórios (Excel pt-BR: BOM + `;` via `toCsv`).
 * Um `relatorioParaCsv(carregado)` por slug — mesmos dados da tela e do PDF.
 */

import { CADENCIA_STATUS_LABELS } from "@/lib/acompanhamento-cadencia";
import { NOTA_ADESAO_LABELS, PERSPECTIVA_LABELS, type PerspectivaFormativa } from "@/types";
import { SITUACAO_LABELS, PRESENCA_CELULA_SIMBOLO } from "./tipos";
import { toCsv } from "./csv";
import type { RelatorioCarregado } from "./carregar";

type Pareceres = Partial<Record<PerspectivaFormativa, keyof typeof NOTA_ADESAO_LABELS>>;
function pareceresTexto(p: Pareceres): string {
  return (Object.keys(PERSPECTIVA_LABELS) as PerspectivaFormativa[])
    .map((k) => (p[k] ? `${PERSPECTIVA_LABELS[k]}: ${NOTA_ADESAO_LABELS[p[k]!]}` : null))
    .filter(Boolean)
    .join(" · ");
}

export function relatorioParaCsv(carregado: RelatorioCarregado): string {
  const { resultado } = carregado;
  if (!resultado) return toCsv(["Sem dados"], []);

  switch (resultado.slug) {
    case "acompanhamento-morada": {
      const r = resultado.dados;
      return toCsv(
        ["Nome", "Etapa", "Progresso (feitas)", "Progresso (requerido)", "Progresso (%)", "Presença (%)", "Situação", "Motivos", "Acompanhamento 1:1", "Dias de atraso", "Pareceres"],
        r.membros.map((m) => [
          m.nome,
          m.etapaLabel,
          m.progressoDone,
          m.progressoTotal,
          m.progressoPct,
          m.presenca ?? "",
          SITUACAO_LABELS[m.situacao],
          m.motivos.join("; "),
          CADENCIA_STATUS_LABELS[m.acompanhamentoStatus],
          m.diasAtraso || "",
          pareceresTexto(m.pareceres),
        ]),
      );
    }
    case "frequencia": {
      const r = resultado.dados;
      const cols = r.encontros.map((e) => new Date(e.data).toLocaleDateString("pt-BR"));
      return toCsv(
        ["Nome", ...cols, "Presença (%)"],
        r.linhas.map((l) => [l.nome, ...l.celulas.map((c) => PRESENCA_CELULA_SIMBOLO[c]), l.pct ?? ""]),
      );
    }
    case "consolidado-moradas": {
      const r = resultado.dados;
      return toCsv(
        ["Morada", "Formador", "Ativos", "Total", "Presença média (%)", "Em atenção", "Acompanhados (em dia)", "Acompanhados (total)", "Tem plano", "Tem grade"],
        r.moradas.map((m) => [
          m.nome,
          m.formadorNome ?? "",
          m.ativos,
          m.total,
          m.presencaMedia ?? "",
          m.emAtencao,
          m.coberturaEmDia,
          m.coberturaTotal,
          m.temPlano ? "Sim" : "Não",
          m.temGrade ? "Sim" : "Não",
        ]),
      );
    }
    case "jornada-comunidade": {
      const r = resultado.dados;
      return toCsv(
        ["Nome", "Morada", "Etapa", "Progresso (%)", "Situação", "Motivos"],
        r.membros.map((m) => [m.nome, m.moradaNome, m.etapaLabel, m.progressoPct, SITUACAO_LABELS[m.situacao], m.motivos.join("; ")]),
      );
    }
    case "cobertura-acompanhamento": {
      const r = resultado.dados;
      return toCsv(
        ["Morada", "Formador", "Em dia", "Vence em breve", "Atrasados", "Nunca", "Total", "Cobertura (%)"],
        r.moradas.map((m) => [m.nome, m.formadorNome ?? "", m.emDia, m.venceEmBreve, m.atrasado, m.nunca, m.total, m.pctCoberto ?? ""]),
      );
    }
    case "executivo": {
      const r = resultado.dados;
      const linhas: (string | number)[][] = [
        ["Formandos ativos", r.formandosAtivos],
        ["Total de formandos", r.totalFormandos],
        ["Inativos", r.inativos],
        ["Retenção (%)", r.retencaoPct],
        ["Presença global (%)", r.taxaPresencaGlobal ?? ""],
        ["Progresso médio da jornada (%)", r.progressoMedioJornada],
        ["Moradas", r.totalMoradas],
        ["Formadores", r.totalFormadores],
        ...r.crescimentoMensal.map((c) => [`Ingressos ${c.mes}`, c.novos]),
        ...r.presencaTendencia.map((c) => [`Presença ${c.mes} (%)`, c.taxa ?? ""]),
      ];
      return toCsv(["Indicador", "Valor"], linhas);
    }
  }
}
