-- Backfill: reconcilia moradas cujo formador comunitário foi designado pelo lado do
-- usuário (Usuario.grupoFormacaoId / coluna morada_id) mas cujo lado do grupo
-- (morada.formadorId) ficou vazio — desvio anterior ao sync bidirecional em
-- createUser/updateUser. Só preenche grupos SEM formador e com exatamente 1 FC
-- apontando para eles, para não sobrescrever vínculos existentes nem escolher
-- arbitrariamente entre múltiplos formadores.
UPDATE "morada" m
SET "formadorId" = sub.uid
FROM (
  SELECT u.morada_id AS gid, MIN(u.id) AS uid
  FROM "Usuario" u
  WHERE u.perfil = 'formador_comunitario'
    AND u."deletedAt" IS NULL
    AND u.morada_id IS NOT NULL
  GROUP BY u.morada_id
  HAVING COUNT(*) = 1
) sub
WHERE m.id = sub.gid
  AND m."formadorId" IS NULL;
