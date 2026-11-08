-- Cadência do dever comunitário de acompanhar cada formando (1:1), em meses.
-- 1=Mensal, 2=Bimestral, 3=Trimestral. Regra própria de cada tenant (Formador Geral).
ALTER TABLE "Organizacao" ADD COLUMN "cadenciaAcompanhamentoMeses" INTEGER NOT NULL DEFAULT 1;
