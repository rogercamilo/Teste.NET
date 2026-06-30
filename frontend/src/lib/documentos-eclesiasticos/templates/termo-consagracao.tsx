import React from "react";
import { Document, Page, Text } from "@react-pdf/renderer";
import type { DadosTemplate } from "./types";
import { s, Header, Secao, Campo, Assinaturas, DataLocal, Footer, val } from "./base";

export default function TermoConsagracaoPDF({ dados }: { dados: DadosTemplate }) {
  const f = dados.formulario;
  const nomeCompleto = val(f.nome_completo) ?? dados.formandoNome;
  const isDefinitivas = dados.processoTipo === "promessas_definitivas";
  const tipoPromessa = isDefinitivas
    ? `${dados.termoPromessa}s Definitivas`
    : dados.termoPrimeirasPromessas;

  const vigencia = isDefinitivas
    ? "sem prazo determinado, renovando-se perpetuamente"
    : `por um período de ${val(f.periodo_vigencia) ?? "um ano"}, a contar da data da celebração`;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Header orgNome={dados.orgNome} titulo={`Termo de Consagração — ${tipoPromessa}`} />

        <Secao>Dados do Consagrado(a)</Secao>
        <Campo label="Nome completo" value={nomeCompleto} />
        <Campo label="Data de nascimento" value={dados.formandoDataNascimento} />
        <Campo label="Estado civil" value={val(f.estado_civil) ?? dados.formandoEstadoCivil} />
        <Campo label="Etapa formativa" value={dados.nivelFormativo} />
        <Campo label="Data da celebração" value={val(f.data_celebracao) ?? val(f.data_inicio)} />
        <Campo label="Local da celebração" value={val(f.local_celebracao)} />
        <Campo label="Celebrante" value={val(f.celebrante)} />
        <Campo label="Moderador(a) Geral" value={val(f.moderador_geral)} />
        {val(f.assistente_eclesiastico) ? (
          <Campo label="Assistente eclesiástico" value={val(f.assistente_eclesiastico)} />
        ) : null}

        <Secao>Fórmula de Consagração</Secao>
        <Text style={s.paragraph}>
          {val(f.formula_texto) ??
            `Eu, ${nomeCompleto}, diante de Deus e desta comunidade reunida em Seu nome, livremente me consagro a Ele por meio de ${tipoPromessa} em ${dados.orgNome}, comprometendo-me a viver o carisma e a missão desta comunidade com fidelidade, ${vigencia}.`}
        </Text>
        <Text style={s.paragraph}>
          {`Faço estas ${tipoPromessa} com plena consciência das exigências que assumo, confiante na graça de Deus e no apoio fraterno da comunidade.`}
        </Text>

        {val(f.tomo) || val(f.folha) || val(f.numero) ? (
          <>
            <Secao>Registro no Livro de Promessas</Secao>
            <Campo label="Tomo" value={val(f.tomo)} />
            <Campo label="Folha" value={val(f.folha)} />
            <Campo label="Número" value={val(f.numero)} />
          </>
        ) : null}

        <DataLocal />
        <Assinaturas
          items={[
            "Consagrado(a)",
            "Celebrante",
            "Moderador(a) Geral",
            ...(val(f.assistente_eclesiastico) ? ["Assistente eclesiástico"] : []),
            "Secretário(a)",
          ]}
        />
        <Footer orgNome={dados.orgNome} geradoEm={dados.geradoEm} marcaDagua={dados.marcaDagua} />
      </Page>
    </Document>
  );
}
