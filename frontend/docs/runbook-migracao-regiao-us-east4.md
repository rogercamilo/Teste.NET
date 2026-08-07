# Runbook — Migração de região Railway `sfo` → `us-east4` (R1)

> Mitiga o risco **R1** do [plano de mitigação](./plano-mitigacao-riscos-2026-08.md):
> ~0,5 s de latência de rede em toda interação do Brasil (edge Miami → origem SFO).
> Move **app (Formatio)** e **banco (Postgres)** para `us-east4-eqdc4a`.

## Identificadores (projeto `modest-spontaneity`, env `production`)

| Recurso | ID / valor |
|---|---|
| Project ID | `0c7e256c-0fd1-4042-95bb-1e537f78d092` |
| Environment ID (production) | `6edebd5e-baa7-482a-ae76-574486c21a53` |
| App **Formatio** | service `8820db73-bcfc-4bc3-a597-b2d4894d2792` · domínio `www.formattio.com.br` (porta 8080) · **2 réplicas** |
| Postgres **antigo** (sfo) | service `10bfdab7-e4d5-4142-977e-98b77a4e77ed` · privado `postgres.railway.internal` · proxy público `caboose.proxy.rlwy.net` |
| Postgres **novo** (us-east4) | service `d7a0a8df-764b-4612-9355-12f17bbc7570` (nome `Postgres-sSPH`) · privado `postgres-ssph.railway.internal` · proxy público `altaria.proxy.rlwy.net:59065` |
| Região destino | **`us-east4-eqdc4a`** (US East / Virgínia — identificador exato; `us-east4` sozinho é ignorado) |

> ⚠️ **Chave por trás do menor risco:** o app é stateless — muda-se a **região do próprio
> serviço** Formatio (não se cria app novo). Assim o **domínio e as env vars são preservados
> e não há cutover de DNS**. Só o Postgres exige serviço novo (volume é preso à região).

## Estado da PREPARAÇÃO (já executado, reversível, prod intacta)

- [x] Backup pré-migração `pg_dump→R2` disparado e confirmado.
- [x] Postgres novo criado em `us-east4-eqdc4a`, imagem `postgres-ssl:18` (paridade), volume + proxy TCP público.
- [x] Restore prod → PG novo: **48 tabelas, 1069 linhas, diff por tabela IDÊNTICO**; extensões (`pg_trgm 1.6`, `pg_stat_statements`, `plpgsql`) idênticas; 0 sequences (IDs cuid do Prisma).

> A prod continua rodando 100% em `sfo` no PG antigo. O PG novo é uma cópia paralela que
> vai divergindo conforme a prod recebe escritas — por isso o **re-restore no corte**.

## CORTE (executar numa janela de baixo uso — downtime de ~poucos minutos)

Pré-requisitos na máquina de execução: `railway` logado, Docker rodando, projeto linkado
(`railway link --project 0c7e256c-0fd1-4042-95bb-1e537f78d092 --environment production`).

### 1. Congelar escritas (evita perda de delta)

```bash
# Sobe/derruba réplicas do app para 0 em sfo → para de aceitar escritas
railway environment edit --json <<'JSON'
{"services":{"8820db73-bcfc-4bc3-a597-b2d4894d2792":{"deploy":{"multiRegionConfig":{"sfo":{"numReplicas":0}}}}}}
JSON
```

Aguardar as instâncias zerarem (`railway status`). A partir daqui o site fica indisponível.

### 2. Re-restore do delta (dataset é pequeno — segundos)

```bash
# URLs públicas (com ?sslmode=require). Pegue via CLI, não hardcode senha:
OLD=$(railway variables --service Postgres        --kv | sed -n 's/^DATABASE_PUBLIC_URL=//p')"?sslmode=require"
NEW="postgresql://postgres:<SENHA_PG_NOVO>@altaria.proxy.rlwy.net:59065/railway?sslmode=require"
# (SENHA_PG_NOVO = password do DATABASE_URL do serviço Postgres-sSPH)

docker run --rm -e OLD -e NEW -e PGCONNECT_TIMEOUT=30 postgres:18 sh -c \
  'pg_dump "$OLD" -Fc --no-owner --no-acl | pg_restore -d "$NEW" --no-owner --no-acl --clean --if-exists'
```

