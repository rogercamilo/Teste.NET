import type {
  Agendamento, ComentarioFormando, EventoFormando, Formacao,
  Formando, ProgressoEtapa, GradeFormativa, Eixo, Etapa,
  GrupoFormacao, PlanoFormativo, EixoPlano, RetiroPlano, PresencaFormacao,
  RelatorioEtapa, NotaAdesao, NivelFormativo, RecomendacaoEtapa, StatusRelatorio,
  Compromisso, TipoCompromisso,
} from "@/types";

// ---------------------------------------------------------------------------
// Input shapes — structural types matching Prisma query results
// ---------------------------------------------------------------------------

export type PrismaAgendamento = {
  id: string; organizacaoId: string; formacaoId: string | null; formacaoTema: string;
  tipoEvento: string;
  nivelFormativo: string; tipoFormacao: string; formadorId: string; formadorNome: string;
  grupoFormacaoId: string | null;
  dataInicio: Date; dataFim: Date; local: string | null; linkOnline: string | null;
  status: string; participantes: number; observacoes: string | null;
  googleCalendarEventId: string | null; criadoEm: Date;
  grupos?: { grupoFormacaoId: string }[];
  acompanhadoFormandoId?: string | null;
  acompanhadoUsuarioId?: string | null;
  acompanhadoFormando?: { nome: string } | null;
  acompanhadoUsuario?: { nome: string } | null;
};

export type PrismaCompromisso = {
  id: string; organizacaoId: string; formadorId: string; titulo: string; descricao: string | null;
  dataInicio: Date; dataFim: Date; local: string | null; linkOnline: string | null;
  tipo: string; formandoId: string | null; formandoNome: string | null;
  googleCalendarEventId: string | null; criadoEm: Date;
};

export type PrismaComentario = {
  id: string; organizacaoId: string; formandoId: string; formandoNome: string;
  formadorId: string; formadorNome: string | null; texto: string; tipo: string; criadoEm: Date;
};

export type PrismaEvento = {
  id: string; organizacaoId: string; formandoId: string; formadorId: string; tipo: string;
  periodoInicio: Date | null; periodoFim: Date | null; notaAdesao: string | null;
  perspectiva: string | null;
  textoAvaliacao: string | null; motivo: string | null; tipoDesligamento: string | null;
  dataEfetiva: Date | null; checklistDevolveuEstatuto: boolean | null;
  checklistDevolveuSacramental: boolean | null; checklistApresentouCarta: boolean | null;
  checklistAcompanhadoModerador: boolean | null; dataInicioLicenca: Date | null;
  dataFimLicenca: Date | null; criadoEm: Date;
};

export type PrismaFormacao = {
  id: string; organizacaoId: string | null; tema: string; objetivo: string; descricao: string;
  nivelFormativo: string; tipoFormacao: string;
  planoId: string | null; gradeId: string | null; eixoId: string | null; numero: number | null;
  origem: string; origemPor: string | null; origemEm: Date | null;
  codigo: string | null; responsavelInstitucional: string | null;
  dataRealizacao: Date | null; contextoRealizacao: string | null; statusRealizacao: string;
  cargaHoraria: number; modalidade: string; materialApoio: string | null;
  documentoAnexo: string | null; documentoAnexoId: string | null;
  materialFormadorAnexo: string | null; materialFormadorAnexoId: string | null;
  observacoesFormador: string | null;
  revisadoEm: Date | null; revisadoPor: string | null;
  criadoEm: Date;
  // Relações resolvidas por join (nome vem da FK, não denormalizado).
  plano?: { nome: string } | null;
  grade?: { nome: string } | null;
  eixo?: { nome: string } | null;
  // Contagem de realizações (Agendamento), quando o read path inclui _count.
  _count?: { agendamentos: number };
};

export type PrismaFormando = {
  id: string; organizacaoId: string; nome: string; dataNascimento: Date | null; estadoCivil: string;
  modalidade: string; nivelFormativo: string; dataIngresso: Date; telefone: string; email: string;
  ativo: boolean; motivoInatividade: string | null; foto?: string | null; turmaId: string | null;
  grupoFormacaoId: string | null; totalFormacoes: number; formacoesRealizadas: number;
  nomeSocial: string | null; nacionalidade: string | null; rg: string | null;
  orgaoEmissor: string | null; cep: string | null; paroquiaReferencia: string | null;
  numFilhos: number | null;
  endereco: string | null; numero: string | null; complemento: string | null;
  bairro: string | null; cidade: string | null; estado: string | null; paisResidencia: string | null;
  progressoEtapas: {
    id: string; formandoId: string; nivelFormativo: string;
    formacoesComunitariasRealizadas: number; retirosComunitariosRealizados: number;
    retirosPessoaisRealizados: number; iniciouEm: Date | null; concluiuEm: Date | null;
    dataMissaCompromisso: Date | null;
  }[];
};

