import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { s, Header, Footer } from "@/lib/documentos-eclesiasticos/templates/base";
import type { DocumentoBranding } from "@/lib/documentos-eclesiasticos/branding";

const t = StyleSheet.create({
  wrap: { alignItems: "center", marginTop: 24 },
  foto: { width: 180, height: 225, borderRadius: 8, objectFit: "cover", borderWidth: 1, borderColor: "#d1d5db" },
  fotoFallback: {
    width: 180, height: 225, borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db",
    backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center",
  },
  fotoInitials: { fontSize: 56, fontFamily: "Helvetica-Bold", color: "#9ca3af" },
  nome: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#111827", marginTop: 20, textAlign: "center" },
  campoRow: { flexDirection: "row", marginTop: 14 },
  campoLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#6b7280", width: 120, textAlign: "right", marginRight: 10 },
  campoVal: { fontSize: 11, color: "#111827" },
});

export interface IdentificacaoVisualPdfData {
  orgNome: string;
  grupoNome: string;
  etapaLabel: string;
  geradoEm: string;
  dataLonga: string;
  nome: string;
  idade: number | null;
  estadoCivilLabel: string;
  fotoDataUrl: string | null;
  branding?: DocumentoBranding;
}

function iniciais(nome: string): string {
  return nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function Doc({ data }: { data: IdentificacaoVisualPdfData }) {
  return (
    <Document title={`Identificação — ${data.nome}`}>
      <Page size="A4" style={s.page}>
        <Header orgNome={data.orgNome} titulo="Identificação" subtitulo={data.dataLonga} branding={data.branding} />

        <View style={t.wrap}>
          {data.fotoDataUrl ? (
            <Image src={data.fotoDataUrl} style={t.foto} />
          ) : (
            <View style={t.fotoFallback}>
              <Text style={t.fotoInitials}>{iniciais(data.nome)}</Text>
            </View>
          )}
          <Text style={t.nome}>{data.nome}</Text>

          <View style={t.campoRow}>
            <Text style={t.campoLabel}>Idade</Text>
            <Text style={t.campoVal}>{data.idade != null ? `${data.idade} anos` : "—"}</Text>
          </View>
          <View style={t.campoRow}>
            <Text style={t.campoLabel}>Estado civil</Text>
            <Text style={t.campoVal}>{data.estadoCivilLabel || "—"}</Text>
          </View>
          <View style={t.campoRow}>
            <Text style={t.campoLabel}>Etapa</Text>
            <Text style={t.campoVal}>{data.etapaLabel}</Text>
          </View>
          <View style={t.campoRow}>
            <Text style={t.campoLabel}>Grupo</Text>
            <Text style={t.campoVal}>{data.grupoNome}</Text>
          </View>
        </View>

        <Footer orgNome={data.orgNome} geradoEm={data.geradoEm} />
      </Page>
    </Document>
  );
}

export async function renderIdentificacaoVisualPdf(data: IdentificacaoVisualPdfData): Promise<Buffer> {
  return renderToBuffer(<Doc data={data} />);
}