Conferir paridade (diff deve ser vazio):

```bash
COUNTSQL="SELECT n.nspname||'.'||c.relname, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', n.nspname, c.relname), false, true, '')))[1]::text::bigint FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname='public' ORDER BY 1;"
docker run --rm -e OLD postgres:18 psql "$OLD" -At -c "$COUNTSQL" | sort > /tmp/old.c
docker run --rm -e NEW postgres:18 psql "$NEW" -At -c "$COUNTSQL" | sort > /tmp/new.c
diff /tmp/old.c /tmp/new.c && echo IDENTICO
```

### 3. Corte do app: região us-east4 + apontar para o PG novo (patch único)

```bash
railway environment edit --json <<'JSON'
{"services":{"8820db73-bcfc-4bc3-a597-b2d4894d2792":{
  "deploy":{"multiRegionConfig":{"sfo":null,"us-east4-eqdc4a":{"numReplicas":2}}},
  "variables":{"DATABASE_URL":{"value":"${{Postgres-sSPH.DATABASE_URL}}"}}
}}}
JSON
```

> `${{Postgres-sSPH.DATABASE_URL}}` resolve para o URL **privado** do PG novo
> (`postgres-ssph.railway.internal`) — app e banco na mesma região, sem egress.
> Isso dispara **um** redeploy do Formatio já em `us-east4-eqdc4a`.

### 4. Smoke test (contra `www.formattio.com.br`)

- `curl -s -o /dev/null -w '%{time_starttransfer}\n' https://www.formattio.com.br/api/health` → **TTFB < 0,35 s** do Brasil.
- Login → dashboard → ficha de formando → upload/download (R2) → webhook Stripe (test).
- E2E Playwright verde contra produção.

### 5. Pós-corte

- Atualizar o secret do GitHub **`BACKUP_DATABASE_URL`** para o `DATABASE_PUBLIC_URL` do PG
  novo (`altaria.proxy.rlwy.net:59065`) `+ ?sslmode=require`, senão o backup diário continua
  dumpando o banco antigo. Rodar o workflow uma vez para validar.
- Confirmar o alerta de pool ≥80% do cockpit continua ativo (cron + `CRON_SECRET`).
- **R12 (mesma janela):** recriar Upstash em `us-east-1` e trocar `UPSTASH_REDIS_REST_URL/TOKEN`
  no Formatio (contadores de rate-limit zeram — aceitável).
- **R11:** setar `TRUST_PROXY` no serviço (pendência do hardening de auth).

## ROLLBACK (janela: PG antigo fica parado-mas-intacto por 7 dias)

Reverter o patch do passo 3 (volta app para sfo + PG antigo):

```bash
railway environment edit --json <<'JSON'
{"services":{"8820db73-bcfc-4bc3-a597-b2d4894d2792":{
  "deploy":{"multiRegionConfig":{"us-east4-eqdc4a":null,"sfo":{"numReplicas":2}}},
  "variables":{"DATABASE_URL":{"value":"${{Postgres.DATABASE_URL}}"}}
}}}
JSON
```

> `${{Postgres.DATABASE_URL}}` resolve para o PG **antigo** (serviço `Postgres`, sfo) — o
> valor literal atual do app é exatamente esse URL privado, sempre recuperável via
> `railway variables --service Postgres`, então não é preciso guardar a senha em lugar nenhum.

Perda máxima = escritas entre o congelamento (passo 1) e o rollback — por isso o freeze.

## Limpeza (após 7 dias estáveis)

- Deletar o Postgres **antigo** (`10bfdab7-…`) e seu volume em sfo.
- Opcional: manter o proxy TCP público do PG novo só se o backup off-site precisar (precisa) —
  senão removê-lo reduz superfície de ataque.

## Armadilhas conhecidas

- **"Wait for CI":** deploy do Railway espera CI verde; E2E vermelho deixa o deploy `Skipped`
  em silêncio. Conferir o painel após o corte. (Patches de config/var redeployam a partir do
  último build bom — não passam pelo gate de push, mas confirme mesmo assim.)
- Identificador de região **tem** que ser `us-east4-eqdc4a`; `us-east4` é ignorado sem erro.
- Reference `${{Postgres-sSPH.DATABASE_URL}}` é **case-sensitive** no nome do serviço.
</content>
</invoke>
