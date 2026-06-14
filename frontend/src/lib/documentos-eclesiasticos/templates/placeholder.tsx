import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { DadosTemplate } from "./types";
import { s, Header, Footer } from "./base";

export default function PlaceholderPDF({ dados }: { dados: DadosTemplate }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Header orgNome={dados.orgNome} titulo="Documento em Elaboração" subtitulo={dados.nivelFormativo} />
        <View style={{ marginTop: 40, alignItems: "center" }}>
          <Text style={[s.paragraph, { textAlign: "center", color: "#6b7280" }]}>
            {"Este documento está em elaboração e será disponibilizado em breve."}
          </Text>
        </View>
        <Footer orgNome={dados.orgNome} geradoEm={dados.geradoEm} />
      </Page>
    </Document>
  );
}
