import { z } from "zod";

// ── Enums compartilhados ──────────────────────────────────────────────────────

export const NivelFormativoEnum = z.enum([
  "pre-discipulado",
  "discipulado",
  "primeiras-promessas",
  "formacao-permanente",
  "vocacional",
]);

export const TipoOrganizacaoEnum = z.enum([
  "nova_comunidade",
  "grupo_oracao",
  "instituto_religioso",
  "centro_formativo",
]);

export const TipoGrupoFormacaoEnum = z.enum(["estruturado", "livre"]);

export const EstadoCivilEnum = z.enum(["solteiro", "casado", "divorciado", "viuvo"]);

export const ModalidadeEnum = z.enum(["presencial", "online", "hibrida"]);

export const PerfilEnum = z.enum([
  "formador_comunitario",
  "administrador",
  "formador_geral",
]);

export const StatusAgendamentoEnum = z.enum([
  "agendada",
  "confirmada",
  "realizada",
  "cancelada",
  "reagendada",
]);

export const TipoFormacaoEnum = z.enum([
  "comunitaria",
  "retiro-comunitario",
  "retiro-pessoal",
  "atividade-extra",
]);

export const MotivoInatividadeEnum = z.enum([
  "desligamento-voluntario",
  "desligamento-compulsorio",
  "licenca",
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

const nonEmptyString = (max = 500) =>
  z.string().min(1, "Campo obrigatório").max(max, `Máximo ${max} caracteres`).trim();

const optionalString = (max = 500) =>
  z.string().max(max, `Máximo ${max} caracteres`).trim().optional();

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)");

const isoDatetime = z
  .string()
  .refine((s) => !isNaN(Date.parse(s)), { message: "Data/hora inválida" });

// ── Usuário ───────────────────────────────────────────────────────────────────

export const CreateUserSchema = z.object({
  nome: nonEmptyString(255),
  email: z.string().email("E-mail inválido").max(255),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres").max(128).optional(),
  perfil: PerfilEnum.optional(),
  grupoFormacaoId: z.string().cuid("ID inválido").optional().or(z.literal("")).transform((v) => v || undefined),
  ativo: z.boolean().optional(),
});

export const UpdateUserSchema = z.object({
  nome: nonEmptyString(255).optional(),
  email: z.string().email("E-mail inválido").max(255).optional(),
  perfil: PerfilEnum.optional(),
  grupoFormacaoId: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
});

// ── Formando ──────────────────────────────────────────────────────────────────

export const CreateFormandoSchema = z.object({
  nome: nonEmptyString(255),
  dataNascimento: isoDate,
  estadoCivil: EstadoCivilEnum.optional(),
  modalidade: ModalidadeEnum.optional(),
  nivelFormativo: NivelFormativoEnum.optional(),
  dataIngresso: isoDate.optional(),
  telefone: z.string().max(30).optional().default(""),
  email: z.string().email("E-mail inválido").max(255).optional().or(z.literal("")).default(""),
  ativo: z.boolean().optional(),
  motivoInatividade: MotivoInatividadeEnum.optional().nullable(),
  foto: z.string().max(2_000_000).optional().nullable(),
  turmaId: z.string().optional().nullable(),
  grupoFormacaoId: z.string().optional().nullable(),
  totalFormacoes: z.number().int().min(0).optional(),
  formacoesRealizadas: z.number().int().min(0).optional(),
  nomeSocial: optionalString(255).nullable(),
  nacionalidade: optionalString(100).nullable(),
  rg: optionalString(30).nullable(),
  orgaoEmissor: optionalString(50).nullable(),
  cep: optionalString(10).nullable(),
  paroquiaReferencia: optionalString(255).nullable(),
  numFilhos: z.number().int().min(0).nullable().optional(),
  progressoEtapas: z
    .array(
      z.object({
        nivel: NivelFormativoEnum,
        formacoesComunitariasRealizadas: z.number().int().min(0).optional(),
        retirosComunitariosRealizados: z.number().int().min(0).optional(),
        retirosPessoaisRealizados: z.number().int().min(0).optional(),
        iniciouEm: isoDate.optional(),
        concluiuEm: isoDate.optional(),
      })
    )
    .optional(),
});

export const UpdateFormandoSchema = CreateFormandoSchema.partial();

// ── Morada ────────────────────────────────────────────────────────────────────

export const CreateGrupoFormacaoSchema = z.object({
  nome: nonEmptyString(255),
  localReuniao: optionalString(500),
  tipo: TipoGrupoFormacaoEnum.optional(),
  nivelFormativo: NivelFormativoEnum.optional().nullable(),
  formadorId: z.string().optional().nullable(),
  planoId: z.string().optional().nullable(),
  gradeId: z.string().optional().nullable(),
  vigenciaInicio: isoDate.optional().nullable(),
  vigenciaFim: isoDate.optional().nullable(),
  imagemUrl: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
});

export const UpdateGrupoFormacaoSchema = CreateGrupoFormacaoSchema.partial();

// ── Período Vocacional ────────────────────────────────────────────────────────

export const CreateTurmaVocacionalSchema = z.object({
  nome: nonEmptyString(255),
  localReuniao: optionalString(500),
  formadorId: z.string().optional().nullable(),
  planoId: z.string().optional().nullable(),
  gradeId: z.string().optional().nullable(),
  vigenciaInicio: isoDate.optional().nullable(),
  vocacionalDuracaoMeses: z.number().int().min(1).max(24).optional().nullable(),
  vocacionalTotalRetiros: z.number().int().min(0).max(50).optional().nullable(),
  vocacionalAcompanhamentoAtivo: z.boolean().optional(),
});

export const UpdateTurmaVocacionalSchema = CreateTurmaVocacionalSchema.partial();

export const CreateParticipacaoVocacionalSchema = z.object({
  formandoId: z.string().min(1, "Formando obrigatório"),
  dataIngresso: isoDate.optional().nullable(),
  acompanhadorId: z.string().optional().nullable(),
});

export const UpdateParticipacaoVocacionalSchema = z.object({
  status: z
    .enum([
      "ativa",
      "aguardando_carta",
      "em_discernimento",
      "concluida_deferida",
      "recusada_arquivada",
      "indeferida_arquivada",
      "cancelada",
    ])
    .optional(),
  acompanhadorId: z.string().optional().nullable(),
  dataConclusao: isoDate.optional().nullable(),
});

export const RegistrarCartaVocacionalSchema = z.object({
  desfecho: z.enum(["pedido", "recusa"]),
  cartaRecebidaEm: isoDate.optional().nullable(),
});

export const CreateAcompanhamentoVocacionalSchema = z.object({
  data: isoDate.optional().nullable(),
  tipo: z.enum(["mensal", "extra"]).optional(),
  solicitadoPeloVocacionado: z.boolean().optional(),
  anotacaoEvolucao: nonEmptyString(10000),
});

// ── Leitura Vocacional (indicações de leitura da turma) ───────────────────────
// Os capítulos chegam como um array de títulos (um por linha no cliente); a API
// os numera 1..N na ordem recebida.
const capitulosLeitura = z
  .array(nonEmptyString(200))
  .min(1, "Informe ao menos um capítulo")
  .max(120, "Máximo 120 capítulos");

export const CreateLeituraSchema = z.object({
  titulo: nonEmptyString(200),
  autor: optionalString(120).nullable(),
  capitulos: capitulosLeitura,
});

export const UpdateLeituraSchema = z.object({
  titulo: nonEmptyString(200).optional(),
  autor: optionalString(120).nullable(),
  ordem: z.number().int().min(0).max(1000).optional(),
  ativo: z.boolean().optional(),
  capitulos: capitulosLeitura.optional(),
});

// Partilha textual de um capítulo (portal do vocacionado): reflexão que rende
// Fruto e fica visível ao formador. Uma por capítulo, editável. `.trim()` antes
// do `.min(1)` rejeita conteúdo só de espaços (uma partilha vazia não vale).
export const PartilhaLeituraSchema = z.object({
  texto: z.string().trim().min(1, "Escreva sua reflexão").max(2000, "Máximo 2000 caracteres"),
});

// Reação do formador a uma partilha (curtida + nota curta de incentivo).
export const ReacaoPartilhaSchema = z
  .object({
    curtiu: z.boolean().optional(),
    nota: optionalString(500).nullable(),
  })
  .refine((v) => v.curtiu !== undefined || v.nota !== undefined, {
    message: "Informe a curtida e/ou uma nota",
  });

// ── Organização ───────────────────────────────────────────────────────────────

export const PlanoAssinaturaEnum = z.enum(["GRATUITO", "BASICO", "INTERMEDIARIO", "AVANCADO", "PERSONALIZADO"]);

export const UpdateOrganizacaoSchema = z.object({
  nome: nonEmptyString(255).optional(),
  tipoOrganizacao: TipoOrganizacaoEnum.optional(),
  // planoAssinatura é excluído intencionalmente: atualizações de plano
  // só podem ocorrer via webhook Stripe ou pelo super-admin.
  descricao: optionalString(2000).nullable(),
  endereco: optionalString(500).nullable(),
  missao: optionalString(2000).nullable(),
  anoFundacao: z
    .string()
    .max(4)
    .regex(/^\d{0,4}$/, "Ano inválido")
    .optional()
    .nullable(),
  // Aceitam string vazia: o wizard de onboarding envia todos os termos juntos,
  // e os campos deixados em branco ("") significam "usar o termo padrão".
  // A rota PUT já coage `"" || undefined`, então vazios são ignorados na escrita.
  termoGrupoFormacao: optionalString(100),
  termoFormando: optionalString(100),
  termoFormador: optionalString(100),
  termoPreDiscipulado: optionalString(100),
  termoDiscipulado: optionalString(100),
  termoPrimeirasPromessas: optionalString(100),
  termoFormacaoPermanente: optionalString(100),
  vocacionalHabilitado: z.boolean().optional(),
  termoVocacional: optionalString(100),
  termoAcompanhamentoVocacional: optionalString(100),
  vocacionalDuracaoPadraoMeses: z.number().int().min(1).max(24).optional(),
  emailAgendamentoAtivo: z.boolean().optional(),
  nomePlataforma: optionalString(100).nullable(),
  logoUrl: z
    .string()
    .max(2_000_000, "Logo muito grande (máximo ~1.5 MB em base64)")
    .refine(
      (v) => v.startsWith("data:image/") || v.startsWith("https://"),
      { message: "logoUrl deve ser uma data URL de imagem ou URL HTTPS" }
    )
    .optional()
    .nullable(),
  temaCor: z.string().max(50).optional(),
  onboardingConcluido: z.boolean().optional(),
});

// ── Convite ───────────────────────────────────────────────────────────────────

export const CreateConviteSchema = z.object({
  email: z.string().email("E-mail inválido").max(255),
  nome: nonEmptyString(255),
  perfil: PerfilEnum,
  grupoFormacaoId: z.string().optional().nullable(),
});

// ── Agendamento ───────────────────────────────────────────────────────────────

const TipoEventoAgendaEnum = z.enum(["formacao", "retiro", "convocacao", "reuniao", "outro"]);

const AgendamentoBaseSchema = z.object({
  // Natureza do evento (item eventos avulsos). "formacao" (default) exige
  // formacaoId; os demais (retiro/convocacao/reuniao/outro) exigem título.
  tipoEvento: TipoEventoAgendaEnum.optional(),
  formacaoId: z.string().optional().nullable(),
  formacaoTema: optionalString(500).default(""),
  nivelFormativo: NivelFormativoEnum.optional(),
  tipoFormacao: TipoFormacaoEnum.optional(),
  grupoFormacaoId: z.string().optional().nullable(),
  // Item 1.7: grupos-alvo (multi). Vazio/omisso = org inteira. Precede o campo
  // legado `grupoFormacaoId` quando presente.
  grupoFormacaoIds: z.array(z.string().min(1)).max(50).optional(),
  dataInicio: isoDatetime,
  dataFim: isoDatetime.optional(),
  local: optionalString(500).nullable(),
  linkOnline: z.string().url("URL inválida").max(2048).optional().nullable(),
  status: StatusAgendamentoEnum.optional(),
  participantes: z.number().int().min(0).optional(),
  observacoes: optionalString(2000).nullable(),
  googleCalendarEventId: optionalString(255).nullable(),
});

export const CreateAgendamentoSchema = AgendamentoBaseSchema.superRefine((data, ctx) => {
  const tipo = data.tipoEvento ?? "formacao";
  if (tipo === "formacao") {
    if (!data.formacaoId) {
      ctx.addIssue({ code: "custom", path: ["formacaoId"], message: "Selecione a formação" });
    }
  } else if (!data.formacaoTema || !data.formacaoTema.trim()) {
    ctx.addIssue({ code: "custom", path: ["formacaoTema"], message: "Informe o título do evento" });
  }
});

export const UpdateAgendamentoSchema = AgendamentoBaseSchema.partial();

// ── Compromisso (agenda pessoal do formador) ────────────────────────────────────

const TipoCompromissoEnum = z.enum(["reuniao", "visita", "formacao_pessoal", "outro"]);

export const CreateCompromissoSchema = z.object({
  titulo: z.string().trim().min(1, "Título obrigatório").max(200),
  descricao: optionalString(2000).nullable(),
  tipo: TipoCompromissoEnum,
  dataInicio: isoDatetime,
  dataFim: isoDatetime.optional(),
  local: optionalString(500).nullable(),
  linkOnline: z.string().url("URL inválida").max(2048).optional().nullable(),
  formandoId: z.string().optional().nullable(),
});

export const UpdateCompromissoSchema = CreateCompromissoSchema.partial();

// ── Formação ──────────────────────────────────────────────────────────────────

export const UpdateFormacaoSchema = z.object({
  tema: nonEmptyString(500).optional(),
  objetivo: optionalString(2000),
  descricao: optionalString(2000),
  nivelFormativo: NivelFormativoEnum.optional(),
  tipoFormacao: TipoFormacaoEnum.optional(),
  eixoId: z.string().optional().nullable(),
  eixoNome: optionalString(255).nullable(),
  etapaId: z.string().optional().nullable(),
  etapaNome: optionalString(255).nullable(),
  formadorNome: optionalString(255),
  cargaHoraria: z.number().int().min(0).optional(),
  modalidade: ModalidadeEnum.optional(),
  materialApoio: optionalString(2000).nullable(),
  documentoAnexo: optionalString(500).nullable(),
  documentoAnexoId: optionalString(255).nullable(),
  gradeId: z.string().optional().nullable(),
  gradeNome: optionalString(255).nullable(),
  numero: z.number().int().min(1).optional().nullable(),
  observacoesFormador: optionalString(5000).nullable(),
  vezesUtilizada: z.number().int().min(0).optional(),
});

// ── Formação (criação) ────────────────────────────────────────────────────────

export const CreateFormacaoSchema = UpdateFormacaoSchema.extend({
  tema: nonEmptyString(500),
});

// ── Plano Formativo ───────────────────────────────────────────────────────────

export const StatusPlanoEnum = z.enum(["rascunho", "em-revisao", "ativo", "arquivado"]);

export const EixoPlanoSchema = z.object({
  nome: nonEmptyString(255),
  nomeEtapa: optionalString(255),
  objetivo: optionalString(2000).default(""),
  intervaloEncontros: optionalString(100).default(""),
  cargaHoraria: z.number().int().min(0).default(0),
  areaFormacao: optionalString(255).default(""),
  ordem: z.number().int().min(0).default(0),
});

export const RetiroPlanoSchema = z.object({
  tipo: z.enum(["comunitario", "pessoal"]),
  numero: z.number().int().min(1),
  tema: nonEmptyString(500),
  trechoBiblico: optionalString(500),
  objetivo: optionalString(2000).default(""),
  quandoRealizar: nonEmptyString(255),
  cargaHoraria: z.number().int().min(0).default(0),
});

export const UpdatePlanoSchema = z.object({
  nome: nonEmptyString(500).optional(),
  objetivos: optionalString(2000),
  fundamentacao: optionalString(2000),
  nivelFormativo: NivelFormativoEnum.optional(),
  vigenciaInicio: isoDate.optional(),
  vigenciaFim: isoDate.optional(),
  status: StatusPlanoEnum.optional(),
  documentoAnexo: optionalString(500).nullable(),
  documentoAnexoId: optionalString(255).nullable(),
  eixos: z.array(EixoPlanoSchema).optional(),
  retiros: z.array(RetiroPlanoSchema).optional(),
});

// ── Evento Formando ───────────────────────────────────────────────────────────

export const TipoEventoEnum = z.enum([
  "avaliacao-adesao",
  "solicitacao-desligamento",
  "desligamento",
  "licenca",
  "retiro",
  "aprofundamento",
  "vigilia",
  "missao",
]);

export const NotaAdesaoEnum = z.enum(["otima", "boa", "regular", "insuficiente"]);
export const TipoDesligamentoEnum = z.enum(["voluntario", "compulsorio"]);

export const CreateEventoSchema = z.object({
  formandoId: z.string().min(1, "formandoId obrigatório"),
  tipo: TipoEventoEnum,
  periodoInicio: isoDate.optional(),
  periodoFim: isoDate.optional(),
  notaAdesao: NotaAdesaoEnum.optional().nullable(),
  perspectiva: z.enum(["humana", "espiritual", "comunitaria"]).optional().nullable(),
  textoAvaliacao: optionalString(5000).nullable(),
  motivo: optionalString(2000).nullable(),
  tipoDesligamento: TipoDesligamentoEnum.optional().nullable(),
  dataEfetiva: isoDate.optional(),
  checklistDevolveuEstatuto: z.boolean().optional().nullable(),
  checklistDevolveuSacramental: z.boolean().optional().nullable(),
  checklistApresentouCarta: z.boolean().optional().nullable(),
  checklistAcompanhadoModerador: z.boolean().optional().nullable(),
  dataInicioLicenca: isoDate.optional(),
  dataFimLicenca: isoDate.optional(),
});

// ── Comentário ────────────────────────────────────────────────────────────────

export const TipoComentarioEnum = z.enum(["adesao", "dificuldade", "progresso", "observacao"]);

export const UpdateComentarioSchema = z.object({
  texto: z.string().min(1, "Texto obrigatório").max(5000, "Máximo 5000 caracteres").trim(),
  tipo: TipoComentarioEnum.optional(),
});

// ── Email Template ────────────────────────────────────────────────────────────

const PassoEmailSchema = z.object({
  titulo: z.string().max(200).trim(),
  descricao: z.string().max(500).trim(),
});

export const EmailTemplateSchema = z.object({
  assunto: z.string().max(255).trim().optional(),
  saudacao: z.string().max(500).trim().optional(),
  mensagem1: z.string().max(2000).trim().optional(),
  mensagem2: z.string().max(2000).trim().optional(),
  passos: z.array(PassoEmailSchema).max(10).optional(),
  textoBotao: z.string().max(100).trim().optional(),
  avisoSeguranca: z.string().max(1000).trim().optional(),
  rodape: z.string().max(500).trim().optional(),
});

// ── Registro de organização ───────────────────────────────────────────────────

export const RegistroSchema = z.object({
  orgNome: z.string().min(2, "Nome da organização deve ter ao menos 2 caracteres").max(255).trim(),
  adminEmail: z.string().email("E-mail inválido").max(255),
  adminNome: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(255).trim(),
  senha: z.string().min(8).max(128),
  aceitouPrivacidade: z.boolean().optional(),
  aceitouTermos: z.boolean().optional(),
});

// ── Validação de IDs ─────────────────────────────────────────────────────────

export function isValidId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,50}$/.test(id);
}

