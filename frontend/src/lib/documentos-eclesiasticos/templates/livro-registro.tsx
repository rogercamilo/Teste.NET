import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  type DocumentProps,
} from "@react-pdf/renderer";
import { intParaRomano } from "@/lib/livro-registro";

const CLAY = "#B25433";
const TINTA = "#1a1a1a";
const REGUA = "#cbb89d";
const SEPIA = "#6b5d49";

const s = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingBottom: 54,
    paddingLeft: 64, // espaço extra à esquerda p/ a margem de fé pública
    paddingRight: 52,
    backgroundColor: "#ffffff",
    fontFamily: "Times-Roman",
    fontSize: 10.5,
    color: TINTA,
    lineHeight: 1.5,
  },
  fePublica: {
    position: "absolute",
    top: 36,
    bottom: 36,
    left: 48,
    width: 1.2,
    backgroundColor: CLAY,
    opacity: 0.5,
  },
  header: { alignItems: "center", marginBottom: 6 },
  org: { fontSize: 13, fontFamily: "Times-Bold", letterSpacing: 0.5, textAlign: "center" },
  titulo: { fontSize: 10, fontFamily: "Times-Bold", color: CLAY, letterSpacing: 1, marginTop: 2, textAlign: "center" },
  headerRule: { width: "100%", borderBottomWidth: 1.5, borderBottomColor: TINTA, marginTop: 5 },
  foliacao: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8.5,
    color: SEPIA,
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 8,
  },
  bloco: {
    borderWidth: 1,
    borderColor: REGUA,
    borderRadius: 3,
    backgroundColor: "#faf3ee",
    padding: 10,
    marginBottom: 12,
  },
  blocoTitulo: { fontSize: 11, fontFamily: "Times-Bold", textAlign: "center", letterSpacing: 1, marginBottom: 5 },
  termo: { paddingTop: 6, paddingBottom: 8, borderBottomWidth: 0.8, borderBottomColor: REGUA, borderStyle: "dashed" },
  termoHead: { flexDirection: "row", alignItems: "baseline", marginBottom: 3 },
  termoNum: { fontSize: 10.5, fontFamily: "Times-Bold", color: CLAY },
  termoTitulo: { fontSize: 10.5, fontFamily: "Times-Bold", marginLeft: 6, flex: 1 },
  tag: { fontSize: 7.5, color: SEPIA, borderWidth: 0.8, borderColor: REGUA, borderRadius: 2, paddingVertical: 1, paddingHorizontal: 4 },
  corpo: { fontSize: 10.5, textAlign: "justify", lineHeight: 1.55 },
  rubrica: { fontSize: 8.5, fontStyle: "italic", color: SEPIA, marginTop: 3 },
  meta: { fontSize: 9, color: SEPIA, marginTop: 4 },
  sigRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 18 },
  sigItem: { width: 150, alignItems: "center" },
  sigLine: { width: "100%", borderTopWidth: 0.8, borderTopColor: TINTA, marginBottom: 3 },
  sigLabel: { fontSize: 8.5, textAlign: "center" },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 64,
    right: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: REGUA,
    paddingTop: 4,
  },
  footerText: { fontSize: 8, color: SEPIA, letterSpacing: 0.5 },
});

export interface LivroPdfTermo {
  numero: number;
  tipoLabel: string;
  tag: string;
  corpoTexto: string;
  rubrica: string;
}

export interface LivroPdfData {
  orgNome: string;
  numeroTomo: number;
  totalFolhas: number;
  aberturaTexto: string;
  aberturaData: string;
  aberturaModerador: string;
  aberturaSecretario: string;
  encerramentoTexto?: string | null;
  encerramentoData?: string | null;
  termos: LivroPdfTermo[];
}

const TITULO = "Livro de Registro Geral da Jornada Vocacional";

function num4(n: number): string {
  return String(n).padStart(4, "0");
}

function LivroDocument({ dados }: { dados: LivroPdfData }) {
  const romano = intParaRomano(dados.numeroTomo);
  const primeiro = dados.termos.length ? dados.termos[0].numero : null;
  const ultimo = dados.termos.length ? dados.termos[dados.termos.length - 1].numero : null;
  const faixa =
    primeiro && ultimo
      ? primeiro === ultimo
        ? `Termo nº ${num4(primeiro)}`
        : `Termos nº ${num4(primeiro)} a ${num4(ultimo)}`
      : "Sem termos lavrados";

  return (
    <Document title={`${TITULO} — Tomo ${romano}`}>
      <Page size="A4" style={s.page} wrap>
        <View style={s.fePublica} fixed />

        <View style={s.header} fixed>
          <Text style={s.org}>{dados.orgNome.toUpperCase()}</Text>
          <Text style={s.titulo}>{TITULO.toUpperCase()}</Text>
          <View style={s.headerRule} />
          <View style={s.foliacao}>
            <Text>Tomo {romano}</Text>
            <Text>{faixa}</Text>
          </View>
        </View>

        {/* Termo de Abertura */}
        <View style={s.bloco} wrap={false}>
          <Text style={s.blocoTitulo}>TERMO DE ABERTURA</Text>
          <Text style={s.corpo}>{dados.aberturaTexto}</Text>
          <Text style={s.meta}>{dados.aberturaData}</Text>
          <View style={s.sigRow}>
            <View style={s.sigItem}>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>{dados.aberturaModerador}</Text>
              <Text style={s.sigLabel}>Moderador(a) Geral</Text>
            </View>
            <View style={s.sigItem}>
              <View style={s.sigLine} />
              <Text style={s.sigLabel}>{dados.aberturaSecretario}</Text>
              <Text style={s.sigLabel}>Secretário(a)</Text>
            </View>
          </View>
        </View>

        {/* Termos */}
        {dados.termos.map((t) => (
          <View key={t.numero} style={s.termo} wrap={false}>
            <View style={s.termoHead}>
              <Text style={s.termoNum}>Termo nº {num4(t.numero)}</Text>
              <Text style={s.termoTitulo}>— {t.tipoLabel}</Text>
              <Text style={s.tag}>{t.tag}</Text>
            </View>
            <Text style={s.corpo}>{t.corpoTexto}</Text>
            {t.rubrica ? <Text style={s.rubrica}>{t.rubrica}</Text> : null}
          </View>
        ))}

        {/* Termo de Encerramento */}
        {dados.encerramentoTexto ? (
          <View style={[s.bloco, { marginTop: 12 }]} wrap={false}>
            <Text style={s.blocoTitulo}>TERMO DE ENCERRAMENTO</Text>
            <Text style={s.corpo}>{dados.encerramentoTexto}</Text>
            {dados.encerramentoData ? <Text style={s.meta}>{dados.encerramentoData}</Text> : null}
            <View style={s.sigRow}>
              <View style={s.sigItem}>
                <View style={s.sigLine} />
                <Text style={s.sigLabel}>Moderador(a) Geral</Text>
              </View>
              <View style={s.sigItem}>
                <View style={s.sigLine} />
                <Text style={s.sigLabel}>Secretário(a)</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Tomo {romano}</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber }) => `Folha ${pageNumber}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export async function renderLivroPdf(dados: LivroPdfData): Promise<Buffer> {
  const element = React.createElement(LivroDocument, { dados }) as React.ReactElement<DocumentProps>;
  const arrayBuffer = await renderToBuffer(element);
  return Buffer.from(arrayBuffer);
}
