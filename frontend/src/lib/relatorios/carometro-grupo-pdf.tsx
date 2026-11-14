import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { s, Header, Footer } from "@/lib/documentos-eclesiasticos/templates/base";
import type { DocumentoBranding } from "@/lib/documentos-eclesiasticos/branding";

const t = StyleSheet.create({
  intro: { fontSize: 9, color: "#6b7280", textAlign: "center", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: "33.33%",
    paddingHorizontal: 6,
    paddingVertical: 10,
    alignItems: "center",
  },
  foto: { width: 104, height: 130, borderRadius: 6, objectFit: "cover", borderWidth: 1, borderColor: "#d1d5db" },
  fotoFallback: {
    width: 104, height: 130, borderRadius: 6, borderWidth: 1, borderColor: "#d1d5db",
    backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center",
  },
  fotoInitials: { fontSize: 34, fontFamily: "Helvetica-Bold", color: "#9ca3af" },
  nome: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#111827", marginTop: 8, textAlign: "center" },
  dado: { fontSize: 8.5, color: "#4b5563", marginTop: 2, textAlign: "center" },
  etapa: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#1e3a5f", marginTop: 2, textAlign: "center" },
});

export interface CarometroFormandoPdf {
  nome: string;
  idade: number | null;
  estadoCivilLabel: string;
  etapaLabel: string;
  fotoDataUrl: string | null;
}

export interface CarometroGrupoPdfData {
  orgNome: string;
  grupoNome: string;
  geradoEm: string;
  dataLonga: string;
  formandos: CarometroFormandoPdf[];
  branding?: DocumentoBranding;
}

function iniciais(nome: string): string {
  return nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function Celula({ f }: { f: CarometroFormandoPdf }) {
  return (
    <View style={t.cell} wrap={false}>
      {f.fotoDataUrl ? (
        <Image src={f.fotoDataUrl} style={t.foto} />
      ) : (
        <View style={t.fotoFallback}>
          <Text style={t.fotoInitials}>{iniciais(f.nome)}</Text>
        </View>
      )}
      <Text style={t.nome}>{f.nome}</Text>
      <Text style={t.dado}>{f.idade != null ? `${f.idade} anos` : "Idade —"}</Text>
      <Text style={t.dado}>{f.estadoCivilLabel || "—"}</Text>
      <Text style={t.etapa}>{f.etapaLabel}</Text>
    </View>
  );
}

function Doc({ data }: { data: CarometroGrupoPdfData }) {
  const total = data.formandos.length;
  return (
    <Document title={`Carômetro — ${data.grupoNome}`}>
      <Page size="A4" style={s.page}>
        <Header
          orgNome={data.orgNome}
          titulo={`Carômetro — ${data.grupoNome}`}
          subtitulo={data.dataLonga}
          branding={data.branding}
        />
        <Text style={t.intro}>
          Reconhecimento visual da turma · {total} {total === 1 ? "formando" : "formandos"}
        </Text>
        <View style={t.grid}>
          {data.formandos.map((f, i) => (
            <Celula key={i} f={f} />
          ))}
        </View>
        <Footer orgNome={data.orgNome} geradoEm={data.geradoEm} />
      </Page>
    </Document>
  );
}

export async function renderCarometroGrupoPdf(data: CarometroGrupoPdfData): Promise<Buffer> {
  return renderToBuffer(<Doc data={data} />);
}
