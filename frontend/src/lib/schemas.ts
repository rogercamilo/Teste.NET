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
  "formador_pedagogico",
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
  foto: z.string().max(2_000_000).nullable().optional(),
});

// ── Formando ──────────────────────────────────────────────────────────────────

export const CreateFormandoSchema = z.object({
  nome: nonEmptyString(255),
  dataNascimento: isoDate.optional(),
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
  endereco: optionalString(255).nullable(),
  numero: optionalString(30).nullable(),
  complemento: optionalString(120).nullable(),
  bairro: optionalString(120).nullable(),
  cidade: optionalString(120).nullable(),
  estado: optionalString(60).nullable(),
  paisResidencia: optionalString(60).nullable(),
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

// Perfil self-service no Portal (a própria pessoa edita seus DADOS PESSOAIS em
// /portal/perfil). Whitelist RÍGIDA: `.strict()` faz o zod REJEITAR qualquer
// campo formativo (nivelFormativo, grupoFormacaoId, modalidade, dataIngresso,
// ativo, totalFormacoes…) — a fronteira de responsabilidade formador×pessoa é
// imposta aqui, não só na rota. Ver project-cadastro-minimo-perfil.
export const PerfilPortalSchema = z
  .object({
    // Nome completo é editável pela própria pessoa (identidade). E-mail NÃO entra
    // aqui: é o login do portal e só o responsável o altera no app.
    nome: nonEmptyString(255).optional(),
    dataNascimento: isoDate.nullable().optional(),
    estadoCivil: EstadoCivilEnum.optional(),
    telefone: z.string().max(30).optional(),
    foto: z.string().max(2_000_000).nullable().optional(),
    nomeSocial: optionalString(255).nullable(),
    // Endereço residencial
    endereco: optionalString(255).nullable(),
    numero: optionalString(30).nullable(),
    complemento: optionalString(120).nullable(),
    bairro: optionalString(120).nullable(),
    cidade: optionalString(120).nullable(),
    estado: optionalString(60).nullable(),
    paisResidencia: optionalString(60).nullable(),
    cep: optionalString(10).nullable(),
    // Campos canônicos (documentos eclesiásticos) — opcionais
    nacionalidade: optionalString(100).nullable(),
    rg: optionalString(30).nullable(),
    orgaoEmissor: optionalString(50).nullable(),
    paroquiaReferencia: optionalString(255).nullable(),
    numFilhos: z.number().int().min(0).nullable().optional(),
  })
  .strict();

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

// Acompanhamento do FORMANDO (jornada formativa comunitária): o formador marca a
// data e, opcionalmente, uma nota privada. `atendeSolicitacaoId` liga o encontro
// a um pedido pendente do formando (marca a solicitação como agendada).
export const CreateAcompanhamentoFormandoSchema = z.object({
  data: isoDate,
  nota: optionalString(4000).nullable(),
  atendeSolicitacaoId: z.string().optional(),
});

// ── Leitura Vocacional (indicações de leitura da turma) ───────────────────────
// Cada capítulo é um objeto: o título (obrigatório) mais os campos de material
// formativo (todos OPCIONAIS), definidos capítulo a capítulo no cadastro do
// livro e exibidos na estrutura da leitura no portal. A API numera 1..N na ordem
// recebida. Strings vazias viram null no store.
const capituloLeitura = z.object({
  titulo: nonEmptyString(200),
  // Meta de conclusão (YYYY-MM-DD) — define a cadência da leitura. Null = sem meta.
  metaConclusao: isoDate.nullable().optional(),
  objetivo: optionalString(2000).nullable(),
  palavrasChave: optionalString(500).nullable(),
  comentarios: optionalString(4000).nullable(),
  // Perguntas individuais persistidas como texto (uma por linha) — teto maior
  // para acomodar várias perguntas por capítulo.
  perguntas: optionalString(8000).nullable(),
  acaoPratica: optionalString(2000).nullable(),
  partilha: optionalString(2000).nullable(),
});

const capitulosLeitura = z
  .array(capituloLeitura)
  .min(1, "Informe ao menos um capítulo")
  .max(120, "Máximo 120 capítulos");

// Capa: storageKey do upload (curta) — não é URL nem base64. optional+nullable
// permite não enviar (mantém) ou enviar null (remove).
const capaLeitura = optionalString(500).nullable();

export const CreateLeituraSchema = z.object({
  titulo: nonEmptyString(200),
  autor: optionalString(120).nullable(),
  capaUrl: capaLeitura,
  capitulos: capitulosLeitura,
});

export const UpdateLeituraSchema = z.object({
  titulo: nonEmptyString(200).optional(),
  autor: optionalString(120).nullable(),
  capaUrl: capaLeitura,
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

// Evangelização da Travessia (portal do vocacionado): o vocacionado registra ter
// divulgado sua leitura no Instagram (card on-brand + share nativo, sem URL) ou
// no YouTube (link do vídeo). Rende Fruto uma vez por rede na travessia inteira.
export const EvangelizacaoSchema = z
  .object({
    rede: z.enum(["instagram", "youtube"]),
    url: z.string().trim().max(300, "Link muito longo").optional(),
  })
  // YouTube: link obrigatório e do próprio YouTube.
  .refine((v) => v.rede !== "youtube" || !!v.url, {
    message: "Informe o link do vídeo no YouTube",
    path: ["url"],
  })
  .refine(
    (v) =>
      v.rede !== "youtube" ||
      !v.url ||
      /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(v.url),
    { message: "Informe um link do YouTube", path: ["url"] }
  )
  // Instagram: link OPCIONAL (o vocacionado compartilha se quiser); se vier, do Instagram.
  .refine(
    (v) =>
      v.rede !== "instagram" ||
      !v.url ||
      /^https?:\/\/(www\.)?(instagram\.com|instagr\.am)\//i.test(v.url),
    { message: "Informe um link do Instagram", path: ["url"] }
  );

// Opt-in do vocacionado no Mural de Frutos da turma.
export const MuralOptInSchema = z.object({ optIn: z.boolean() });

// Formador liga/desliga o Mural de Frutos na turma.
export const MuralTurmaSchema = z.object({ ativo: z.boolean() });

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
  termoPromessa: optionalString(100),
  termoConsagracao: optionalString(100),
  termoConsagrado: optionalString(100),
  // Blocos de texto dos documentos (Fase 3). Chaves/limite reforçados na rota.
  documentosTextos: z.record(z.string(), z.string().max(4000)).optional(),
  vocacionalHabilitado: z.boolean().optional(),
  termoVocacional: optionalString(100),
  termoAcompanhamentoVocacional: optionalString(100),
  vocacionalDuracaoPadraoMeses: z.number().int().min(1).max(24).optional(),
  emailAgendamentoAtivo: z.boolean().optional(),
  // Redes sociais da comunidade (evangelização da Travessia). O handle chega com
  // ou sem "@"; a rota normaliza tirando o "@" e espaços. YouTube deve ser URL.
  instagramHandle: z
    .string()
    .max(64, "Máximo 64 caracteres")
    .trim()
    .optional()
    .nullable(),
  youtubeUrl: z
    .string()
    .trim()
    .max(300, "Máximo 300 caracteres")
    .refine((v) => v === "" || /^https?:\/\//i.test(v), { message: "Informe uma URL válida" })
    .optional()
    .nullable(),
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

const TipoEventoAgendaEnum = z.enum([
  "formacao",
  "formacao_complementar",
  "retiro",
  "convocacao",
  "reuniao",
  "outro",
  "acompanhamento_comunitario",
]);

const AgendamentoBaseSchema = z.object({
  // Natureza do evento (item eventos avulsos). "formacao" (default) exige
  // formacaoId; os demais (retiro/convocacao/reuniao/outro) exigem título.
  tipoEvento: TipoEventoAgendaEnum.optional(),
  formacaoId: z.string().optional().nullable(),
  // Sem `.default("")`: com o default, `UpdateAgendamentoSchema.partial()` ainda
  // injetava "" quando o campo era omitido (ex.: PATCH de status), apagando o
  // nome do evento. O POST usa `?? ""` como fallback próprio, então o create não
  // depende do default. Ver histórico: perda do nome ao confirmar/editar.
  formacaoTema: optionalString(500),
  nivelFormativo: NivelFormativoEnum.optional(),
  tipoFormacao: TipoFormacaoEnum.optional(),
  grupoFormacaoId: z.string().optional().nullable(),
  // Item 1.7: grupos-alvo (multi). Vazio/omisso = org inteira. Precede o campo
  // legado `grupoFormacaoId` quando presente.
  grupoFormacaoIds: z.array(z.string().min(1)).max(50).optional(),
  // Acompanhamento Comunitário (1:1): exatamente UM dos dois alvos. formando p/
  // o fluxo do FC; usuário-formador p/ o fluxo do Formador Geral.
  acompanhadoFormandoId: z.string().min(1).optional().nullable(),
  acompanhadoUsuarioId: z.string().min(1).optional().nullable(),
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
  } else if (tipo === "acompanhamento_comunitario") {
    // Encontro 1:1: exatamente um alvo (formando XOR usuário-formador).
    const alvos = [data.acompanhadoFormandoId, data.acompanhadoUsuarioId].filter(Boolean);
    if (alvos.length !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["acompanhadoFormandoId"],
        message: "Selecione a pessoa a ser acompanhada",
      });
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

export const OrigemFormacaoEnum = z.enum(["prevista", "complementar"]);
export const StatusRealizacaoEnum = z.enum(["registrada", "realizada"]);

export const UpdateFormacaoSchema = z.object({
  tema: nonEmptyString(500).optional(),
  objetivo: optionalString(2000),
  descricao: optionalString(2000),
  nivelFormativo: NivelFormativoEnum.optional(),
  tipoFormacao: TipoFormacaoEnum.optional(),
  // Vínculo com o caminho (FK; nomes não são mais enviados — resolvidos na leitura)
  planoId: z.string().optional().nullable(),
  gradeId: z.string().optional().nullable(),
  eixoId: z.string().optional().nullable(),
  numero: z.number().int().min(1).optional().nullable(),
  // Origem no plano (origemPor/origemEm são carimbados no servidor)
  origem: OrigemFormacaoEnum.optional(),
  // Governança da formação pontual
  codigo: optionalString(50).nullable(),
  responsavelInstitucional: optionalString(255).nullable(),
  dataRealizacao: isoDate.optional().nullable(),
  contextoRealizacao: optionalString(2000).nullable(),
  statusRealizacao: StatusRealizacaoEnum.optional(),
  cargaHoraria: z.number().int().min(0).optional(),
  modalidade: ModalidadeEnum.optional(),
  materialApoio: optionalString(2000).nullable(),
  documentoAnexo: optionalString(500).nullable(),
  documentoAnexoId: optionalString(255).nullable(),
  materialFormadorAnexo: optionalString(500).nullable(),
  materialFormadorAnexoId: optionalString(255).nullable(),
  observacoesFormador: optionalString(5000).nullable(),
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

export const StatusPresencaSchema = z.enum(["presente", "ausente", "justificado"]);

export const CreatePresencaSchema = z.object({
  agendamentoId: z.string().min(1, "agendamentoId obrigatório"),
  formandoId: z.string().min(1, "formandoId obrigatório"),
  formacaoTema: optionalString(500),
  data: isoDate.optional(),
  presente: z.boolean().optional(),
  statusFormador: StatusPresencaSchema.optional(),
  justificativa: optionalString(1000).nullable(),
});

export const UpdatePresencaSchema = z.object({
  presente: z.boolean().optional(),
  statusFormador: StatusPresencaSchema.optional(),
  justificativa: optionalString(1000).nullable(),
});

// Chamada em lote: uma sessão, várias marcações — salva numa transação única
// (evita N requests que estouram o rate-limit; ver feedback batch-mutations).
export const BulkPresencaSchema = z.object({
  agendamentoId: z.string().min(1, "agendamentoId obrigatório"),
  marcacoes: z
    .array(
      z.object({
        formandoId: z.string().min(1),
        status: StatusPresencaSchema,
        justificativa: optionalString(1000).nullable(),
      })
    )
    .min(1, "Envie ao menos uma marcação")
    .max(500),
});

// ── Plano (create) ────────────────────────────────────────────────────────────

export const CreatePlanoSchema = UpdatePlanoSchema.extend({
  nome: nonEmptyString(500),
});

// ── Evento Formando (update) ──────────────────────────────────────────────────

export const UpdateEventoSchema = CreateEventoSchema.omit({ formandoId: true }).partial();

// ── Grade Formativa ───────────────────────────────────────────────────────────

// Formações da grade enviadas EM LOTE junto do payload da grade — persistidas
// atomicamente no servidor (uma transação), em vez de N POSTs disparados pelo
// navegador (que estouravam o rate-limit de mutação e perdiam dados).
//
// `id` (quando presente) é o id de uma formação já existente: o servidor
// reconcilia PELO id (update), nunca "apaga tudo e recria pelo nome" — assim
// renomear/remover um eixo no plano jamais faz uma formação sumir em silêncio.
// `eixoPlanoId` é apenas o eixo (do PLANO) onde a formação está indicada; o
// `eixoId` real é resolvido no servidor a partir dele. Formação sem
// `eixoPlanoId` é avulsa (grade sem eixos). `numero` é sequencial na ordem.
export const GradeFormacaoInputSchema = z.object({
  id: z.string().optional(),
  eixoPlanoId: z.string().optional().nullable(),
  eixoNome: optionalString(255).nullable(),
  tema: nonEmptyString(500),
  objetivo: optionalString(2000),
  descricao: optionalString(2000),
  cargaHoraria: z.number().int().min(0).default(2),
  modalidade: ModalidadeEnum.default("presencial"),
  observacoesFormador: optionalString(5000).nullable(),
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
  // NB: a grade NÃO recebe eixos do cliente. Eixos são projeção estável do
  // plano formativo (sincronizados no servidor por `eixoPlanoId`). O único dado
  // que o usuário insere na grade são as formações.
  formacoes: z.array(GradeFormacaoInputSchema).max(500).optional(),
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
