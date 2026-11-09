import { describe, it, expect } from "vitest";
import {
  getDocumentosTipos,
  documentosProntosParaRevisao,
} from "@/lib/jornada-vocacional";
import type { TipoProcessoEclesiastico } from "@/types";

// Tipos que, por natureza, NÃO geram documentos canônicos — a preparação é só o
// formulário. Precisam poder avançar para revisão com a lista de documentos vazia
// (do contrário o processo fica preso em "Em andamento" para sempre).
const TIPOS_SEM_DOCUMENTOS: TipoProcessoEclesiastico[] = ["ministerio", "falecimento"];

// Tipos que geram ao menos um documento canônico e, portanto, mantêm a trava.
const TIPOS_COM_DOCUMENTOS: TipoProcessoEclesiastico[] = [
  "inicio_vocacional",
  "admissao_etapa",
  "promessas_iniciais",
  "promessas_definitivas",
  "renovacao_promessas",
  "missao",
  "transferencia",
  "licenca",
  "desligamento",
];

describe("getDocumentosTipos — invariante da trava de revisão", () => {
  it.each(TIPOS_SEM_DOCUMENTOS)("%s não gera nenhum documento canônico", (tipo) => {
    expect(getDocumentosTipos(tipo)).toHaveLength(0);
  });

  it.each(TIPOS_COM_DOCUMENTOS)("%s gera ao menos um documento canônico", (tipo) => {
    expect(getDocumentosTipos(tipo).length).toBeGreaterThan(0);
  });
});

describe("gate de envio para revisão (tipoGeraDocumentos && !prontos)", () => {
  // Reproduz a condição usada no cliente e no servidor para travar o botão.
  const travado = (tipo: TipoProcessoEclesiastico, docs: { arquivoId?: string | null }[]) =>
    getDocumentosTipos(tipo).length > 0 && !documentosProntosParaRevisao(docs);

  it("tipo sem documentos nunca trava (lista vazia)", () => {
    for (const tipo of TIPOS_SEM_DOCUMENTOS) {
      expect(travado(tipo, [])).toBe(false);
    }
  });

  it("tipo com documentos trava enquanto a lista está vazia (não materializada)", () => {
    expect(travado("missao", [])).toBe(true);
  });

  it("tipo com documentos trava enquanto há documento sem PDF gerado", () => {
    expect(travado("missao", [{ arquivoId: null }])).toBe(true);
  });

  it("tipo com documentos libera quando todos têm PDF gerado", () => {
    expect(travado("missao", [{ arquivoId: "arq_1" }])).toBe(false);
  });
});
