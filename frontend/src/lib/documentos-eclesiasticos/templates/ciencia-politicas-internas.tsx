import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { DadosTemplate } from "./types";
import { s, Header, Secao, Campo, Assinaturas, DataLocal, Footer, val } from "./base";

const POLITICAS = [
  "Participar regularmente das reuniões e encontros formativos previstos no plano formativo.",
  "Zelar pelo bem comum e pela fraternidade nas relações comunitárias.",
  "Manter sigilo sobre assuntos internos de caráter confidencial.",
  "Respeitar a autoridade e o carisma próprio da organização.",
  "Comunicar ao responsável canônico qualquer impedimento ou dificuldade relevante.",
  "Contribuir com dedicação e generosidade para as atividades missionárias e apostólicas.",
  "Cuidar dos bens materiais da organização com responsabilidade.",
  "Observar as normas e orientações pastorais estabelecidas pelo governo da organização.",
];

export default function CienciaPoliticasInternasPDF({ dados }: { dados: DadosTemplate }) {
  const f = dados.formulario;
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Header
          orgNome={dados.orgNome}
          titulo="Ciência de Políticas Internas"
          subtitulo={dados.nivelFormativo}
        />

        <Secao>Dados do Candidato</Secao>
        <Campo label="Nome completo" value={val(f.nome_completo) ?? dados.formandoNome} />
        <Campo label="Etapa formativa" value={dados.nivelFormativo} />
        <Campo label="Núcleo" value={val(f.nucleo)} />

        <Secao>Declaração de Ciência</Secao>
        <Text style={s.paragraph}>
          {`Eu, ${val(f.nome_completo) ?? dados.formandoNome}, candidato(a) à etapa "${dados.nivelFormativo}" em ${dados.orgNome}, declaro ter lido, compreendido e aceito as políticas internas da organização, comprometendo-me a observar os seguintes princípios e normas de convivência:`}
        </Text>

        {POLITICAS.map((item, i) => (
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
        <Footer orgNome={dados.orgNome} geradoEm={dados.geradoEm} />
      </Page>
    </Document>
  );
}