export type PrismaGrade = {
  id: string; organizacaoId: string | null; nome: string; planoId: string; planoNome: string;
  nivelFormativo: string; vigenciaInicio: Date; vigenciaFim: Date; versao: string;
  totalFormacoes: number; objetivos: string | null; fundamentacao: string | null;
  documentoAnexo: string | null; documentoAnexoId: string | null; ativo: boolean;
  revisadoEm: Date | null; revisadoPor: string | null;
  criadoEm: Date;
  eixos: {
    id: string; gradeId: string; nome: string; descricao: string; ordem: number; cor: string | null;
    eixoPlanoId: string | null;
    etapas: { id: string; eixoId: string; nome: string; descricao: string; ordem: number; cargaHoraria: number }[];
  }[];
};

export type PrismaGrupoFormacao = {
  id: string; organizacaoId: string; nome: string; localReuniao: string | null;
  tipo: string; nivelFormativo: string | null; formadorId: string | null; planoId: string | null;
  gradeId: string | null; vigenciaInicio: Date | null; vigenciaFim: Date | null;
  imagemUrl?: string | null; ativo: boolean; criadoEm: Date;
};

export type PrismaPlano = {
  id: string; organizacaoId: string | null; nome: string; objetivos: string; fundamentacao: string;
  nivelFormativo: string; vigenciaInicio: Date; vigenciaFim: Date; status: string;
  documentoAnexo: string | null; documentoAnexoId: string | null; criadoEm: Date; atualizadoEm: Date;
  eixos: { id: string; nome: string; nomeEtapa: string | null; objetivo: string; intervaloEncontros: string; cargaHoraria: number; areaFormacao: string; ordem: number }[];
  retiros: { id: string; planoId: string; tipo: string; numero: number; tema: string; trechoBiblico: string | null; objetivo: string; quandoRealizar: string; cargaHoraria: number }[];
};

export type PrismaPresenca = {
  id: string; organizacaoId: string; agendamentoId: string; formacaoTema: string;
  data: Date; formandoId: string; formandoNome: string; nivelFormativo: string;
  presente: boolean; statusFormador: string | null; justificativa: string | null;
  confirmacaoFormando: boolean | null; justificativaFormando: string | null;
};

// ---------------------------------------------------------------------------
// Converters
// ---------------------------------------------------------------------------

export function toAgendamento(a: PrismaAgendamento): Agendamento {
  return {
    id: a.id, formacaoId: a.formacaoId ?? undefined, formacaoTema: a.formacaoTema,
    nivelFormativo: a.nivelFormativo as Agendamento["nivelFormativo"],
    tipoFormacao: a.tipoFormacao as Agendamento["tipoFormacao"],
    tipoEvento: (a.tipoEvento as Agendamento["tipoEvento"]) ?? "formacao",
    formadorId: a.formadorId, formadorNome: a.formadorNome,
    grupoFormacaoId: a.grupoFormacaoId ?? undefined,
    grupoFormacaoIds: a.grupos
      ? a.grupos.map((g) => g.grupoFormacaoId)
      : a.grupoFormacaoId
        ? [a.grupoFormacaoId]
        : [],
    dataInicio: a.dataInicio.toISOString(), dataFim: a.dataFim.toISOString(),
    local: a.local ?? undefined, linkOnline: a.linkOnline ?? undefined,
    status: a.status as Agendamento["status"], participantes: a.participantes,
    acompanhadoFormandoId: a.acompanhadoFormandoId ?? undefined,
    acompanhadoUsuarioId: a.acompanhadoUsuarioId ?? undefined,
    acompanhadoNome: a.acompanhadoFormando?.nome ?? a.acompanhadoUsuario?.nome ?? undefined,
    observacoes: a.observacoes ?? undefined,
    googleCalendarEventId: a.googleCalendarEventId ?? undefined,
    criadoEm: a.criadoEm.toISOString(),
  };
}

