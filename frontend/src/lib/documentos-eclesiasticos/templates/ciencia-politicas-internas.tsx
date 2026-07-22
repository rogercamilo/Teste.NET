import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { DadosTemplate } from "./types";
import { s, Header, Secao, Campo, Paragrafos, Assinaturas, DataLocal, Footer, val } from "./base";
import { resolveBlocoParagrafos, resolveBlocoLista } from "../blocos";

export default function CienciaPoliticasInternasPDF({ dados }: { dados: DadosTemplate }) {
  const f = dados.formulario;
  const nomeCompleto = val(f.nome_completo) ?? dados.formandoNome;
  const politicas = resolveBlocoLista("ciencia.politicas", dados.textosCustom, {});
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Header
          branding={dados.branding}
          orgNome={dados.orgNome}
          titulo="Ciência de Políticas Internas"
          subtitulo={dados.nivelFormativo}
        />

        <Secao>Dados do Candidato</Secao>
        <Campo label="Nome completo" value={val(f.nome_completo) ?? dados.formandoNome} />
        <Campo label="Etapa formativa" value={dados.nivelFormativo} />
        <Campo label="Núcleo" value={val(f.nucleo)} />

        <Secao>Declaração de Ciência</Secao>
        <Paragrafos
          textos={resolveBlocoParagrafos("ciencia.preambulo", dados.textosCustom, {
            pessoa: nomeCompleto,
            etapa: dados.nivelFormativo,
            org: dados.orgNome,
          })}
        />

        {politicas.map((item, i) => (
          <View key={i} style={{ flexDirection: "row", marginBottom: 5, alignItems: "flex-start" }}>
            <Text style={{ fontSize: 10, color: "#374151", width: 18, flexShrink: 0 }}>{i + 1}.</Text>
            <Text style={[s.fieldValue, { lineHeight: 1.5 }]}>{item}</Text>
          </View>
        ))}

        <Text style={[s.paragraph, { marginTop: 12 }]}>
          {`Declaro ainda que fui informado(a) sobre o caráter espiritual, comunitário e missionário da proposta formativa, e que aceito livremente suas exigências e compromissos.`}
        </Text>

        <DataLocal />
        <Assinaturas items={["Candidato(a)", "Responsável canônico"]} />
        <Footer orgNome={dados.orgNome} geradoEm={dados.geradoEm} marcaDagua={dados.marcaDagua} />
      </Page>
    </Document>
  );
}
