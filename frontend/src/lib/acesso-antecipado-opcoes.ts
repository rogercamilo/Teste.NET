/**
 * Opções canônicas do formulário de acesso antecipado — FONTE ÚNICA usada pelo
 * formulário (cliente), pela validação da rota (zod) e pelos e-mails (rótulos
 * humanizados). Sem imports de servidor: pode ser importado no cliente.
 */

export const TIPO_ORGANIZACAO_OPCOES = [
  { value: "nova_comunidade", label: "Nova Comunidade" },
  { value: "instituto_religioso", label: "Instituto Religioso" },
  { value: "grupo_oracao", label: "Grupo de Oração" },
  { value: "centro_formativo", label: "Centro Formativo" },
  { value: "outro", label: "Outro" },
] as const;

export const NUMERO_MEMBROS_OPCOES = [
  { value: "ate_60", label: "Até 60" },
  { value: "61_140", label: "De 61 a 140" },
  { value: "141_350", label: "De 141 a 350" },
  { value: "mais_350", label: "Mais de 350" },
] as const;

export const INTENCAO_OPCOES = [
  { value: "demonstracao", label: "Agendar uma demonstração" },
  { value: "acesso_antecipado", label: "Já começar com acesso antecipado" },
  { value: "duvida", label: "Só tirar uma dúvida antes" },
] as const;

/** Função de quem preenche (opcional) — texto livre controlado. */
export const PAPEL_OPCOES = [
  "Reitor(a) / Superior",
  "Formador(a)",
  "Coordenador(a)",
  "Membro da comunidade",
  "Outro",
] as const;

export type Opcao = { value: string; label: string };

/** Lista de valores aceitos (para montar o enum do zod na rota). */
export function valoresDe(opcoes: readonly Opcao[]): [string, ...string[]] {
  return opcoes.map((o) => o.value) as [string, ...string[]];
}

/** Rótulo humano de um valor; cai no próprio valor se desconhecido. */
export function rotuloDe(opcoes: readonly Opcao[], value: string): string {
  return opcoes.find((o) => o.value === value)?.label ?? value;
}
