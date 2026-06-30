# Backup e Restore do Postgres

Backup lógico (`pg_dump`) do Postgres de produção, enviado diariamente ao Cloudflare R2.
É a solução **interim** enquanto o backup nativo do Railway estiver bloqueado pelo plano
(as mutations `volumeInstanceBackupScheduleUpdate` / `volumeInstanceBackupCreate` retornam
`Not Authorized` no plano free). Quando o plano subir, habilite o nativo e mantenha este como
camada off-site (defesa em profundidade).

## Como funciona

- Workflow: [`.github/workflows/db-backup-r2.yml`](../.github/workflows/db-backup-r2.yml)
- Agenda: diário às **06:00 UTC** (~03:00 BRT) + `workflow_dispatch` (botão "Run workflow").
- `pg_dump -Fc` (custom format) rodando em container `postgres:18` (versão casada com o servidor).
- Upload para `s3://<R2_BUCKET_NAME>/db-backups/formacao-<TIMESTAMP>.dump`.
- Retenção: **30 dias** (objetos mais antigos no prefixo `db-backups/` são apagados).

## Secrets necessários (GitHub → Settings → Secrets and variables → Actions)

| Secret | Valor |
|--------|-------|
| `BACKUP_DATABASE_URL` | `DATABASE_PUBLIC_URL` do serviço Postgres **+ `?sslmode=require`** |
| `R2_ACCOUNT_ID` | mesmo valor usado pela app no Railway |
| `R2_ACCESS_KEY_ID` | token de API R2 (S3) com acesso ao bucket |
| `R2_SECRET_ACCESS_KEY` | idem |
| `R2_BUCKET_NAME` | ex.: `formatio-uploads` (ou um bucket dedicado de backups) |

> **`?sslmode=require` é obrigatório.** Sem ele a conexão pelo proxy público do Railway
> falha de forma intermitente com `connection refused`.
>
> Pegar a URL pública: `railway variables --service Postgres --kv | grep DATABASE_PUBLIC_URL`
> e anexar `?sslmode=require` ao final.

## Testar o backup agora

GitHub → aba **Actions** → "Backup Postgres -> R2" → **Run workflow**. Confira no log o tamanho
do dump e a linha "Enviado: ...". Liste o que está no R2:

```bash
ENDPOINT="https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com"
AWS_DEFAULT_REGION=auto aws s3 ls "s3://<R2_BUCKET_NAME>/db-backups/" --endpoint-url "$ENDPOINT"
```

## Restaurar um backup (procedimento validado)

Mecanismo testado em 2026-06-30 (dump da prod → `pg_restore` em `postgres:18` local →
39 tabelas com contagem de linhas idêntica à prod, 0 erros).

### 1. Baixar o dump do R2

```bash
ENDPOINT="https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com"
export AWS_DEFAULT_REGION=auto
export AWS_ACCESS_KEY_ID=<R2_ACCESS_KEY_ID>
export AWS_SECRET_ACCESS_KEY=<R2_SECRET_ACCESS_KEY>

# escolha um arquivo da listagem acima
aws s3 cp "s3://<R2_BUCKET_NAME>/db-backups/formacao-<TIMESTAMP>.dump" ./prod.dump \
  --endpoint-url "$ENDPOINT"
```

### 2. Restaurar num Postgres local (verificação / DR drill)

```bash
# alvo temporário, isolado do banco de dev (não usa a porta 5432)
docker run -d --name pgrestore-test -e POSTGRES_PASSWORD=test postgres:18
until docker exec pgrestore-test pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done

docker exec pgrestore-test psql -U postgres -c "CREATE DATABASE railway_restored;"
cat prod.dump | docker exec -i pgrestore-test \
  pg_restore -U postgres -d railway_restored --no-owner --no-acl

# conferência: deve terminar com 0 erros e 39 tabelas em public
docker exec pgrestore-test psql -U postgres -d railway_restored -c \
  "SELECT count(*) AS tabelas FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname='public';"
```

Comparar contagem exata de linhas por tabela (prod vs. restaurado):

```bash
COUNTSQL="SELECT n.nspname||'.'||c.relname AS tbl, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', n.nspname, c.relname), false, true, '')))[1]::text::bigint AS rows FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname='public' ORDER BY 1;"

PUBURL="<DATABASE_PUBLIC_URL>?sslmode=require"
docker run --rm postgres:18 psql "$PUBURL" -At -c "$COUNTSQL" | sort > prod.counts
docker exec pgrestore-test psql -U postgres -d railway_restored -At -c "$COUNTSQL" | sort > restored.counts
diff prod.counts restored.counts && echo "IDÊNTICO ✅"
```

### 3. Restaurar de volta em produção (recuperação real de desastre)

> ⚠️ Destrutivo. Só em incidente real, com a app em manutenção.

Opção recomendada: provisionar um **novo** serviço Postgres no Railway, restaurar nele
(passos do item 2 apontando para a URL pública do novo banco em vez do container local) e só então
trocar a `DATABASE_URL` da app. Isso preserva o banco corrompido para perícia.

```bash
NEW="postgresql://postgres:<senha>@<host>:<porta>/railway?sslmode=require"
cat prod.dump | docker run --rm -i postgres:18 \
  pg_restore -d "$NEW" --no-owner --no-acl --clean --if-exists
```

### 4. Limpeza do ambiente de teste

```bash
docker rm -f pgrestore-test
rm -f prod.dump prod.counts restored.counts   # o dump contém dados pessoais — apague após o teste
```

Atalho: o script [`scripts/restore-from-r2.sh`](../scripts/restore-from-r2.sh) automatiza os
passos 1, 2 e a verificação.

## Notas de segurança

- O dump contém dados pessoais (inclusive categoria especial LGPD). É tão sensível quanto o banco.
- No R2 fica criptografado em repouso (Cloudflare) e o acesso depende dos tokens R2 — mesma fronteira
  de confiança dos uploads da app. Restrinja o token R2 ao bucket de backups.
- Para uma camada extra, dá para cifrar o dump com GPG antes do upload
  (`gpg --symmetric --cipher-algo AES256`) e guardar a passphrase como secret. Não habilitado por
  padrão para manter paridade com a postura atual.
- Nunca commitar dumps nem credenciais. Apague os artefatos locais após cada teste.