export function toCompromisso(c: PrismaCompromisso): Compromisso {
  return {
    id: c.id, formadorId: c.formadorId, titulo: c.titulo,
    descricao: c.descricao ?? undefined,
    dataInicio: c.dataInicio.toISOString(), dataFim: c.dataFim.toISOString(),
    local: c.local ?? undefined, linkOnline: c.linkOnline ?? undefined,
    tipo: c.tipo as TipoCompromisso,
    formandoId: c.formandoId ?? undefined, formandoNome: c.formandoNome ?? undefined,
    googleCalendarEventId: c.googleCalendarEventId ?? undefined,
    criadoEm: c.criadoEm.toISOString(),
  };
}

export function toComentario(c: PrismaComentario): ComentarioFormando {
  return {
    id: c.id, formandoId: c.formandoId, formandoNome: c.formandoNome,
    formadorId: c.formadorId, formadorNome: c.formadorNome ?? undefined,
    texto: c.texto, tipo: c.tipo as ComentarioFormando["tipo"],
    criadoEm: c.criadoEm.toISOString(),
  };
}

export function toEvento(e: PrismaEvento): EventoFormando {
  return {
    id: e.id, formandoId: e.formandoId, formadorId: e.formadorId,
    tipo: e.tipo as EventoFormando["tipo"], criadoEm: e.criadoEm.toISOString(),
    periodoInicio: e.periodoInicio?.toISOString().split("T")[0],
    periodoFim: e.periodoFim?.toISOString().split("T")[0],
    notaAdesao: e.notaAdesao as EventoFormando["notaAdesao"] ?? undefined,
    perspectiva: e.perspectiva as EventoFormando["perspectiva"] ?? undefined,
    textoAvaliacao: e.textoAvaliacao ?? undefined, motivo: e.motivo ?? undefined,
    tipoDesligamento: e.tipoDesligamento as EventoFormando["tipoDesligamento"] ?? undefined,
    dataEfetiva: e.dataEfetiva?.toISOString().split("T")[0],
    checklistDevolveuEstatuto: e.checklistDevolveuEstatuto ?? undefined,
    checklistDevolveuSacramental: e.checklistDevolveuSacramental ?? undefined,
    checklistApresentouCarta: e.checklistApresentouCarta ?? undefined,
    checklistAcompanhadoModerador: e.checklistAcompanhadoModerador ?? undefined,
    dataInicioLicenca: e.dataInicioLicenca?.toISOString().split("T")[0],
    dataFimLicenca: e.dataFimLicenca?.toISOString().split("T")[0],
  };
}

export function toFormacao(f: PrismaFormacao): Formacao {
  return {
    id: f.id, tema: f.tema, objetivo: f.objetivo, descricao: f.descricao,
    nivelFormativo: f.nivelFormativo as Formacao["nivelFormativo"],
    tipoFormacao: f.tipoFormacao as Formacao["tipoFormacao"],
    planoId: f.planoId ?? undefined, planoNome: f.plano?.nome ?? undefined,
    gradeId: f.gradeId ?? undefined, gradeNome: f.grade?.nome ?? undefined,
    eixoId: f.eixoId ?? undefined, eixoNome: f.eixo?.nome ?? undefined,
    numero: f.numero ?? undefined,
    origem: f.origem as Formacao["origem"],
    origemPor: f.origemPor ?? undefined,
    origemEm: f.origemEm?.toISOString(),
    codigo: f.codigo ?? undefined,
    responsavelInstitucional: f.responsavelInstitucional ?? undefined,
    dataRealizacao: f.dataRealizacao?.toISOString().split("T")[0],
    contextoRealizacao: f.contextoRealizacao ?? undefined,
    statusRealizacao: f.statusRealizacao as Formacao["statusRealizacao"],
    cargaHoraria: f.cargaHoraria, modalidade: f.modalidade as Formacao["modalidade"],
    materialApoio: f.materialApoio ?? undefined, documentoAnexo: f.documentoAnexo ?? undefined,
    documentoAnexoId: f.documentoAnexoId ?? undefined,
    materialFormadorAnexo: f.materialFormadorAnexo ?? undefined,
    materialFormadorAnexoId: f.materialFormadorAnexoId ?? undefined,
    observacoesFormador: f.observacoesFormador ?? undefined,
    revisadoEm: f.revisadoEm?.toISOString() ?? undefined,
    revisadoPor: f.revisadoPor ?? undefined,
    realizacoes: f._count?.agendamentos,
    criadoEm: f.criadoEm.toISOString(),
  };
}

