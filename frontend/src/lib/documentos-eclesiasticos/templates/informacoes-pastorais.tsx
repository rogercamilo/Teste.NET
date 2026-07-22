import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import type { DadosTemplate } from "./types";
import { s, Header, Secao, Campo, Assinaturas, DataLocal, Footer, val } from "./base";

const LINHAS_VAZIAS = Array.from({ length: 10 });

export default function InformacoesPastoraisPDF({ dados }: { dados: DadosTemplate }) {
  const f = dados.formulario;
  const texto = val(f.informacoes_texto);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Header branding={dados.branding} orgNome={dados.orgNome} titulo="Informações Pastorais e Formativas" subtitulo={dados.nivelFormativo} />

        <Secao>Dados do Candidato</Secao>
        <Campo label="Nome" value={dados.formandoNome} />
        <Campo label="Etapa formativa" value={dados.nivelFormativo} />
        <Campo label="Núcleo" value={val(f.nucleo)} />
        <Campo label="Responsável canônico" value={val(f.responsavel_canonico)} />

        <Secao>Informações Pastorais e Formativas</Secao>

        {texto ? (
          <Text style={[s.paragraph, { marginTop: 4 }]}>{texto}</Text>
        ) : (
          <View style={{ marginTop: 4 }}>
            <Text style={[s.noteText, { marginBottom: 8, color: "#9ca3af" }]}>
              Preencha as informações pastorais e formativas do candidato abaixo:
            </Text>
            {LINHAS_VAZIAS.map((_, i) => (
              <View
                key={i}
                style={{
                  borderBottomWidth: 0.5,
                  borderBottomColor: "#d1d5db",
                  marginBottom: 14,
                }}
              />
            ))}
          </View>
        )}

        <DataLocal />
        <Assinaturas items={[dados.termoFormador, "Responsável canônico"]} />
        <Footer orgNome={dados.orgNome} geradoEm={dados.geradoEm} marcaDagua={dados.marcaDagua} />
      </Page>
    </Document>
  );
}
