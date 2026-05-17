-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('formador_geral', 'administrador', 'formador_comunitario');

-- CreateEnum
CREATE TYPE "PlanoAssinatura" AS ENUM ('GRATUITO', 'ESSENCIAL', 'PROFISSIONAL');

-- CreateEnum
CREATE TYPE "StatusOrganizacao" AS ENUM ('TRIAL', 'ATIVO', 'SUSPENSO', 'CANCELADO');

-- CreateTable
CREATE TABLE "Organizacao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "endereco" TEXT,
    "missao" TEXT,
    "anoFundacao" TEXT,
    "termoMorada" TEXT NOT NULL DEFAULT 'Morada',
    "termoFormando" TEXT NOT NULL DEFAULT 'Formando',
    "termoFormador" TEXT NOT NULL DEFAULT 'Formador Comunitário',
    "planoAssinatura" "PlanoAssinatura" NOT NULL DEFAULT 'GRATUITO',
    "status" "StatusOrganizacao" NOT NULL DEFAULT 'TRIAL',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "trialExpiresAt" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organizacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "perfil" "PerfilUsuario" NOT NULL,
    "moradaId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "primeiroAcesso" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Morada" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "nivelFormativo" TEXT NOT NULL,
    "formadorId" TEXT,
    "planoId" TEXT,
    "gradeId" TEXT,
    "vigenciaInicio" TIMESTAMP(3),
    "vigenciaFim" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Morada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formando" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "estadoCivil" TEXT NOT NULL,
    "modalidade" TEXT NOT NULL,
    "nivelFormativo" TEXT NOT NULL,
    "dataIngresso" TIMESTAMP(3) NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "motivoInatividade" TEXT,
    "foto" TEXT,
    "turmaId" TEXT,
    "moradaId" TEXT,
    "totalFormacoes" INTEGER NOT NULL DEFAULT 0,
    "formacoesRealizadas" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Formando_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressoEtapa" (
    "id" TEXT NOT NULL,
    "formandoId" TEXT NOT NULL,
    "nivelFormativo" TEXT NOT NULL,
    "formacoesComunitariasRealizadas" INTEGER NOT NULL DEFAULT 0,
    "retirosComunitariosRealizados" INTEGER NOT NULL DEFAULT 0,
    "retirosPessoaisRealizados" INTEGER NOT NULL DEFAULT 0,
    "iniciouEm" TIMESTAMP(3),
    "concluiuEm" TIMESTAMP(3),

    CONSTRAINT "ProgressoEtapa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanoFormativo" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "nome" TEXT NOT NULL,
    "objetivos" TEXT NOT NULL,
    "fundamentacao" TEXT NOT NULL,
    "nivelFormativo" TEXT NOT NULL,
    "vigenciaInicio" TIMESTAMP(3) NOT NULL,
    "vigenciaFim" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "documentoAnexo" TEXT,
    "documentoAnexoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanoFormativo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EixoPlano" (
    "id" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "objetivo" TEXT NOT NULL,
    "intervaloEncontros" TEXT NOT NULL,
    "cargaHoraria" INTEGER NOT NULL,
    "areaFormacao" TEXT NOT NULL,

    CONSTRAINT "EixoPlano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeFormativa" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "planoId" TEXT NOT NULL,
    "planoNome" TEXT NOT NULL,
    "nivelFormativo" TEXT NOT NULL,
    "vigenciaInicio" TIMESTAMP(3) NOT NULL,
    "vigenciaFim" TIMESTAMP(3) NOT NULL,
    "versao" TEXT NOT NULL DEFAULT '1.0',
    "totalFormacoes" INTEGER NOT NULL DEFAULT 0,
    "objetivos" TEXT,
    "fundamentacao" TEXT,
    "documentoAnexo" TEXT,
    "documentoAnexoId" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradeFormativa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Eixo" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "cor" TEXT,

    CONSTRAINT "Eixo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Etapa" (
    "id" TEXT NOT NULL,
    "eixoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "cargaHoraria" INTEGER NOT NULL,

    CONSTRAINT "Etapa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formacao" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "tema" TEXT NOT NULL,
    "objetivo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "nivelFormativo" TEXT NOT NULL,
    "tipoFormacao" TEXT NOT NULL,
    "eixoId" TEXT,
    "eixoNome" TEXT,
    "etapaId" TEXT,
    "etapaNome" TEXT,
    "formadorId" TEXT,
    "formadorNome" TEXT NOT NULL,
    "cargaHoraria" INTEGER NOT NULL,
    "modalidade" TEXT NOT NULL,
    "materialApoio" TEXT,
    "documentoAnexo" TEXT,
    "documentoAnexoId" TEXT,
    "gradeId" TEXT,
    "gradeNome" TEXT,
    "vezesUtilizada" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Formacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agendamento" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "formacaoId" TEXT NOT NULL,
    "formacaoTema" TEXT NOT NULL,
    "nivelFormativo" TEXT NOT NULL,
    "tipoFormacao" TEXT NOT NULL,
    "formadorId" TEXT NOT NULL,
    "formadorNome" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "local" TEXT,
    "linkOnline" TEXT,
    "status" TEXT NOT NULL DEFAULT 'agendada',
    "participantes" INTEGER NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "googleCalendarEventId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agendamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresencaFormacao" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "formacaoTema" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "formandoId" TEXT NOT NULL,
    "formandoNome" TEXT NOT NULL,
    "nivelFormativo" TEXT NOT NULL,
    "presente" BOOLEAN NOT NULL DEFAULT false,
    "justificativa" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PresencaFormacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComentarioFormando" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "formandoId" TEXT NOT NULL,
    "formandoNome" TEXT NOT NULL,
    "formadorId" TEXT NOT NULL,
    "formadorNome" TEXT,
    "texto" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComentarioFormando_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoFormando" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "formandoId" TEXT NOT NULL,
    "formadorId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "periodoInicio" TIMESTAMP(3),
    "periodoFim" TIMESTAMP(3),
    "notaAdesao" TEXT,
    "textoAvaliacao" TEXT,
    "motivo" TEXT,
    "tipoDesligamento" TEXT,
    "dataEfetiva" TIMESTAMP(3),
    "checklistDevolveuEstatuto" BOOLEAN,
    "checklistDevolveuSacramental" BOOLEAN,
    "checklistApresentouCarta" BOOLEAN,
    "checklistAcompanhadoModerador" BOOLEAN,
    "dataInicioLicenca" TIMESTAMP(3),
    "dataFimLicenca" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoFormando_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compromisso" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "formadorId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "local" TEXT,
    "linkOnline" TEXT,
    "tipo" TEXT NOT NULL,
    "formandoId" TEXT,
    "formandoNome" TEXT,
    "googleCalendarEventId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Compromisso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Arquivo" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedById" TEXT,
    "eventoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Arquivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizacaoId" TEXT,
    "usuarioId" TEXT,
    "acao" TEXT NOT NULL,
    "ip" TEXT,
    "detalhes" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Usuario_organizacaoId_idx" ON "Usuario"("organizacaoId");

-- CreateIndex
CREATE INDEX "Usuario_email_idx" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_organizacaoId_key" ON "Usuario"("email", "organizacaoId");

-- CreateIndex
CREATE INDEX "Morada_organizacaoId_idx" ON "Morada"("organizacaoId");

-- CreateIndex
CREATE INDEX "Morada_formadorId_idx" ON "Morada"("formadorId");

-- CreateIndex
CREATE INDEX "Formando_organizacaoId_idx" ON "Formando"("organizacaoId");

-- CreateIndex
CREATE INDEX "Formando_moradaId_idx" ON "Formando"("moradaId");

-- CreateIndex
CREATE INDEX "ProgressoEtapa_formandoId_idx" ON "ProgressoEtapa"("formandoId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressoEtapa_formandoId_nivelFormativo_key" ON "ProgressoEtapa"("formandoId", "nivelFormativo");

-- CreateIndex
CREATE INDEX "PlanoFormativo_organizacaoId_idx" ON "PlanoFormativo"("organizacaoId");

-- CreateIndex
CREATE INDEX "EixoPlano_planoId_idx" ON "EixoPlano"("planoId");

-- CreateIndex
CREATE INDEX "GradeFormativa_organizacaoId_idx" ON "GradeFormativa"("organizacaoId");

-- CreateIndex
CREATE INDEX "Eixo_gradeId_idx" ON "Eixo"("gradeId");

-- CreateIndex
CREATE INDEX "Etapa_eixoId_idx" ON "Etapa"("eixoId");

-- CreateIndex
CREATE INDEX "Formacao_organizacaoId_idx" ON "Formacao"("organizacaoId");

-- CreateIndex
CREATE INDEX "Agendamento_organizacaoId_idx" ON "Agendamento"("organizacaoId");

-- CreateIndex
CREATE INDEX "Agendamento_dataInicio_idx" ON "Agendamento"("dataInicio");

-- CreateIndex
CREATE INDEX "PresencaFormacao_organizacaoId_idx" ON "PresencaFormacao"("organizacaoId");

-- CreateIndex
CREATE INDEX "PresencaFormacao_formandoId_idx" ON "PresencaFormacao"("formandoId");

-- CreateIndex
CREATE UNIQUE INDEX "PresencaFormacao_agendamentoId_formandoId_key" ON "PresencaFormacao"("agendamentoId", "formandoId");

-- CreateIndex
CREATE INDEX "ComentarioFormando_organizacaoId_idx" ON "ComentarioFormando"("organizacaoId");

-- CreateIndex
CREATE INDEX "ComentarioFormando_formandoId_idx" ON "ComentarioFormando"("formandoId");

-- CreateIndex
CREATE INDEX "EventoFormando_organizacaoId_idx" ON "EventoFormando"("organizacaoId");

-- CreateIndex
CREATE INDEX "EventoFormando_formandoId_idx" ON "EventoFormando"("formandoId");

-- CreateIndex
CREATE INDEX "Compromisso_organizacaoId_idx" ON "Compromisso"("organizacaoId");

-- CreateIndex
CREATE INDEX "Compromisso_formadorId_idx" ON "Compromisso"("formadorId");

-- CreateIndex
CREATE INDEX "Arquivo_organizacaoId_idx" ON "Arquivo"("organizacaoId");

-- CreateIndex
CREATE INDEX "Arquivo_eventoId_idx" ON "Arquivo"("eventoId");

-- CreateIndex
CREATE INDEX "AuditLog_organizacaoId_idx" ON "AuditLog"("organizacaoId");

-- CreateIndex
CREATE INDEX "AuditLog_usuarioId_idx" ON "AuditLog"("usuarioId");

-- CreateIndex
CREATE INDEX "AuditLog_criadoEm_idx" ON "AuditLog"("criadoEm");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_moradaId_fkey" FOREIGN KEY ("moradaId") REFERENCES "Morada"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Morada" ADD CONSTRAINT "Morada_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Morada" ADD CONSTRAINT "Morada_formadorId_fkey" FOREIGN KEY ("formadorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Morada" ADD CONSTRAINT "Morada_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "PlanoFormativo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Morada" ADD CONSTRAINT "Morada_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "GradeFormativa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Formando" ADD CONSTRAINT "Formando_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Formando" ADD CONSTRAINT "Formando_moradaId_fkey" FOREIGN KEY ("moradaId") REFERENCES "Morada"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressoEtapa" ADD CONSTRAINT "ProgressoEtapa_formandoId_fkey" FOREIGN KEY ("formandoId") REFERENCES "Formando"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanoFormativo" ADD CONSTRAINT "PlanoFormativo_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EixoPlano" ADD CONSTRAINT "EixoPlano_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "PlanoFormativo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeFormativa" ADD CONSTRAINT "GradeFormativa_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeFormativa" ADD CONSTRAINT "GradeFormativa_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "PlanoFormativo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Eixo" ADD CONSTRAINT "Eixo_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "GradeFormativa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Etapa" ADD CONSTRAINT "Etapa_eixoId_fkey" FOREIGN KEY ("eixoId") REFERENCES "Eixo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Formacao" ADD CONSTRAINT "Formacao_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Formacao" ADD CONSTRAINT "Formacao_formadorId_fkey" FOREIGN KEY ("formadorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_formacaoId_fkey" FOREIGN KEY ("formacaoId") REFERENCES "Formacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_formadorId_fkey" FOREIGN KEY ("formadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresencaFormacao" ADD CONSTRAINT "PresencaFormacao_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresencaFormacao" ADD CONSTRAINT "PresencaFormacao_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresencaFormacao" ADD CONSTRAINT "PresencaFormacao_formandoId_fkey" FOREIGN KEY ("formandoId") REFERENCES "Formando"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComentarioFormando" ADD CONSTRAINT "ComentarioFormando_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComentarioFormando" ADD CONSTRAINT "ComentarioFormando_formandoId_fkey" FOREIGN KEY ("formandoId") REFERENCES "Formando"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComentarioFormando" ADD CONSTRAINT "ComentarioFormando_formadorId_fkey" FOREIGN KEY ("formadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoFormando" ADD CONSTRAINT "EventoFormando_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoFormando" ADD CONSTRAINT "EventoFormando_formandoId_fkey" FOREIGN KEY ("formandoId") REFERENCES "Formando"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoFormando" ADD CONSTRAINT "EventoFormando_formadorId_fkey" FOREIGN KEY ("formadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compromisso" ADD CONSTRAINT "Compromisso_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compromisso" ADD CONSTRAINT "Compromisso_formadorId_fkey" FOREIGN KEY ("formadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compromisso" ADD CONSTRAINT "Compromisso_formandoId_fkey" FOREIGN KEY ("formandoId") REFERENCES "Formando"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arquivo" ADD CONSTRAINT "Arquivo_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arquivo" ADD CONSTRAINT "Arquivo_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "EventoFormando"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizacaoId_fkey" FOREIGN KEY ("organizacaoId") REFERENCES "Organizacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
