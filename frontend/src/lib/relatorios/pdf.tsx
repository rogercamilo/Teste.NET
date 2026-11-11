/**
 * Renderização PDF dos relatórios de acompanhamento.
 *
 * Um único `renderRelatorioPdf(carregado)` monta o documento certo a partir do
 * resultado tipado de `carregar.ts`, reusando o template eclesiástico base
 * (Header/Secao/Footer/estilos) — mesma identidade dos demais documentos oficiais.
 * Gotcha @react-pdf: arrays de `style` NÃO aceitam `undefined` (usar ternário que
 * retorna arrays completos).
 */

import React from "react";
import { Document, Page, View, Text, StyleSheet, renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { s, Header, Secao, Footer } from "@/lib/documentos-eclesiasticos/templates/base";
import {
  CADENCIA_ACOMPANHAMENTO_LABELS,
  CADENCIA_STATUS_LABELS,
} from "@/lib/acompanhamento-cadencia";
import { NOTA_ADESAO_LABELS, PERSPECTIVA_LABELS, type PerspectivaFormativa } from "@/types";
import { SITUACAO_LABELS, PRESENCA_CELULA_SIMBOLO } from "./tipos";
import type { RelatorioCarregado, RelatorioMeta } from "./carregar";

const t = StyleSheet.create({
  kpiRow: { flexDirection: "row", gap: 6, marginBottom: 6, flexWrap: "wrap" },
  kpiBox: { flexGrow: 1, flexBasis: "22%", borderWidth: 0.5, borderColor: "#d1d5db", borderRadius: 3, padding: 6 },
  kpiLabel: { fontSize: 7, color: "#6b7280", marginBottom: 2 },
  kpiValue: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#111827" },
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#374151", paddingBottom: 3, marginBottom: 3 },
  tr: { flexDirection: "row", paddingVertical: 2.5, borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  thCell: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#374151" },
  tdCell: { fontSize: 7.5, color: "#111827" },
  risco: { color: "#b45309" },
  pronto: { color: "#047857" },
  linhaFunil: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  funilLabel: { fontSize: 9, color: "#374151" },
  funilVal: { fontSize: 9, color: "#6b7280" },
});

function Kpis({ items }: { items: { label: string; valor: string | number }[] }) {
  return (
    <View style={t.kpiRow}>
      {items.map((k, i) => (
        <View key={i} style={t.kpiBox}>
          <Text style={t.kpiLabel}>{k.label}</Text>
          <Text style={t.kpiValue}>{k.valor}</Text>
        </View>
      ))}
    </View>
  );
}

function periodoTexto(meta: RelatorioMeta): string {
  const dias = meta.periodoDias;
  const label = dias === 30 ? "últimos 30 dias" : dias === 90 ? "últimos 90 dias" : dias === 180 ? "últimos 6 meses" : "último ano";
  return label;
}

function subtitulo(meta: RelatorioMeta): string {
  const hoje = new Date(meta.geradoEmISO).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  return [meta.moradaNome, `Período: ${periodoTexto(meta)}`, hoje].filter(Boolean).join(" · ");
}

function pareceresTexto(p: Partial<Record<PerspectivaFormativa, keyof typeof NOTA_ADESAO_LABELS>>): string {
  const partes = (Object.keys(PERSPECTIVA_LABELS) as PerspectivaFormativa[])
    .map((k) => (p[k] ? `${PERSPECTIVA_LABELS[k][0]}: ${NOTA_ADESAO_LABELS[p[k]!]}` : null))
    .filter(Boolean);
  return partes.length ? partes.join(" · ") : "—";
}

function Corpo({ carregado }: { carregado: RelatorioCarregado }) {
  const { meta, resultado } = carregado;
  if (!resultado) return <Text style={t.tdCell}>Sem dados para o período.</Text>;

  switch (resultado.slug) {
    case "acompanhamento-morada": {
      const r = resultado.dados;
      return (
        <>
          <Secao>Resumo</Secao>
          <Kpis
            items={[
              { label: "Membros ativos", valor: r.resumo.totalMembros },
              { label: "Em atenção", valor: r.resumo.emAtencao },
              { label: "Prontos p/ avançar", valor: r.resumo.prontos },
              { label: "Presença média", valor: r.resumo.presencaMedia !== null ? `${r.resumo.presencaMedia}%` : "—" },
              { label: "Sem acompanhamento", valor: r.resumo.semAcompanhamento },
            ]}
          />
          <Secao>Membros</Secao>
          <View style={t.th}>
            <Text style={[t.thCell, { width: "22%" }]}>Nome</Text>
            <Text style={[t.thCell, { width: "16%" }]}>Etapa</Text>
            <Text style={[t.thCell, { width: "12%" }]}>Progresso</Text>
            <Text style={[t.thCell, { width: "10%" }]}>Presença</Text>
            <Text style={[t.thCell, { width: "18%" }]}>Situação</Text>
            <Text style={[t.thCell, { width: "22%" }]}>Acompanhamento / Pareceres</Text>
          </View>
          {r.membros.map((m, i) => {
            const sitStyle = m.situacao === "risco" ? [t.tdCell, t.risco] : m.situacao === "pronto" ? [t.tdCell, t.pronto] : [t.tdCell];
            return (
              <View key={i} style={t.tr} wrap={false}>
                <Text style={[t.tdCell, { width: "22%" }]}>{m.nome}</Text>
                <Text style={[t.tdCell, { width: "16%" }]}>{m.etapaLabel}</Text>
                <Text style={[t.tdCell, { width: "12%" }]}>{m.progressoDone}/{m.progressoTotal} ({m.progressoPct}%)</Text>
                <Text style={[t.tdCell, { width: "10%" }]}>{m.presenca !== null ? `${m.presenca}%` : "—"}</Text>
                <Text style={[...sitStyle, { width: "18%" }]}>
                  {SITUACAO_LABELS[m.situacao]}{m.motivos.length ? ` (${m.motivos.join("; ")})` : ""}
                </Text>
                <Text style={[t.tdCell, { width: "22%" }]}>
                  {CADENCIA_STATUS_LABELS[m.acompanhamentoStatus]}{m.diasAtraso ? ` +${m.diasAtraso}d` : ""} · {pareceresTexto(m.pareceres)}
                </Text>
              </View>
            );
          })}
        </>
      );
    }
    case "frequencia": {
      const r = resultado.dados;
      return (
        <>
          <Secao>{`Frequência por formando (${r.totalEncontros} encontros no período)`}</Secao>
          <View style={t.th}>
            <Text style={[t.thCell, { width: "40%" }]}>Nome</Text>
            <Text style={[t.thCell, { width: "20%" }]}>Presenças</Text>
            <Text style={[t.thCell, { width: "20%" }]}>Faltas</Text>
            <Text style={[t.thCell, { width: "20%" }]}>Presença %</Text>
          </View>
          {r.linhas.map((l, i) => {
            const pres = l.celulas.filter((c) => c === "presente").length;
            const falt = l.celulas.filter((c) => c === "ausente").length;
            return (
              <View key={i} style={t.tr} wrap={false}>
                <Text style={[t.tdCell, { width: "40%" }]}>{l.nome}</Text>
                <Text style={[t.tdCell, { width: "20%" }]}>{pres}</Text>
                <Text style={[t.tdCell, { width: "20%" }]}>{falt}</Text>
                <Text style={[t.tdCell, { width: "20%" }]}>{l.pct !== null ? `${l.pct}%` : "—"}</Text>
              </View>
            );
          })}
          <Text style={[t.funilLabel, { marginTop: 6, fontSize: 7, color: "#6b7280" }]}>
            Legenda: {PRESENCA_CELULA_SIMBOLO.presente}=Presente · {PRESENCA_CELULA_SIMBOLO.ausente}=Falta · {PRESENCA_CELULA_SIMBOLO.justificado}=Falta justificada · {PRESENCA_CELULA_SIMBOLO.nao_marcado}=Não registrado. Justificada e não registrada ficam fora do cálculo de %.
          </Text>
        </>
      );
    }
    case "consolidado-moradas": {
      const r = resultado.dados;
      return (
        <>
          <Secao>Resumo da comunidade</Secao>
          <Kpis
            items={[
              { label: "Moradas", valor: r.totais.moradas },
              { label: "Ativos / Total", valor: `${r.totais.ativos}/${r.totais.total}` },
              { label: "Presença média", valor: r.totais.presencaMedia !== null ? `${r.totais.presencaMedia}%` : "—" },
              { label: "Em atenção", valor: r.totais.emAtencao },
              { label: "Acompanhados", valor: `${r.totais.coberturaEmDia}/${r.totais.coberturaTotal}` },
            ]}
          />
          <Secao>Por morada</Secao>
          <View style={t.th}>
            <Text style={[t.thCell, { width: "24%" }]}>Morada</Text>
            <Text style={[t.thCell, { width: "20%" }]}>Formador</Text>
            <Text style={[t.thCell, { width: "12%" }]}>Ativos</Text>
            <Text style={[t.thCell, { width: "14%" }]}>Presença</Text>
            <Text style={[t.thCell, { width: "14%" }]}>Em atenção</Text>
            <Text style={[t.thCell, { width: "16%" }]}>Acompanhados</Text>
          </View>
          {r.moradas.map((m, i) => (
            <View key={i} style={t.tr} wrap={false}>
              <Text style={[t.tdCell, { width: "24%" }]}>{m.nome}</Text>
              <Text style={[t.tdCell, { width: "20%" }]}>{m.formadorNome ?? "—"}</Text>
              <Text style={[t.tdCell, { width: "12%" }]}>{m.ativos}/{m.total}</Text>
              <Text style={[t.tdCell, { width: "14%" }]}>{m.presencaMedia !== null ? `${m.presencaMedia}%` : "—"}</Text>
              <Text style={m.emAtencao > 0 ? [t.tdCell, t.risco, { width: "14%" }] : [t.tdCell, { width: "14%" }]}>{m.emAtencao}</Text>
              <Text style={[t.tdCell, { width: "16%" }]}>{m.coberturaEmDia}/{m.coberturaTotal}</Text>
            </View>
          ))}
        </>
      );
    }
    case "jornada-comunidade": {
      const r = resultado.dados;
      return (
        <>
          <Secao>Resumo</Secao>
          <Kpis
            items={[
              { label: "Formandos ativos", valor: r.resumo.totalAtivos },
              { label: "Prontos p/ avançar", valor: r.resumo.prontos },
              { label: "Em atenção", valor: r.resumo.emAtencao },
            ]}
          />
          <Secao>Distribuição por etapa</Secao>
          {r.funil.map((f, i) => (
            <View key={i} style={t.linhaFunil}>
              <Text style={t.funilLabel}>{f.etapaLabel}</Text>
              <Text style={t.funilVal}>{f.quantidade} · {f.percentual}%</Text>
            </View>
          ))}
          <Secao>Formandos</Secao>
          <View style={t.th}>
            <Text style={[t.thCell, { width: "30%" }]}>Nome</Text>
            <Text style={[t.thCell, { width: "24%" }]}>Morada</Text>
            <Text style={[t.thCell, { width: "22%" }]}>Etapa</Text>
            <Text style={[t.thCell, { width: "24%" }]}>Situação</Text>
          </View>
          {r.membros.map((m, i) => {
            const sitStyle = m.situacao === "risco" ? [t.tdCell, t.risco] : m.situacao === "pronto" ? [t.tdCell, t.pronto] : [t.tdCell];
            return (
              <View key={i} style={t.tr} wrap={false}>
                <Text style={[t.tdCell, { width: "30%" }]}>{m.nome}</Text>
                <Text style={[t.tdCell, { width: "24%" }]}>{m.moradaNome}</Text>
                <Text style={[t.tdCell, { width: "22%" }]}>{m.etapaLabel} ({m.progressoPct}%)</Text>
                <Text style={[...sitStyle, { width: "24%" }]}>{SITUACAO_LABELS[m.situacao]}</Text>
              </View>
            );
          })}
        </>
      );
    }
    case "cobertura-acompanhamento": {
      const r = resultado.dados;
      return (
        <>
          <Secao>{`Resumo (cadência: ${CADENCIA_ACOMPANHAMENTO_LABELS[r.cadenciaMeses]})`}</Secao>
          <Kpis
            items={[
              { label: "Em dia", valor: r.totais.emDia },
              { label: "Vence em breve", valor: r.totais.venceEmBreve },
              { label: "Atrasados", valor: r.totais.atrasado },
              { label: "Nunca", valor: r.totais.nunca },
              { label: "Cobertura", valor: r.totais.pctCoberto !== null ? `${r.totais.pctCoberto}%` : "—" },
            ]}
          />
          <Secao>Por morada</Secao>
          <View style={t.th}>
            <Text style={[t.thCell, { width: "30%" }]}>Morada</Text>
            <Text style={[t.thCell, { width: "22%" }]}>Formador</Text>
            <Text style={[t.thCell, { width: "12%" }]}>Em dia</Text>
            <Text style={[t.thCell, { width: "12%" }]}>Atrasados</Text>
            <Text style={[t.thCell, { width: "12%" }]}>Nunca</Text>
            <Text style={[t.thCell, { width: "12%" }]}>Cobertura</Text>
          </View>
          {r.moradas.map((m, i) => (
            <View key={i} style={t.tr} wrap={false}>
              <Text style={[t.tdCell, { width: "30%" }]}>{m.nome}</Text>
              <Text style={[t.tdCell, { width: "22%" }]}>{m.formadorNome ?? "—"}</Text>
              <Text style={[t.tdCell, { width: "12%" }]}>{m.emDia}</Text>
              <Text style={m.atrasado > 0 ? [t.tdCell, t.risco, { width: "12%" }] : [t.tdCell, { width: "12%" }]}>{m.atrasado}</Text>
              <Text style={m.nunca > 0 ? [t.tdCell, t.risco, { width: "12%" }] : [t.tdCell, { width: "12%" }]}>{m.nunca}</Text>
              <Text style={[t.tdCell, { width: "12%" }]}>{m.pctCoberto !== null ? `${m.pctCoberto}%` : "—"}</Text>
            </View>
          ))}
        </>
      );
    }
    case "executivo": {
      const r = resultado.dados;
      return (
        <>
          <Secao>Indicadores executivos</Secao>
          <Kpis
            items={[
              { label: "Formandos ativos", valor: r.formandosAtivos },
              { label: "Retenção", valor: `${r.retencaoPct}%` },
              { label: "Presença global", valor: r.taxaPresencaGlobal !== null ? `${r.taxaPresencaGlobal}%` : "—" },
              { label: "Progresso médio", valor: `${r.progressoMedioJornada}%` },
              { label: "Moradas", valor: r.totalMoradas },
              { label: "Formadores", valor: r.totalFormadores },
              { label: "Inativos", valor: r.inativos },
            ]}
          />
          <Secao>Crescimento (ingressos por mês)</Secao>
          {r.crescimentoMensal.map((c, i) => (
            <View key={i} style={t.linhaFunil}>
              <Text style={t.funilLabel}>{c.mes}</Text>
              <Text style={t.funilVal}>{c.novos}</Text>
            </View>
          ))}
          <Secao>Tendência de presença</Secao>
          {r.presencaTendencia.map((c, i) => (
            <View key={i} style={t.linhaFunil}>
              <Text style={t.funilLabel}>{c.mes}</Text>
              <Text style={t.funilVal}>{c.taxa !== null ? `${c.taxa}%` : "—"}</Text>
            </View>
          ))}
        </>
      );
    }
  }
}

function Doc({ carregado }: { carregado: RelatorioCarregado }) {
  const { meta } = carregado;
  return (
    <Document title={`${meta.titulo} — ${meta.orgNome}`}>
      <Page size="A4" style={s.page}>
        <Header orgNome={meta.orgNome} titulo={meta.titulo} subtitulo={subtitulo(meta)} />
        <Corpo carregado={carregado} />
        <Footer orgNome={meta.orgNome} geradoEm={new Date(meta.geradoEmISO).toLocaleDateString("pt-BR")} />
      </Page>
    </Document>
  );
}

export async function renderRelatorioPdf(carregado: RelatorioCarregado): Promise<Buffer> {
  const element = React.createElement(Doc, { carregado }) as React.ReactElement<DocumentProps>;
  const arrayBuffer = await renderToBuffer(element);
  return Buffer.from(arrayBuffer);
}
