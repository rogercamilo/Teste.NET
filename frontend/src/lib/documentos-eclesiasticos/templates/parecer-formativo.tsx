import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import type { DadosTemplate } from "./types";
import { s, Header, Secao, Campo, Assinaturas, DataLocal, Footer, val } from "./base";

const DIMENSOES = [
  {
    titulo: "Dimensão Espiritual",
    campos: [
      { key: "participacao_sacramentos", label: "Participação nos sacramentos" },
      { key: "vida_oracao", label: "Vida de oração" },
      { key: "adesao_carisma", label: "Adesão ao carisma" },
    ],
  },
  {
    titulo: "Dimensão Comunitária",
    campos: [
      { key: "participacao_encontros", label: "Participação nos encontros" },
      { key: "relacao_fraterna", label: "Relação fraterna" },
      { key: "zelo_responsabilidade", label: "Zelo e responsabilidade" },
    ],
  },
  {
    titulo: "Dimensão Missionária",
    campos: [
      { key: "envolvimento_missao", label: "Envolvimento na missão" },
      { key: "disponibilidade_servico", label: "Disponibilidade para o serviço" },
      { key: "testemunho_cristao", label: "Testemunho cristão" },
    ],
  },
  {
    titulo: "Dimensão Humana",
    campos: [
      { key: "maturidade_afetiva", label: "Maturidade afetiva" },
      { key: "cooperacao_dialogo", label: "Cooperação e diálogo" },
    ],
  },
];

const NOTA_LABEL: Record<string, string> = {
  ótimo: "Ótimo",
  bom: "Bom",
  regular: "Regular",
  fraco: "Fraco",
};

function notaLabel(v: unknown): string {
  const str = v !== undefined && v !== null ? String(v).trim().toLowerCase() : "";
  return NOTA_LABEL[str] ?? (str || "—");
}

export default function ParecerFormativoPDF({ dados }: { dados: DadosTemplate }) {
  const f = dados.formulario;
  const favoravel = dados.favoravelRenovacao;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Header orgNome={dados.orgNome} titulo="Parecer Formativo Anual" subtitulo={dados.nivelFormativo} />

        <Secao>Dados do Avaliado</Secao>
        <Campo label="Nome" value={dados.formandoNome} />
        <Campo label="Etapa formativa" value={dados.nivelFormativo} />
        <Campo label="Núcleo" value={val(f.nucleo)} />
        <Campo label="Responsável canônico" value={val(f.responsavel_canonico)} />

        {DIMENSOES.map((dim) => (
          <View key={dim.titulo}>
            <Secao>{dim.titulo}</Secao>
            {dim.campos.map((c) => (
              <Campo key={c.key} label={c.label} value={notaLabel(f[c.key])} />
            ))}
          </View>
        ))}

        {val(f.observacoes_relevantes) ? (
          <>
            <Secao>Observações Relevantes</Secao>
            <Text style={s.paragraph}>{val(f.observacoes_relevantes)}</Text>
          </>
        ) : null}

        {val(f.recomendacoes_formativas) ? (
          <>
            <Secao>Recomendações Formativas</Secao>
            <Text style={s.paragraph}>{val(f.recomendacoes_formativas)}</Text>
          </>
        ) : null}

        <Secao>Síntese e Recomendação</Secao>
        <View style={[s.row, { marginTop: 4 }]}>
          <Text style={s.fieldLabel}>Favorável à renovação:</Text>
          <Text style={[s.fieldValue, { fontFamily: "Helvetica-Bold" }]}>
            {favoravel === true ? "Sim" : favoravel === false ? "Não" : "—"}
          </Text>
        </View>
        {!favoravel && val(f.motivo_desfavoravel) ? (
          <>
            <Text style={[s.fieldLabel, { marginTop: 6, marginBottom: 2 }]}>Motivo:</Text>
            <Text style={[s.fieldValue, { lineHeight: 1.5 }]}>{val(f.motivo_desfavoravel)}</Text>
          </>
        ) : null}

        <DataLocal />
        <Assinaturas items={["Formador Comunitário", "Formador Geral"]} />
        <Footer orgNome={dados.orgNome} geradoEm={dados.geradoEm} marcaDagua={dados.marcaDagua} />
      </Page>
    </Document>
  );
}
