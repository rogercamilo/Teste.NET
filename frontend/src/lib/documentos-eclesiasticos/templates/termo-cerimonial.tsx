import React from "react";
import { Document, Page, Text } from "@react-pdf/renderer";
import type { DadosTemplate } from "./types";
import { s, Header, Secao, Campo, Paragrafos, Assinaturas, DataLocal, Footer, val } from "./base";
import { resolveBlocoParagrafos } from "../blocos";

export default function TermoCerimonialPDF({ dados }: { dados: DadosTemplate }) {
  const f = dados.formulario;
  const nomeCompleto = val(f.nome_completo) ?? dados.formandoNome;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Header
          branding={dados.branding}
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
        <Paragrafos
          textos={resolveBlocoParagrafos("termo_cerimonial.acolhimento", dados.textosCustom, {
            org: dados.orgNome,
            discipulado: dados.termoDiscipulado,
          })}
        />

        <Secao>Compromisso</Secao>
        <Paragrafos
          textos={resolveBlocoParagrafos("termo_cerimonial.compromisso", dados.textosCustom, {
            pessoa: nomeCompleto,
            discipulado: dados.termoDiscipulado,
            org: dados.orgNome,
          })}
        />

        <DataLocal />
        <Assinaturas items={["Candidato(a)", "Responsável canônico", "Moderador(a) Geral"]} />
        <Footer orgNome={dados.orgNome} geradoEm={dados.geradoEm} marcaDagua={dados.marcaDagua} />
      </Page>
    </Document>
  );
}