// ── Comentário (create) ───────────────────────────────────────────────────────

export const CreateComentarioSchema = z.object({
  formandoId: z.string().min(1, "formandoId obrigatório"),
  texto: z.string().min(1, "Texto obrigatório").max(5000, "Máximo 5000 caracteres").trim(),
  tipo: TipoComentarioEnum.optional(),
  formadorNome: optionalString(255).nullable(),
});

// ── Presença ──────────────────────────────────────────────────────────────────

export const CreatePresencaSchema = z.object({
  agendamentoId: z.string().min(1, "agendamentoId obrigatório"),
  formandoId: z.string().min(1, "formandoId obrigatório"),
  formacaoTema: optionalString(500),
  data: isoDate.optional(),
  presente: z.boolean().optional(),
  justificativa: optionalString(1000).nullable(),
});

export const UpdatePresencaSchema = z.object({
  presente: z.boolean().optional(),
  justificativa: optionalString(1000).nullable(),
});

// ── Plano (create) ────────────────────────────────────────────────────────────

export const CreatePlanoSchema = UpdatePlanoSchema.extend({
  nome: nonEmptyString(500),
});

// ── Evento Formando (update) ──────────────────────────────────────────────────

export const UpdateEventoSchema = CreateEventoSchema.omit({ formandoId: true }).partial();