export function toFormando(f: PrismaFormando): Formando {
  return {
    id: f.id, nome: f.nome,
    dataNascimento: f.dataNascimento ? f.dataNascimento.toISOString().split("T")[0] : undefined,
    estadoCivil: f.estadoCivil as Formando["estadoCivil"],
    modalidade: f.modalidade as Formando["modalidade"],
    nivelFormativo: f.nivelFormativo as Formando["nivelFormativo"],
    dataIngresso: f.dataIngresso.toISOString().split("T")[0],
    telefone: f.telefone, email: f.email, ativo: f.ativo,
    motivoInatividade: f.motivoInatividade as Formando["motivoInatividade"] ?? undefined,
    foto: f.foto ?? undefined, turmaId: f.turmaId ?? undefined,
    grupoFormacaoId: f.grupoFormacaoId ?? undefined,
    totalFormacoes: f.totalFormacoes, formacoesRealizadas: f.formacoesRealizadas,
    nomeSocial: f.nomeSocial ?? undefined,
    nacionalidade: f.nacionalidade ?? undefined,
    rg: f.rg ?? undefined,
    orgaoEmissor: f.orgaoEmissor ?? undefined,
    cep: f.cep ?? undefined,
    paroquiaReferencia: f.paroquiaReferencia ?? undefined,
    numFilhos: f.numFilhos ?? undefined,
    endereco: f.endereco ?? undefined,
    numero: f.numero ?? undefined,
    complemento: f.complemento ?? undefined,
    bairro: f.bairro ?? undefined,
    cidade: f.cidade ?? undefined,
    estado: f.estado ?? undefined,
    paisResidencia: f.paisResidencia ?? undefined,
    progressoEtapas: f.progressoEtapas.map((p): ProgressoEtapa => ({
      nivel: p.nivelFormativo as ProgressoEtapa["nivel"],
      formacoesComunitariasRealizadas: p.formacoesComunitariasRealizadas,
      retirosComunitariosRealizados: p.retirosComunitariosRealizados,
      retirosPessoaisRealizados: p.retirosPessoaisRealizados,
      iniciouEm: p.iniciouEm?.toISOString().split("T")[0],
      concluiuEm: p.concluiuEm?.toISOString().split("T")[0],
      dataMissaCompromisso: p.dataMissaCompromisso?.toISOString().split("T")[0],
    })),
  };
}

export function toGrade(g: PrismaGrade): GradeFormativa {
  return {
    id: g.id, nome: g.nome, planoId: g.planoId, planoNome: g.planoNome,
    nivelFormativo: g.nivelFormativo as GradeFormativa["nivelFormativo"],
    vigenciaInicio: g.vigenciaInicio.toISOString().split("T")[0],
    vigenciaFim: g.vigenciaFim.toISOString().split("T")[0],
    versao: g.versao,
    eixos: g.eixos.map((e): Eixo => ({
      id: e.id, nome: e.nome, descricao: e.descricao, gradeId: e.gradeId,
      ordem: e.ordem, cor: e.cor ?? undefined, eixoPlanoId: e.eixoPlanoId ?? undefined,
    })),
    etapas: g.eixos.flatMap((e) =>
      e.etapas.map((t): Etapa => ({
        id: t.id, nome: t.nome, descricao: t.descricao, eixoId: t.eixoId,
        ordem: t.ordem, cargaHoraria: t.cargaHoraria,
      }))
    ),
    totalFormacoes: g.totalFormacoes,
    objetivos: g.objetivos ?? undefined, fundamentacao: g.fundamentacao ?? undefined,
    documentoAnexo: g.documentoAnexo ?? undefined, documentoAnexoId: g.documentoAnexoId ?? undefined,
    ativo: g.ativo,
    revisadoEm: g.revisadoEm?.toISOString() ?? undefined,
    revisadoPor: g.revisadoPor ?? undefined,
    criadoEm: g.criadoEm.toISOString(),
  };
}

