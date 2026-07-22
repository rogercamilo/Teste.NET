import React from "react";
import { Document, Page, Text } from "@react-pdf/renderer";
import type { DadosTemplate } from "./types";
import { s, Header, Secao, Campo, Assinaturas, DataLocal, Footer, val } from "./base";

export default function RequerimentoRenovacaoPDF({ dados }: { dados: DadosTemplate }) {
  const f = dados.formulario;
  const nomeCompleto = val(f.nome_completo) ?? dados.formandoNome;
  const numeroRenovacao = val(f.numero_renovacao);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Header
          branding={dados.branding}
          orgNome={dados.orgNome}
          titulo={`Requerimento de Renovação de ${dados.termoPromessa}s`}
          subtitulo={numeroRenovacao ? `${numeroRenovacao}ª Renovação` : undefined}
        />

        <Secao>Dados do Requerente</Secao>
        <Campo label="Nome completo" value={nomeCompleto} />
        <Campo label="Data de nascimento" value={dados.formandoDataNascimento} />
        <Campo label="Estado civil" value={val(f.estado_civil) ?? dados.formandoEstadoCivil} />
        <Campo label="Telefone" value={val(f.telefone) ?? dados.formandoTelefone} />
        <Campo label="E-mail" value={val(f.email) ?? dados.formandoEmail} />
        <Campo label="Núcleo" value={val(f.nucleo)} />
        <Campo label="Responsável canônico" value={val(f.responsavel_canonico)} />
        {numeroRenovacao ? <Campo label="Número da renovação" value={`${numeroRenovacao}ª`} /> : null}

        <Secao>Requerimento</Secao>
        <Text style={s.paragraph}>
          {`Eu, ${nomeCompleto}, membro de ${dados.orgNome}, venho respeitosamente requerer a renovação de minhas ${dados.termoPromessa}s comunitárias para o próximo período formativo.`}
        </Text>
        <Text style={s.paragraph}>
          {`Declaro ter vivido com fidelidade e comprometimento os compromissos assumidos no período anterior, e manifesto meu desejo de continuar nesta caminhada formativa, renovando meu "sim" ao chamado de Deus por meio desta comunidade.`}
        </Text>
        {val(f.motivacao_renovacao) ? (
          <>
            <Secao>Motivação</Secao>
            <Text style={s.paragraph}>{val(f.motivacao_renovacao)}</Text>
          </>
        ) : null}
        {val(f.pedido_especial) ? (
          <>
            <Secao>Pedidos e Intenções</Secao>
            <Text style={s.paragraph}>{val(f.pedido_especial)}</Text>
          </>
        ) : null}

        <DataLocal />
        <Assinaturas items={["Requerente", "Responsável canônico"]} />
        <Footer orgNome={dados.orgNome} geradoEm={dados.geradoEm} marcaDagua={dados.marcaDagua} />
      </Page>
    </Document>
  );
}
