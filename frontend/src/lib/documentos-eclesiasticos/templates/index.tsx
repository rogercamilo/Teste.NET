import React from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { TipoDocumentoEclesiastico } from "@/types";
import type { DadosTemplate } from "./types";

import AtoAdmissaoPDF from "./ato-admissao";
import InformacoesPastoraisPDF from "./informacoes-pastorais";
import DeclaracaoResponsavelPDF from "./declaracao-responsavel";
import CienciaPoliticasInternasPDF from "./ciencia-politicas-internas";
import TermoCerimonialPDF from "./termo-cerimonial";
import TermoConsagracaoPDF from "./termo-consagracao";
import RequerimentoRenovacaoPDF from "./requerimento-renovacao";
import ParecerFormativoPDF from "./parecer-formativo";
import PlaceholderPDF from "./placeholder";

type TemplateComponent = React.ComponentType<{ dados: DadosTemplate }>;

const TEMPLATES: Record<TipoDocumentoEclesiastico, TemplateComponent> = {
  ato_admissao:              AtoAdmissaoPDF,
  ato_admissao_renovacao:    AtoAdmissaoPDF,
  informacoes_pastorais:     InformacoesPastoraisPDF,
  declaracao_responsavel:    DeclaracaoResponsavelPDF,
  ciencia_politicas_internas: CienciaPoliticasInternasPDF,
  termo_cerimonial:          TermoCerimonialPDF,
  termo_consagracao:         TermoConsagracaoPDF,
  requerimento_renovacao:    RequerimentoRenovacaoPDF,
  parecer_formativo:         ParecerFormativoPDF,
  termo_renovacao:           PlaceholderPDF,
  carta_missao:              PlaceholderPDF,
  carta_transferencia:       PlaceholderPDF,
  carta_licenca:             PlaceholderPDF,
  termo_desligamento:        PlaceholderPDF,
  dispensa_promessas:        PlaceholderPDF,
};

export async function renderTemplate(
  tipo: TipoDocumentoEclesiastico,
  dados: DadosTemplate
): Promise<Buffer> {
  const Template = TEMPLATES[tipo];
  const element = React.createElement(Template, { dados }) as React.ReactElement<DocumentProps>;
  const arrayBuffer = await renderToBuffer(element);
  return Buffer.from(arrayBuffer);
}

export type { DadosTemplate };
