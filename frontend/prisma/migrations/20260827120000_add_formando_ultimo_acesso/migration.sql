-- Último acesso ao Portal do Formando. Aditivo e não-destrutivo: coluna
-- nullable; registros existentes ficam sem valor até o próximo acesso.
ALTER TABLE "Formando" ADD COLUMN "ultimoAcessoEm" TIMESTAMP(3);
