import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { s, Header, Secao, Footer } from "@/lib/documentos-eclesiasticos/templates/base";
import type { DocumentoBranding } from "@/lib/documentos-eclesiasticos/branding";
import {
  NOTA_ADESAO_LABELS,
  PERSPECTIVA_LABELS,
  RECOMENDACAO_LABELS,
  type NotaAdesao,
  type PerspectivaFormativa,
  type RecomendacaoEtapa,
} from "@/types";
import type { DossieFormando } from "./dossie-formando";

const t = StyleSheet.create({
  idRow: { flexDirection: "row", gap: 12, marginBottom: 6, alignItems: "flex-start" },
  foto: { width: 64, height: 80, borderRadius: 4, objectFit: "cover", borderWidth: 0.5, borderColor: "#d1d5db" },
  fotoFallback: {
    width: 64, height: 80, borderRadius: 4, borderWidth: 0.5, borderColor: "#d1d5db",
    backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center",
  },
  fotoInitials: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#9ca3af" },
  idNome: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#111827" },
  idLinha: { fontSize: 9, color: "#4b5563", marginTop: 2 },
  linha: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  linhaLabel: { fontSize: 9, color: "#374151" },
  linhaVal: { fontSize: 9, color: "#111827" },
  linhaValOk: { fontSize: 9, color: "#047857", fontFamily: "Helvetica-Bold" },
  sub: { fontSize: 8, color: "#6b7280", marginTop: 4, marginBottom: 2, fontFamily: "Helvetica-Bold" },
  chip: { fontSize: 8, color: "#374151", borderWidth: 0.5, borderColor: "#9ca3af", borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 2 },
  perspCol: { flex: 1 },
  perspLabel: { fontSize: 8, color: "#6b7280" },
  perspNota: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111827", marginTop: 1 },
  texto: { fontSize: 9.5, color: "#111827", lineHeight: 1.5, marginBottom: 4 },
  evidencia: { fontSize: 8.5, color: "#4b5563", lineHeight: 1.4, marginBottom: 3 },
  autoria: { fontSize: 8, color: "#6b7280", marginTop: 10, borderTopWidth: 0.5, borderTopColor: "#e5e7eb", paddingTop: 6 },
});

export interface RelatorioEtapaPdfData {
  orgNome: string;
  grupoNome: string;
  formadorNome?: string | null;
  geradoEm: string;
  dataLonga: string;
  etapaLabel: string;
  dossie: DossieFormando;
  relatorio: {
    avaliacaoHumana?: NotaAdesao | null;
    avaliacaoEspiritual?: NotaAdesao | null;
    avaliacaoComunitaria?: NotaAdesao | null;
    textoNarrativo?: string | null;
    pontosForteza?: string | null;
    desafios?: string | null;
    recomendacao?: RecomendacaoEtapa | null;
    textoRecomendacao?: string | null;
    autorNome?: string | null;
    finalizadoEm?: string | null;
  };
  fotoDataUrl: string | null;
  branding?: DocumentoBranding;
}

