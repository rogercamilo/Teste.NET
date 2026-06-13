import React from "react";
import { Document, Page, Text } from "@react-pdf/renderer";
import type { DadosTemplate } from "./types";
import { s, Header, Secao, Campo, Assinaturas, DataLocal, Footer, val } from "./base";

export default function DeclaracaoResponsavelPDF({ dados }: { dados: DadosTemplate }) {
  const f = dados.formulario;
  const responsavelNome = val(f.responsavel_legal_nome) ?? "____________________________________";
  const responsavelParentesco = val(f.responsavel_legal_parentesco) ?? "____________________";
  const responsavelCpf = val(f.responsavel_legal_cpf) ?? "___.___.___-__";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Header
          orgNome={dados.orgNome}
          titulo="Declaração do Responsável Legal"
          subtitulo={dados.nivelFormativo}
        />

        <Secao>Dados do Candidato (Menor de Idade)</Secao>
        <Campo label="Nome completo" value={val(f.nome_completo) ?? dados.formandoNome} />
        <Campo label="Data de nascimento" value={dados.formandoDataNascimento} />
        <Campo label="Etapa formativa" value={dados.nivelFormativo} />
        <Campo label="Núcleo" value={val(f.nucleo)} />

        <Secao>Dados do Responsável Legal</Secao>
        <Campo label="Nome do responsável" value={val(f.responsavel_legal_nome)} />
        <Campo label="Parentesco" value={val(f.responsavel_legal_parentesco)} />
        <Campo label="CPF do responsável" value={val(f.responsavel_legal_cpf)} />
        <Campo label="Telefone do responsável" value={val(f.responsavel_legal_telefone)} />

        <Secao>Declaração</Secao>
        <Text style={s.paragraph}>
          {`Eu, ${responsavelNome}, ${responsavelParentesco}(a) do(a) candidato(a) acima identificado(a), portador(a) do CPF nº ${responsavelCpf}, declaro estar ciente e autorizar a participação do(a) menor nas atividades formativas e comunitárias promovidas por ${dados.orgNome}, na etapa denominada "${dados.nivelFormativo}".`}
        </Text>
        <Text style={s.paragraph}>
          {`Declaro ainda ter conhecimento das atividades previstas, dos horários e do caráter formativo e espiritual da proposta, concordando com os termos e condições estabelecidos pela organização.`}
        </Text>
        <Text style={s.paragraph}>
          {`Em caso de necessidade de atendimento médico de urgência, autorizo os responsáveis da organização a tomarem as providências necessárias para preservar a saúde e integridade do(a) menor.`}
        </Text>

        <DataLocal geradoEm={dados.geradoEm} />
        <Assinaturas items={["Responsável legal", "Responsável canônico"]} />
        <Footer orgNome={dados.orgNome} geradoEm={dados.geradoEm} />
      </Page>
    </Document>
  );
}
