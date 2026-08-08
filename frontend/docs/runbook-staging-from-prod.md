# Runbook — Staging efêmero a partir de produção (R15)

> Mitiga o risco **R15** da [auditoria ago/2026](./plano-mitigacao-riscos-2026-08.md): não há
> ambiente de staging → mudanças de infra e **migrações destrutivas** eram testadas direto em prod.
> A classe de incidente "migration FK sobre dado denormalizado" (dev passa, prod quebra — ver a
> memória `feedback-migration-fk-sobre-denormalizado`) só é pega por **staging com dados reais**.
>
> Este runbook formaliza a receita (validada 2026-08-08): sobe um Postgres **descartável** a partir
> do último backup de produção e roda migrações contra ele antes do deploy. Reusa o
> [runbook de restore/DR](./runbook-restore-drill.md).

## Quando usar

- Antes de deployar uma **migração Prisma nova** que toca dados existentes (FK, NOT NULL, unique,
  backfill, dropar coluna) → ensaiar contra o formato/volume real de produção.
- Antes de uma **mudança de infra** que dependa do estado do banco.

## Receita (validada — RTO ~20s p/ o DB atual)

Pré: `docker`; credenciais R2 exportadas (do serviço Formatio no Railway, chaves `R2_*`).
**Gotchas Windows/Git-Bash:** (1) `export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*'` antes — senão
`/tmp/…` (caminho no container) vira caminho Windows; (2) rode o `prisma` **de dentro de `frontend/`**
(o schema é `frontend/prisma/schema.prisma`).

```bash
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*'
export AWS_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY AWS_DEFAULT_REGION=auto
ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

# 1. Último backup → download (stream):
LATEST=$(docker run --rm -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION amazon/aws-cli \
  s3 ls "s3://${R2_BUCKET_NAME}/db-backups/" --endpoint-url "$ENDPOINT" | awk '{print $4}' | sort | tail -1)
docker run --rm -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION amazon/aws-cli \
  s3 cp "s3://${R2_BUCKET_NAME}/db-backups/${LATEST}" - --endpoint-url "$ENDPOINT" > staging.dump

# 2. Postgres efêmero (porta 5433 p/ não colidir com o dev em 5432) + restore:
docker run -d --name pg-staging -e POSTGRES_PASSWORD=staging -p 5433:5432 postgres:18
until docker exec pg-staging pg_isready -U postgres; do sleep 1; done
docker exec pg-staging psql -U postgres -c "CREATE DATABASE railway;"
docker cp staging.dump pg-staging:/tmp/staging.dump
docker exec pg-staging pg_restore -U postgres -d railway --no-owner --no-acl /tmp/staging.dump

# 3. Ensaiar migrações (a partir de frontend/):
export STAGING_DB="postgresql://postgres:staging@localhost:5433/railway"
DATABASE_URL="$STAGING_DB" npx prisma migrate status     # deve dizer "up to date" (paridade c/ prod)
DATABASE_URL="$STAGING_DB" npx prisma migrate deploy      # aplica a migração NOVA aqui primeiro
# (opcional) subir o app contra o staging: DATABASE_URL="$STAGING_DB" npm run dev

# 4. Teardown (SEMPRE — o dump tem PII):
docker rm -f pg-staging && rm -f staging.dump
```

## Validação do ensaio (2026-08-08)

Restaurado o último backup e rodado `prisma migrate status` contra o efêmero →
**"58 migrations found in prisma/migrations / Database schema is up to date!"** (paridade com
produção confirmada). Restore rc=0. Uma migração nova rodada aqui com `migrate deploy` revela
falhas de dados reais ANTES de chegar ao `preDeployCommand` de produção.

## Notas

- É staging **sob demanda** (efêmero), não um ambiente 24/7 — suficiente e de custo zero para o
  momento. O dump tem **PII de produção**: só local, apagar ao fim.
- Para infra além do banco, combinar com o [runbook de restore/DR](./runbook-restore-drill.md).
