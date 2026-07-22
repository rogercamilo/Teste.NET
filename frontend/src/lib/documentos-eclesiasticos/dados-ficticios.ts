import type { DadosTemplate } from "./templates/types";
import { BRANDING_PADRAO } from "./branding";

/**
 * Dados fictícios para a Vitrine de documentos: preenche um DadosTemplate
 * completo (incluindo todas as chaves de `formulario` lidas pelos 8 templates)
 * com valores realistas mas inventados. Nunca usa dados reais de nenhuma org.
 *
 * O texto de marca d'água é responsabilidade do chamador (a rota da Vitrine),
 * para manter este helper reutilizável.
 */
export function dadosFicticios(): DadosTemplate {
  return {
    orgNome: "Comunidade Católica Nova Aliança",
    branding: BRANDING_PADRAO,
    termoPreDiscipulado: "Pré-Discipulado",
    termoDiscipulado: "Discipulado",
    termoPrimeirasPromessas: "Primeiras Promessas",
    termoPromessa: "Promessas Definitivas",

    processoTipo: "admissao_etapa2",
    nivelFormativo: "Discipulado",
    favoravelRenovacao: true,

    formandoNome: "Maria Aparecida da Silva",
    formandoDataNascimento: "14/03/1997",
    formandoEstadoCivil: "Solteira",
    formandoTelefone: "(11) 98765-4321",
    formandoEmail: "maria.silva@exemplo.com",
    formandoNomeSocial: null,
    formandoNacionalidade: "Brasileira",
    formandoRg: "34.567.890-1",
    formandoOrgaoEmissor: "SSP/SP",
    formandoCep: "01310-100",
    formandoParoquiaReferencia: "Paróquia Nossa Senhora da Paz",
    formandoNumFilhos: 0,

    formulario: {
      nome_completo: "Maria Aparecida da Silva",
      nacionalidade: "Brasileira",
      estado_civil: "Solteira",
      rg: "34.567.890-1",
      orgao_emissor: "SSP/SP",
      telefone: "(11) 98765-4321",
      email: "maria.silva@exemplo.com",
      cep: "01310-100",
      paroquia_referencia: "Paróquia Nossa Senhora da Paz",

      nucleo: "Núcleo São José",
      data_inicio: "01/02/2024",
      data_fim_estimada: "01/02/2026",
      periodo_vigencia: "2 anos (renovável)",
      responsavel_canonico: "Pe. João Batista de Almeida",
      cargo_funcao: "Formador de Etapa",
      assistente_eclesiastico: "Pe. João Batista de Almeida",
      moderador_geral: "Ir. Tereza Menezes",

      observacoes_condicoes:
        "Admissão condicionada à participação integral nos encontros formativos mensais e ao acompanhamento espiritual regular.",
      observacoes_relevantes:
        "Candidata demonstra maturidade afetiva e constância na vida de oração e nos serviços comunitários.",
      recomendacoes_formativas:
        "Aprofundar o estudo dos documentos fundacionais e iniciar acompanhamento vocacional individualizado.",
      motivacao_renovacao:
        "Desejo de perseverar no caminho formativo e aprofundar o compromisso com o carisma da comunidade.",
      motivo_desfavoravel: "",
      pedido_especial: "Solicita celebração da cerimônia na Capela de São Miguel Arcanjo.",

      celebrante: "Dom Antônio Carlos Ferreira",
      local_celebracao: "Capela de São Miguel Arcanjo",
      data_celebracao: "08/12/2025",
      data_ceremonia: "08/12/2025",
      formula_texto:
        "Eu, Maria Aparecida da Silva, diante de Deus e desta comunidade, assumo livremente o compromisso de viver segundo o carisma e as constituições da Comunidade Católica Nova Aliança.",
      informacoes_texto:
        "A candidata integra o núcleo formativo desde fevereiro de 2024, com frequência regular e bom entrosamento comunitário.",

      numero: "0042",
      numero_renovacao: "2ª",
      folha: "021",
      tomo: "I",

      responsavel_legal_nome: "—",
      responsavel_legal_parentesco: "—",
      responsavel_legal_cpf: "—",
      responsavel_legal_telefone: "—",
    },

    geradoEm: "01/01/2025 às 10:00",
  };
}
