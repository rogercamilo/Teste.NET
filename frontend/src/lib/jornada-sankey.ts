/**
 * Motor do sankey da jornada formativa (visão FG/Admin).
 *
 * ABORDAGEM A (sem migração): deriva as transições de->para a partir do que já
 * existe — `ProgressoEtapa` (uma linha por etapa que o formando entrou) + o ramo
 * vocacional (`ParticipacaoVocacional`). Nenhuma estrutura nova, nenhuma
 * instrumentação: a cada avanço de etapa (rota nova-etapa) o dado já se preenche.
 *
 * DAG garantido: as transições entre etapas são ordenadas pelo RANK CANÔNICO da
 * etapa (não pela data), então nunca há aresta "para trás" nem ciclo — o ECharts
 * sankey exige um grafo acíclico e lança erro se encontrar ciclo. Ingresso é só
 * fonte; os desfechos (Concluído/Arquivado) são só destino. Logo, acíclico.
 *
 * Função PURA (sem Prisma/IO) para ser testável — ver __tests__/lib/jornada-sankey.
 */

import { NIVEL_FORMATIVO_LABELS, type NivelFormativo } from "@/types";

export type SankeyNodeKind = "ingresso" | "etapa" | "vocacional" | "concluido" | "arquivado";
export interface SankeyNode { nome: string; kind: SankeyNodeKind }
export interface SankeyLink { source: string; target: string; value: number }
export interface SankeyJornada { nodes: SankeyNode[]; links: SankeyLink[] }

export interface ProgressoEtapaInput { formandoId: string; nivelFormativo: string }
export interface ParticipacaoVocacionalInput { formandoId: string; status: string }

// Ordem canônica do caminho formativo (vocacional é RAMO, não entra aqui).
const ORDEM_ETAPAS: NivelFormativo[] = [
  "pre-discipulado", "discipulado", "primeiras-promessas", "formacao-permanente",
];

const INGRESSO = "Ingresso";
const CONCLUIDO = "Concluído";
const ARQUIVADO = "Arquivado / saída";

// Status de ParticipacaoVocacional que representam desfecho (saem do nó vocacional).
const STATUS_DEFERIDO = "concluida_deferida";
const STATUS_SAIDA = new Set(["recusada_arquivada", "indeferida_arquivada", "cancelada"]);

export function construirSankeyJornada(
  progresso: ProgressoEtapaInput[],
  participacoes: ParticipacaoVocacionalInput[],
  termoVocacional: string,
  opts?: { incluirIngresso?: boolean },
): SankeyJornada | undefined {
  const incluirIngresso = opts?.incluirIngresso ?? true;
  const label = (n: NivelFormativo) => NIVEL_FORMATIVO_LABELS[n];

  // Conjunto de etapas canônicas que cada formando entrou (uma linha = entrou).
  const etapasPorFormando = new Map<string, Set<NivelFormativo>>();
  for (const p of progresso) {
    const n = p.nivelFormativo as NivelFormativo;
    if (!ORDEM_ETAPAS.includes(n)) continue; // ignora "vocacional" como etapa
    const set = etapasPorFormando.get(p.formandoId) ?? new Set<NivelFormativo>();
    set.add(n);
    etapasPorFormando.set(p.formandoId, set);
  }

  // Acumula fluxos: Map aninhado source -> target -> contagem (nomes de nós têm
  // espaços/barras e quebrariam uma chave string concatenada com split).
  const linkMap = new Map<string, Map<string, number>>();
  const add = (source: string, target: string) => {
    if (source === target) return;
    const alvos = linkMap.get(source) ?? new Map<string, number>();
    alvos.set(target, (alvos.get(target) ?? 0) + 1);
    linkMap.set(source, alvos);
  };

  // Etapas ordenadas canonicamente de um formando (sempre forward -> acíclico).
  const caminhoDe = (set: Set<NivelFormativo> | undefined): NivelFormativo[] =>
    set ? ORDEM_ETAPAS.filter((n) => set.has(n)) : [];

  // Transições entre etapas (+ ingresso na primeira etapa).
  for (const set of etapasPorFormando.values()) {
    const caminho = caminhoDe(set);
    if (caminho.length === 0) continue;
    if (incluirIngresso) add(INGRESSO, label(caminho[0]));
    for (let i = 0; i < caminho.length - 1; i++) add(label(caminho[i]), label(caminho[i + 1]));
  }

  // Ramo vocacional: origem = etapa mais avançada atingida (ou Ingresso) -> Vocacional,
  // e o desfecho conforme o status da participação.
  for (const v of participacoes) {
    const caminho = caminhoDe(etapasPorFormando.get(v.formandoId));
    const origem = caminho.length ? label(caminho[caminho.length - 1]) : INGRESSO;
    add(origem, termoVocacional);
    if (v.status === STATUS_DEFERIDO) add(termoVocacional, CONCLUIDO);
    else if (STATUS_SAIDA.has(v.status)) add(termoVocacional, ARQUIVADO);
    // ativa / em_discernimento / aguardando_carta -> ainda no nó vocacional (sem saída).
  }

  if (linkMap.size === 0) return undefined;

  const links: SankeyLink[] = [];
  for (const [source, alvos] of linkMap) {
    for (const [target, value] of alvos) links.push({ source, target, value });
  }

  // Nós presentes nos links, com kind + ordem por rank (layout esquerda->direita).
  const kindOf = (nome: string): SankeyNodeKind => {
    if (nome === INGRESSO) return "ingresso";
    if (nome === termoVocacional) return "vocacional";
    if (nome === CONCLUIDO) return "concluido";
    if (nome === ARQUIVADO) return "arquivado";
    return "etapa";
  };
  const rank = (nome: string): number => {
    if (nome === INGRESSO) return 0;
    const idx = ORDEM_ETAPAS.findIndex((n) => label(n) === nome);
    if (idx >= 0) return 1 + idx;
    if (nome === termoVocacional) return 6;
    if (nome === CONCLUIDO) return 7;
    if (nome === ARQUIVADO) return 8;
    return 5;
  };
  const nomes = new Set<string>();
  for (const l of links) { nomes.add(l.source); nomes.add(l.target); }
  const nodes: SankeyNode[] = [...nomes]
    .sort((a, b) => rank(a) - rank(b))
    .map((nome) => ({ nome, kind: kindOf(nome) }));

  return { nodes, links };
}