export function toGrupoFormacao(m: PrismaGrupoFormacao): GrupoFormacao {
  return {
    id: m.id, nome: m.nome, localReuniao: m.localReuniao ?? undefined,
    tipo: m.tipo as GrupoFormacao["tipo"],
    nivelFormativo: m.nivelFormativo ? m.nivelFormativo as GrupoFormacao["nivelFormativo"] : undefined,
    formadorId: m.formadorId ?? undefined, planoId: m.planoId ?? undefined,
    gradeId: m.gradeId ?? undefined,
    vigenciaInicio: m.vigenciaInicio?.toISOString().split("T")[0],
    vigenciaFim: m.vigenciaFim?.toISOString().split("T")[0],
    imagemUrl: m.imagemUrl ?? undefined,
    ativo: m.ativo, criadoEm: m.criadoEm.toISOString(),
  };
}

export function toPlano(p: PrismaPlano): PlanoFormativo {
  return {
    id: p.id, nome: p.nome, objetivos: p.objetivos, fundamentacao: p.fundamentacao,
    nivelFormativo: p.nivelFormativo as PlanoFormativo["nivelFormativo"],
    eixos: p.eixos.map((e): EixoPlano => ({
      id: e.id, nome: e.nome, nomeEtapa: e.nomeEtapa ?? undefined, objetivo: e.objetivo,
      intervaloEncontros: e.intervaloEncontros, cargaHoraria: e.cargaHoraria,
      areaFormacao: e.areaFormacao, ordem: e.ordem,
    })),
    retiros: p.retiros.map((r): RetiroPlano => ({
      id: r.id, planoId: r.planoId, tipo: r.tipo as RetiroPlano["tipo"],
      numero: r.numero, tema: r.tema, trechoBiblico: r.trechoBiblico ?? undefined,
      objetivo: r.objetivo, quandoRealizar: r.quandoRealizar, cargaHoraria: r.cargaHoraria,
    })),
    vigenciaInicio: p.vigenciaInicio.toISOString().split("T")[0],
    vigenciaFim: p.vigenciaFim.toISOString().split("T")[0],
    status: p.status as PlanoFormativo["status"],
    documentoAnexo: p.documentoAnexo ?? undefined, documentoAnexoId: p.documentoAnexoId ?? undefined,
    criadoEm: p.criadoEm.toISOString(), atualizadoEm: p.atualizadoEm.toISOString(),
  };
}

export function toPresenca(p: PrismaPresenca): PresencaFormacao {
  return {
    id: p.id, agendamentoId: p.agendamentoId, formacaoTema: p.formacaoTema,
    data: p.data.toISOString().split("T")[0], formandoId: p.formandoId,
    formandoNome: p.formandoNome,
    nivelFormativo: p.nivelFormativo as PresencaFormacao["nivelFormativo"],
    presente: p.presente,
    statusFormador: (p.statusFormador ?? undefined) as PresencaFormacao["statusFormador"],
    justificativa: p.justificativa ?? undefined,
    confirmacaoFormando: p.confirmacaoFormando,
    justificativaFormando: p.justificativaFormando ?? undefined,
  };
}

export type PrismaRelatorio = {
  id: string; organizacaoId: string; formandoId: string; formadorId: string;
  nivelFormativo: string; avaliacaoHumana: string | null; avaliacaoEspiritual: string | null;
  avaliacaoComunitaria: string | null; textoNarrativo: string | null;
  pontosForteza: string | null; desafios: string | null; recomendacao: string | null;
  textoRecomendacao: string | null; status: string; criadoEm: Date; atualizadoEm: Date;
};

export function toRelatorio(r: PrismaRelatorio): RelatorioEtapa {
  return {
    id: r.id, formandoId: r.formandoId, formadorId: r.formadorId,
    nivelFormativo: r.nivelFormativo as NivelFormativo,
    avaliacaoHumana: r.avaliacaoHumana as NotaAdesao | undefined ?? undefined,
    avaliacaoEspiritual: r.avaliacaoEspiritual as NotaAdesao | undefined ?? undefined,
    avaliacaoComunitaria: r.avaliacaoComunitaria as NotaAdesao | undefined ?? undefined,
    textoNarrativo: r.textoNarrativo ?? undefined,
    pontosForteza: r.pontosForteza ?? undefined,
    desafios: r.desafios ?? undefined,
    recomendacao: r.recomendacao as RecomendacaoEtapa | undefined ?? undefined,
    textoRecomendacao: r.textoRecomendacao ?? undefined,
    status: r.status as StatusRelatorio,
    criadoEm: r.criadoEm.toISOString(),
    atualizadoEm: r.atualizadoEm.toISOString(),
  };
}
