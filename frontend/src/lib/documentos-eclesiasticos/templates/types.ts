import type { DocumentoBranding } from "../branding";

export interface DadosTemplate {
  orgNome: string;
  /** Identidade visual da org (cor de destaque + logo) aplicada ao cabeçalho. */
  branding: DocumentoBranding;
  termoPreDiscipulado: string;
  termoDiscipulado: string;
  termoPrimeirasPromessas: string;
  termoPromessa: string;
  /** Rótulo do responsável comunitário nas assinaturas (ex.: Líder, Guia). */
  termoFormador: string;
  /** Ato de consagração (ex.: Consagração, Aliança, Compromisso). */
  termoConsagracao: string;
  /** Pessoa consagrada (ex.: Consagrado(a), Membro, Aliançado(a)). */
  termoConsagrado: string;
  /**
   * Overrides de blocos de texto por bloco.id (Fase 3). Vazio = usa o padrão do
   * registro em `lib/documentos-eclesiasticos/blocos.ts`.
   */
  textosCustom: Record<string, string>;

  processoTipo: string;
  nivelFormativo: string;
  favoravelRenovacao: boolean;

  formandoNome: string;
  formandoDataNascimento: string;
  formandoEstadoCivil: string;
  formandoTelefone: string;
  formandoEmail: string;
  formandoNomeSocial?: string | null;
  formandoNacionalidade?: string | null;
  formandoRg?: string | null;
  formandoOrgaoEmissor?: string | null;
  formandoCep?: string | null;
  formandoParoquiaReferencia?: string | null;
  formandoNumFilhos?: number | null;

  formulario: Record<string, unknown>;
  geradoEm: string;

  /**
   * Texto de marca d'água sobreposto em todas as páginas (ex.: "MODELO — SEM
   * VALIDADE"). Usado SÓ no modo preview (Vitrine de documentos); ausente na
   * geração real. Renderizado pelo Footer (que já é `fixed`, repete por página).
   */
  marcaDagua?: string | null;
}
