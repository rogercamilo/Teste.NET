import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import type { DadosTemplate } from "./types";
import { s, Header, Secao, Campo, Assinaturas, DataLocal, Footer, val } from "./base";

export default function AtoAdmissaoPDF({ dados }: { dados: DadosTemplate }) {
  const f = dados.formulario;
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Header orgNome={dados.orgNome} titulo="Ato de Admissão" subtitulo={dados.nivelFormativo} />

        <Secao>Identificação do Candidato</Secao>
        <Campo label="Nome completo" value={val(f.nome_completo) ?? dados.formandoNome} />
        {dados.formandoNomeSocial ? <Campo label="Nome social" value={dados.formandoNomeSocial} /> : null}
        <Campo label="Data de nascimento" value={dados.formandoDataNascimento} />
        <Campo label="Nacionalidade" value={val(f.nacionalidade) ?? dados.formandoNacionalidade ?? "Brasileiro(a)"} />
        <Campo label="Estado civil" value={val(f.estado_civil) ?? dados.formandoEstadoCivil} />
        {dados.formandoNumFilhos != null ? (
          <Campo label="Número de filhos" value={String(dados.formandoNumFilhos)} />
        ) : null}
        <Campo label="RG" value={val(f.rg) ?? dados.formandoRg ?? undefined} />
        <Campo label="Órgão emissor" value={val(f.orgao_emissor) ?? dados.formandoOrgaoEmissor ?? undefined} />
        <Campo label="Telefone" value={val(f.telefone) ?? dados.formandoTelefone} />
        <Campo label="E-mail" value={val(f.email) ?? dados.formandoEmail} />
        <Campo label="CEP" value={val(f.cep) ?? dados.formandoCep ?? undefined} />
        <Campo label="Paróquia de referência" value={val(f.paroquia_referencia) ?? dados.formandoParoquiaReferencia ?? undefined} />

        <Secao>Dados da Admissão</Secao>
        <Campo label="Etapa formativa" value={dados.nivelFormativo} />
        <Campo label="Núcleo" value={val(f.nucleo)} />
        <Campo label="Data de início" value={val(f.data_inicio)} />
        <Campo label="Data fim estimada" value={val(f.data_fim_estimada)} />
        <Campo label="Responsável canônico" value={val(f.responsavel_canonico)} />
        <Campo label="Cargo / Função" value={val(f.cargo_funcao)} />
        {val(f.observacoes_condicoes) ? (
          <View style={{ marginTop: 4 }}>
            <Text style={[s.fieldLabel, { marginBottom: 2 }]}>Observações / Condições:</Text>
            <Text style={[s.fieldValue, { lineHeight: 1.5, paddingLeft: 2 }]}>{val(f.observacoes_condicoes)}</Text>
          </View>
        ) : null}

        <DataLocal />
        <Assinaturas items={["Candidato(a)", "Responsável canônico"]} />
        <Footer orgNome={dados.orgNome} geradoEm={dados.geradoEm} />
      </Page>
    </Document>
  );
}
