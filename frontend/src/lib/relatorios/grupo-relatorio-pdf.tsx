import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  renderToBuffer,
  type DocumentProps,
} from "@react-pdf/renderer";
import { s, Header, Secao, Footer } from "@/lib/documentos-eclesiasticos/templates/base";
import type { GrupoRelatorio } from "./grupo-relatorio";

const t = StyleSheet.create({
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  kpiBox: { flex: 1, borderWidth: 0.5, borderColor: "#d1d5db", borderRadius: 3, padding: 8 },
  kpiLabel: { fontSize: 7, color: "#6b7280", marginBottom: 3 },
  kpiValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#111827" },
  funilRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  funilLabel: { fontSize: 9, color: "#374151" },
  funilVal: { fontSize: 9, color: "#6b7280" },
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#374151", paddingBottom: 3, marginBottom: 3 },
  tr: { flexDirection: "row", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" },
  thCell: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#374151" },
  tdCell: { fontSize: 8, color: "#111827" },
  cNome: { width: "30%", paddingRight: 4 },
  cEtapa: { width: "22%", paddingRight: 4 },
  cProg: { width: "16%", paddingRight: 4 },
  cPres: { width: "12%", paddingRight: 4 },
  cSit: { width: "20%" },
  risco: { color: "#b45309" },
});

export interface GrupoRelatorioPdfData {
  orgNome: string;
  grupoNome: string;
  formadorNome?: string | null;
  geradoEm: string; // data curta p/ o rodapé
  dataLonga: string; // subtítulo do cabeçalho
  relatorio: GrupoRelatorio;
}

function Doc({ data }: { data: GrupoRelatorioPdfData }) {
  const r = data.relatorio;
  const subtitulo = [data.grupoNome, data.formadorNome, data.dataLonga].filter(Boolean).join(" · ");
  return (
    <Document title={`Relatório — ${data.grupoNome}`}>
      <Page size="A4" style={s.page}>
        <Header orgNome={data.orgNome} titulo="Relatório do Grupo" subtitulo={subtitulo} />

        <Secao>Resumo</Secao>
        <View style={t.kpiRow}>
          <View style={t.kpiBox}>
            <Text style={t.kpiLabel}>Membros ativos</Text>
            <Text style={t.kpiValue}>{r.totalMembros}</Text>
          </View>
          <View style={t.kpiBox}>
            <Text style={t.kpiLabel}>Em risco</Text>
            <Text style={t.kpiValue}>{r.emRisco}</Text>
          </View>
          <View style={t.kpiBox}>
            <Text style={t.kpiLabel}>Presença média (90d)</Text>
            <Text style={t.kpiValue}>{r.presencaMedia !== null ? `${r.presencaMedia}%` : "—"}</Text>
          </View>
        </View>

        <Secao>Distribuição por etapa</Secao>
        {r.funil.map((f) => (
          <View key={f.etapaLabel} style={t.funilRow}>
            <Text style={t.funilLabel}>{f.etapaLabel}</Text>
            <Text style={t.funilVal}>
              {f.quantidade} · {f.percentual}%
            </Text>
          </View>
        ))}

        <Secao>Membros</Secao>
        <View style={t.th}>
          <Text style={[t.thCell, t.cNome]}>Nome</Text>
          <Text style={[t.thCell, t.cEtapa]}>Etapa</Text>
          <Text style={[t.thCell, t.cProg]}>Progresso</Text>
          <Text style={[t.thCell, t.cPres]}>Presença</Text>
          <Text style={[t.thCell, t.cSit]}>Situação</Text>
        </View>
        {r.membros.map((m, i) => (
          <View key={i} style={t.tr} wrap={false}>
            <Text style={[t.tdCell, t.cNome]}>{m.nome}</Text>
            <Text style={[t.tdCell, t.cEtapa]}>{m.etapaLabel}</Text>
            <Text style={[t.tdCell, t.cProg]}>
              {m.progressoDone}/{m.progressoTotal} ({m.progressoPct}%)
            </Text>
            <Text style={[t.tdCell, t.cPres]}>{m.presenca !== null ? `${m.presenca}%` : "—"}</Text>
            <Text style={m.emRisco ? [t.tdCell, t.cSit, t.risco] : [t.tdCell, t.cSit]}>
              {m.emRisco ? `Em risco: ${m.motivos.join("; ")}` : "Em dia"}
            </Text>
          </View>
        ))}

        <Footer orgNome={data.orgNome} geradoEm={data.geradoEm} />
      </Page>
    </Document>
  );
}

export async function renderGrupoRelatorioPdf(data: GrupoRelatorioPdfData): Promise<Buffer> {
  const element = React.createElement(Doc, { data }) as React.ReactElement<DocumentProps>;
  const arrayBuffer = await renderToBuffer(element);
  return Buffer.from(arrayBuffer);
}
