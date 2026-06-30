import React from "react";
import { Document, Page, Text } from "@react-pdf/renderer";
import type { DadosTemplate } from "./types";
import { s, Header, Secao, Campo, Assinaturas, DataLocal, Footer, val } from "./base";

export default function TermoCerimonialPDF({ dados }: { dados: DadosTemplate }) {
  const f = dados.formulario;
  const nomeCompleto = val(f.nome_completo) ?? dados.formandoNome;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Header
          orgNome={dados.orgNome}
          titulo={`Termo Cerimonial de Admissão — ${dados.termoDiscipulado}`}
          subtitulo={dados.nivelFormativo}
        />

        <Secao>Dados do Candidato</Secao>
        <Campo label="Nome completo" value={nomeCompleto} />
        <Campo label="Data de nascimento" value={dados.formandoDataNascimento} />
        <Campo label="Etapa formativa" value={dados.nivelFormativo} />
        <Campo label="Núcleo" value={val(f.nucleo)} />
        <Campo label="Data da cerimônia" value={val(f.data_ceremonia) ?? val(f.data_inicio)} />
        <Campo label="Responsável canônico" value={val(f.responsavel_canonico)} />

        <Secao>Texto Cerimonial</Secao>
        <Text style={s.paragraph}>
          {`Prezado(a) ${nomeCompleto},`}
        </Text>
        <Text style={s.paragraph}>
          {`Em nome de ${dados.orgNome} e da nossa comunidade de fé, é com grande alegria que o(a) acolhemos nesta nova etapa da sua caminhada formativa: o ${dados.termoDiscipulado}.`}
        </Text>
        <Text style={s.paragraph}>
          {`Esta etapa representa um passo significativo em sua jornada vocacional. Ao ingressar no ${dados.termoDiscipulado}, você é convidado(a) a aprofundar seu comprometimento com a vida espiritual, comunitária e missionária, respondendo ao chamado que Deus lhe dirige por meio desta comunidade.`}
        </Text>
        <Text style={s.paragraph}>
          {`Que esta passagem seja marcada pela gratidão, pela abertura ao Espírito Santo e pelo desejo sincero de crescer em santidade e serviço. A comunidade inteira o(a) acompanha com oração e fraternidade.`}
        </Text>

        <Secao>Compromisso</Secao>
        <Text style={s.paragraph}>
          {`Eu, ${nomeCompleto}, ao ingressar no ${dados.termoDiscipulado} de ${dados.orgNome}, renovo meu comprometimento com a vida comunitária e me disponho a percorrer esta etapa com fidelidade, escuta e generosidade.`}
        </Text>

        <DataLocal />
        <Assinaturas items={["Candidato(a)", "Responsável canônico", "Moderador(a) Geral"]} />
        <Footer orgNome={dados.orgNome} geradoEm={dados.geradoEm} marcaDagua={dados.marcaDagua} />
      </Page>
    </Document>
  );
}