function iniciais(nome: string): string {
  return nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function notaLabel(n?: NotaAdesao | null): string {
  return n ? NOTA_ADESAO_LABELS[n] : "—";
}

/** Formata YYYY-MM-DD (ou ISO) como DD/MM/YYYY sem passar por Date (evita deslocar o dia em fuso negativo). */
function fmtDataBr(iso?: string | null): string {
  if (!iso) return "?";
  const p = iso.slice(0, 10).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

function Doc({ data }: { data: RelatorioEtapaPdfData }) {
  const d = data.dossie;
  const r = data.relatorio;
  const subtitulo = [data.grupoNome, data.formadorNome, data.dataLonga].filter(Boolean).join(" · ");

  const identLinha2 = [
    data.etapaLabel,
    d.identificacao.idade != null ? `${d.identificacao.idade} anos` : null,
    d.identificacao.estadoCivilLabel,
  ].filter(Boolean).join(" · ");

  return (
    <Document title={`Relatório de Etapa — ${d.identificacao.nome}`}>
      <Page size="A4" style={[s.page, { paddingTop: 40, paddingBottom: 46 }]}>
        <Header orgNome={data.orgNome} titulo="Relatório de Etapa" subtitulo={subtitulo} branding={data.branding} />

        {/* Identificação com foto */}
        <View style={t.idRow}>
          {data.fotoDataUrl ? (
            <Image src={data.fotoDataUrl} style={t.foto} />
          ) : (
            <View style={t.fotoFallback}>
              <Text style={t.fotoInitials}>{iniciais(d.identificacao.nome)}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={t.idNome}>{d.identificacao.nome}</Text>
            <Text style={t.idLinha}>{identLinha2}</Text>
            <Text style={t.idLinha}>{data.grupoNome}</Text>
          </View>
        </View>

        {/* Presença na etapa */}
        <Secao>Presença na etapa</Secao>
        <View style={t.linha}>
          <Text style={[t.linhaLabel, { fontFamily: "Helvetica-Bold" }]}>Presença total</Text>
          <Text style={t.linhaVal}>
            {d.presencaTotal.pct != null ? `${d.presencaTotal.pct}%` : "—"} · {d.presencaTotal.presentes}/{d.presencaTotal.total}
          </Text>
        </View>
        {d.presencaPorCategoria.map((c) => (
          <View key={c.chave} style={t.linha}>
            <Text style={t.linhaLabel}>{c.label}</Text>
            <Text style={t.linhaVal}>
              {c.contagemSimples
                ? `${c.presentes}/${c.total}`
                : `${c.pct != null ? `${c.pct}%` : "—"} · ${c.presentes}/${c.total}`}
            </Text>
          </View>
        ))}

        {/* Situação na etapa */}
        <Secao>Situação na etapa</Secao>
        <View style={t.linha}>
          <Text style={t.linhaLabel}>Formações comunitárias</Text>
          <Text style={d.requisitos.formacoesComunitarias.done >= d.requisitos.formacoesComunitarias.req ? t.linhaValOk : t.linhaVal}>
            {d.requisitos.formacoesComunitarias.done}/{d.requisitos.formacoesComunitarias.req}
          </Text>
        </View>
        <View style={t.linha}>
          <Text style={t.linhaLabel}>Retiros comunitários</Text>
          <Text style={d.requisitos.retirosComunitarios.done >= d.requisitos.retirosComunitarios.req ? t.linhaValOk : t.linhaVal}>
            {d.requisitos.retirosComunitarios.done}/{d.requisitos.retirosComunitarios.req}
          </Text>
        </View>
        <View style={t.linha}>
          <Text style={t.linhaLabel}>Retiros pessoais</Text>
          <Text style={d.requisitos.retirosPessoais.done >= d.requisitos.retirosPessoais.req ? t.linhaValOk : t.linhaVal}>
            {d.requisitos.retirosPessoais.done}/{d.requisitos.retirosPessoais.req}
          </Text>
        </View>
        <View style={t.chipRow}>
          <Text style={t.chip}>{d.prontoParaAvancar ? "Requisitos cumpridos" : "Requisitos incompletos"}</Text>
          <Text style={t.chip}>Acompanhamento 1:1: {d.acompanhamento1a1.realizados} realizado{d.acompanhamento1a1.realizados === 1 ? "" : "s"}</Text>
        </View>

        {/* Licenças */}
        <Secao>Licenças de afastamento</Secao>
        {d.totalLicencas === 0 ? (
          <Text style={t.texto}>Nenhuma licença de afastamento registrada no período.</Text>
        ) : (
          d.licencas.map((l, i) => (
            <View key={i} style={t.linha}>
              <Text style={t.linhaLabel}>
                {fmtDataBr(l.inicio)} — {l.fim ? fmtDataBr(l.fim) : "em aberto"}
                {l.motivo ? ` · ${l.motivo}` : ""}
              </Text>
              <Text style={t.linhaVal}>{l.dias != null ? `${l.dias} dia${l.dias === 1 ? "" : "s"}` : "—"}</Text>
            </View>
          ))
        )}

        {/* Fidelidade aos compromissos */}
        <Secao>Fidelidade aos compromissos</Secao>
        <View style={t.linha}>
          <Text style={t.linhaLabel}>Parecer consolidado (perspectivas)</Text>
          <Text style={t.linhaVal}>
            {d.fidelidade.banda ? NOTA_ADESAO_LABELS[d.fidelidade.banda] : "—"}
            {d.fidelidade.avaliadas > 0 ? ` · ${d.fidelidade.avaliadas} de 3` : ""}
          </Text>
        </View>
        {d.fidelidade.evidencias.length > 0 && (
          <>
            <Text style={t.sub}>Pareceres do formador</Text>
            {d.fidelidade.evidencias.map((e, i) => (
              <Text key={i} style={t.evidencia}>• {e.texto}</Text>
            ))}
          </>
        )}

        {/* Avaliação por perspectiva */}
        <Secao>Avaliação por perspectiva</Secao>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 2 }}>
          {(["humana", "espiritual", "comunitaria"] as PerspectivaFormativa[]).map((p) => {
            const nota = p === "humana" ? r.avaliacaoHumana : p === "espiritual" ? r.avaliacaoEspiritual : r.avaliacaoComunitaria;
            return (
              <View key={p} style={t.perspCol}>
                <Text style={t.perspLabel}>{PERSPECTIVA_LABELS[p]}</Text>
                <Text style={t.perspNota}>{notaLabel(nota)}</Text>
              </View>
            );
          })}
        </View>

        {/* Narrativa */}
        {r.textoNarrativo ? (
          <>
            <Secao>Narrativa da etapa</Secao>
            <Text style={t.texto}>{r.textoNarrativo}</Text>
          </>
        ) : null}
        {r.pontosForteza ? (
          <>
            <Text style={t.sub}>Pontos de fortaleza</Text>
            <Text style={t.texto}>{r.pontosForteza}</Text>
          </>
        ) : null}
        {r.desafios ? (
          <>
            <Text style={t.sub}>Desafios a trabalhar</Text>
            <Text style={t.texto}>{r.desafios}</Text>
          </>
        ) : null}

        {/* Recomendação */}
        <Secao>Recomendação</Secao>
        <Text style={t.texto}>
          {r.recomendacao ? RECOMENDACAO_LABELS[r.recomendacao] : "—"}
          {r.textoRecomendacao ? `. ${r.textoRecomendacao}` : ""}
        </Text>

        {/* Autoria */}
        <Text style={t.autoria}>
          Parecer{r.finalizadoEm ? " finalizado" : ""}
          {r.autorNome ? ` por ${r.autorNome}` : ""}
          {r.finalizadoEm ? ` em ${r.finalizadoEm}` : ""}.
        </Text>

        <Footer orgNome={data.orgNome} geradoEm={data.geradoEm} />
      </Page>
    </Document>
  );
}

export async function renderRelatorioEtapaPdf(data: RelatorioEtapaPdfData): Promise<Buffer> {
  return renderToBuffer(<Doc data={data} />);
}
