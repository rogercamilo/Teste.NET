-- Refactor dos tipos de processo eclesiástico:
--   admissao_etapa1 -> inicio_vocacional   (marco de entrada na jornada)
--   admissao_etapa2 -> admissao_etapa      (admissão genérica à etapa formativa, por nível)
-- RENAME VALUE é 1:1 e atualiza as linhas existentes in-place, preservando a
-- posição do valor no enum (sem recriar o tipo). Transaction-safe (Postgres 10+).
ALTER TYPE "TipoProcessoEclesiastico" RENAME VALUE 'admissao_etapa1' TO 'inicio_vocacional';
ALTER TYPE "TipoProcessoEclesiastico" RENAME VALUE 'admissao_etapa2' TO 'admissao_etapa';

-- Data de realização do evento do arquivo (ex.: carta de etapa). Nullable —
-- quando ausente, a data efetiva continua sendo o `criadoEm`.
ALTER TABLE "Arquivo" ADD COLUMN "dataEvento" TIMESTAMP(3);
