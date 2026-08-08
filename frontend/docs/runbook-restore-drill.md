# Runbook — Ensaio de restore / Disaster Recovery (R16)

> Mitiga o risco **R16** da [auditoria ago/2026](./plano-mitigacao-riscos-2026-08.md): o backup
> diário `pg_dump→R2` estava validado como *artefato*, mas o *procedimento* de restore nunca havia
> sido ensaiado ponta a ponta. Este runbook registra o ensaio e os números medidos (RTO/RPO).

## Fonte do backup

- Workflow **`.github/workflows/db-backup-r2.yml`** ("Backup Postgres -> R2"): `pg_dump -Fc`
  (custom format) diário às **06:00 UTC** → Cloudflare R2, bucket `formatio-uploads`, prefixo
  `db-backups/`, retenção **30 dias**. Assinatura válida = `PGDMP`.
- Credenciais R2 (para baixar): variáveis `R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME`
  no serviço Formatio (Railway) e nos secrets do GitHub. Endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

## Ensaio executado — 2026-08-08

Restaurado o backup mais recente (`formacao-20260808T064020Z.dump`, 378 KB) num **Postgres 18
descartável local** (container `pg-drill`, nunca em produção). Resultado:

- **Integridade: `pg_restore` rc=0, 0 erros**; dados reais presentes (Organizacao=5, Usuario=17,
  Formando=26, Agendamento=11, AuditLog=302; 48 tabelas + views de extensão).
- **RTO medido (mecânica de restore, DB ~13 MB):** download 4s + Postgres up 7s + restore 3s +
  verificação 4s = **~19 s**.
- **RTO de serviço completo (estimado ~15–30 min):** o restore dos dados é <1 min; o tempo real de
  recuperação de SERVIÇO é dominado por provisionar um Postgres novo + repontar `DATABASE_URL` +
  redeploy do app + smoke test — mesma sequência já exercitada na migração R1
  ([[runbook-migracao-regiao-us-east4]] / `runbook-migracao-regiao-us-east4.md`).
- **RPO: até 24 h** (backup diário 06:00 UTC). No dia do ensaio, o backup tinha ~14 h. Se após a
  receita 24 h for demais, aumentar a frequência (ex.: 2×/dia) ou migrar p/ backup nativo do Railway.

## Procedimento (repetir trimestralmente)

Pré: `docker` + credenciais R2. **Gotcha Windows/Git-Bash:** exporte `MSYS_NO_PATHCONV=1
MSYS2_ARG_CONV_EXCL='*'` antes — senão o caminho `/tmp/…` dentro do container é convertido para
caminho Windows e o `pg_restore` não acha o arquivo.

```bash
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*'
export AWS_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY AWS_DEFAULT_REGION=auto
ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

# 1. Achar o backup mais recente e baixar (stream, sem mount):
docker run --rm -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION amazon/aws-cli \
  s3 ls "s3://${R2_BUCKET_NAME}/db-backups/" --endpoint-url "$ENDPOINT" | tail -1
docker run --rm -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION amazon/aws-cli \
  s3 cp "s3://${R2_BUCKET_NAME}/db-backups/<ARQUIVO>.dump" - --endpoint-url "$ENDPOINT" > latest.dump

# 2. Postgres descartável + restore:
docker run -d --name pg-drill -e POSTGRES_PASSWORD=drill postgres:18
docker exec pg-drill psql -U postgres -c "CREATE DATABASE railway;"
docker cp latest.dump pg-drill:/tmp/latest.dump
docker exec pg-drill pg_restore -U postgres -d railway --no-owner --no-acl /tmp/latest.dump

# 3. Verificar + limpar:
docker exec pg-drill psql -U postgres -d railway -c 'SELECT count(*) FROM "Organizacao";'
docker rm -f pg-drill && rm -f latest.dump
```

## Recuperação REAL de produção (se o PG cair)

1. Provisionar um Postgres novo (Railway) — imagem `postgres-ssl:18`.
2. Restaurar o último dump nele (passos 1–2 acima, apontando para a URL pública do PG novo).
3. Repontar `DATABASE_URL` do Formatio para o PG novo + redeploy (ver R1).
4. Smoke test: `/api/health` 200, login, ficha de formando.
5. Perda máxima = escritas desde o último backup (RPO ≤ 24 h).

## Notas de segurança

- O dump contém **PII de produção** — restaurar só em ambiente controlado; apagar o arquivo e o
  container ao fim (o ensaio limpou ambos).
- `pg_restore` pode emitir avisos benignos de extensão (`pg_stat_statements` exige preload) / owner
  com `--no-owner` — não impedem o restore dos dados (no ensaio: 0 erros).
