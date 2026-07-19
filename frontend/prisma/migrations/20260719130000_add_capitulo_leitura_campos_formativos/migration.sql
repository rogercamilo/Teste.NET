-- Material formativo opcional por capítulo (definido no cadastro do livro,
-- exibido na estrutura da leitura no portal). Todas as colunas são nulas: os
-- capítulos existentes permanecem válidos sem preenchimento (zero backfill).
ALTER TABLE "CapituloLeitura"
    ADD COLUMN "objetivo" TEXT,
    ADD COLUMN "palavrasChave" TEXT,
    ADD COLUMN "comentarios" TEXT,
    ADD COLUMN "perguntas" TEXT,
    ADD COLUMN "acaoPratica" TEXT,
    ADD COLUMN "partilha" TEXT;