// ── Grade Formativa ───────────────────────────────────────────────────────────

const EixoGradeSchema = z.object({
  id: z.string(),
  nome: nonEmptyString(500),
  descricao: optionalString(2000).default(""),
  ordem: z.number().int().min(0),
  cor: optionalString(50).nullable(),
  eixoPlanoId: z.string().optional().nullable(),
});

const EtapaGradeSchema = z.object({
  eixoId: z.string(),
  nome: nonEmptyString(500),
  descricao: optionalString(2000).default(""),
  ordem: z.number().int().min(0),
  cargaHoraria: z.number().int().min(0),
});

export const CreateGradeSchema = z.object({
  planoId: z.string().min(1, "planoId obrigatório"),
  nome: nonEmptyString(500),
  planoNome: optionalString(500).default(""),
  nivelFormativo: NivelFormativoEnum.optional(),
  vigenciaInicio: isoDate.optional(),
  vigenciaFim: isoDate.optional(),
  versao: optionalString(50).default("1.0"),
  totalFormacoes: z.number().int().min(0).optional(),
  objetivos: optionalString(2000).nullable(),
  fundamentacao: optionalString(2000).nullable(),
  documentoAnexo: optionalString(500).nullable(),
  documentoAnexoId: optionalString(255).nullable(),
  ativo: z.boolean().optional(),
  eixos: z.array(EixoGradeSchema).optional(),
  etapas: z.array(EtapaGradeSchema).optional(),
});

