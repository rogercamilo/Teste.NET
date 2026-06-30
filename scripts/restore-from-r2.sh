#!/usr/bin/env bash
#
# Restore de verificação (DR drill): baixa um dump do R2 e restaura num Postgres
# local em container, conferindo a contagem de linhas por tabela contra a produção.
# NÃO toca em produção. Veja docs/db-backup-restore.md.
#
# Uso:
#   export R2_ACCOUNT_ID=...  R2_ACCESS_KEY_ID=...  R2_SECRET_ACCESS_KEY=...  R2_BUCKET_NAME=...
#   # opcional, para comparar com a prod:
#   export PUBURL="<DATABASE_PUBLIC_URL>?sslmode=require"
#   ./scripts/restore-from-r2.sh [TIMESTAMP|latest]
#
# Sem argumento ou "latest" usa o backup mais recente do R2.

set -euo pipefail

: "${R2_ACCOUNT_ID:?defina R2_ACCOUNT_ID}"
: "${R2_BUCKET_NAME:?defina R2_BUCKET_NAME}"
export AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID:?defina R2_ACCESS_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY:?defina R2_SECRET_ACCESS_KEY}"
export AWS_DEFAULT_REGION=auto

ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
PREFIX="db-backups"
WHICH="${1:-latest}"
WORKDIR="$(mktemp -d)"
CONTAINER="pgrestore-test-$$"
trap 'docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; rm -rf "$WORKDIR"' EXIT

if [ "$WHICH" = "latest" ]; then
  KEY=$(aws s3 ls "s3://${R2_BUCKET_NAME}/${PREFIX}/" --endpoint-url "$ENDPOINT" \
        | awk '{print $4}' | sort | tail -1)
  [ -n "$KEY" ] || { echo "Nenhum backup encontrado em ${PREFIX}/"; exit 1; }
else
  KEY="formacao-${WHICH}.dump"
fi
echo ">> Backup escolhido: $KEY"

echo ">> Baixando do R2..."
aws s3 cp "s3://${R2_BUCKET_NAME}/${PREFIX}/${KEY}" "${WORKDIR}/prod.dump" \
  --endpoint-url "$ENDPOINT" --only-show-errors
head -c 5 "${WORKDIR}/prod.dump" | grep -q PGDMP || { echo "Dump inválido"; exit 1; }

echo ">> Subindo Postgres alvo (postgres:18)..."
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=test postgres:18 >/dev/null
until docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
docker exec "$CONTAINER" psql -U postgres -c "CREATE DATABASE railway_restored;" >/dev/null

echo ">> Restaurando..."
cat "${WORKDIR}/prod.dump" | docker exec -i "$CONTAINER" \
  pg_restore -U postgres -d railway_restored --no-owner --no-acl
echo ">> Restore concluído sem erros."

COUNTSQL="SELECT n.nspname||'.'||c.relname AS tbl, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', n.nspname, c.relname), false, true, '')))[1]::text::bigint AS rows FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname='public' ORDER BY 1;"

docker exec "$CONTAINER" psql -U postgres -d railway_restored -At -c "$COUNTSQL" | sort > "${WORKDIR}/restored.counts"
TABLES=$(wc -l < "${WORKDIR}/restored.counts")
ROWS=$(awk -F'|' '{s+=$2} END{print s}' "${WORKDIR}/restored.counts")
echo ">> Restaurado: ${TABLES} tabelas, ${ROWS} linhas no total."

if [ -n "${PUBURL:-}" ]; then
  echo ">> Comparando com a produção..."
  docker run --rm postgres:18 psql "$PUBURL" -At -c "$COUNTSQL" | sort > "${WORKDIR}/prod.counts"
  if diff "${WORKDIR}/prod.counts" "${WORKDIR}/restored.counts" >/dev/null; then
    echo ">> IDÊNTICO a produção. ✅"
  else
    echo ">> DIVERGÊNCIA encontrada:"; diff "${WORKDIR}/prod.counts" "${WORKDIR}/restored.counts" || true
    exit 1
  fi
fi

echo ">> OK. (artefatos temporários e container serão removidos automaticamente)"