export const UpdateGradeSchema = CreateGradeSchema.partial();

// ── Progresso de Etapa ───────────────────────────────────────────────────────

export const UpdateProgressoEtapaSchema = z.object({
  nivelFormativo: NivelFormativoEnum,
  dataMissaCompromisso: isoDate.nullable().optional(),
  iniciouEm: isoDate.nullable().optional(),
  concluiuEm: isoDate.nullable().optional(),
});

// ── Web Push ──────────────────────────────────────────────────────────────────

export const PushSubscribeSchema = z.object({
  endpoint: z.string().url("endpoint inválido").max(2048),
  p256dh: z.string().min(1, "p256dh obrigatório").max(500),
  auth: z.string().min(1, "auth obrigatório").max(500),
});

export const PushUnsubscribeSchema = z.object({
  endpoint: z.string().url("endpoint inválido").max(2048),
});

export const PushSendSchema = z.object({
  titulo: nonEmptyString(100),
  corpo: nonEmptyString(300),
  // Apenas caminho relativo same-origin (ex.: "/agenda"). Bloqueia URLs absolutas
  // ("https://evil.com"), protocol-relative ("//evil.com") e backslash ("/\evil.com",
  // que o parser WHATWG normaliza para "//evil.com") — o service worker abre essa
  // URL no clique da notificação, então uma URL externa seria open-redirect/phishing.
  url: z.string().max(2048).regex(/^\/(?![/\\])/, "URL deve ser um caminho relativo iniciando com /").optional(),
  grupoFormacaoId: z.string().optional(),
});

// ── Helpers de resposta ───────────────────────────────────────────────────────

export function parseBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { ok: true; data: T } | { ok: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    const field = first.path.join(".");
    return { ok: false, error: field ? `${field}: ${first.message}` : first.message };
  }
  return { ok: true, data: result.data };
}

/**
 * Lê e faz parse do corpo JSON da requisição de forma segura. Corpo ausente,
 * vazio ou malformado → `{ ok: false }` (o chamador deve responder 400) em vez
 * de deixar `request.json()` lançar e virar 500.
 */
export async function readJson(
  request: Request
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  try {
    return { ok: true, data: await request.json() };
  } catch {
    return { ok: false, error: "JSON inválido" };
  }
}

/**
 * Lê o corpo JSON com segurança e valida contra o schema em um passo só.
 * Malformado → 400 ("JSON inválido"); inválido pelo schema → 400 (mensagem do campo).
 * Substitui o idiom `parseBody(Schema, await request.json())`, que estourava 500
 * quando o corpo não era JSON válido.
 */
export async function parseJson<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const read = await readJson(request);
  if (!read.ok) return read;
  return parseBody(schema, read.data);
}
