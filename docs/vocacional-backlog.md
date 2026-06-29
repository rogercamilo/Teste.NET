# Período Vocacional — Backlog priorizado (pós CTO review)

> Estado: módulo **implementado e endurecido** (commits `b540d5a → b26ea21`, jun/2026).
> Itens de risco 1–5 da avaliação de CTO **resolvidos**. Build/CI/coverage verdes; e2e de
> integração 23/23 (`frontend/scripts/e2e-vocacional.ts`).
>
> Este documento lista o **débito remanescente**, priorizado por tier de confiança de produção.
> Estimativas em **dev-dias (dd)**, assumindo um dev já familiarizado com o codebase.
> Veredito atual: **A− / pronto para piloto controlado atrás de feature flag**.

---

## P0 — Gateiam o GA (sair do piloto → liberar a clientes) — ✅ CONCLUÍDO

### P0.1 · Testes de rota HTTP do vocacional (authz / tenant / 409) — **2,0–2,5 dd** — ✅
As decisões críticas têm testes puros (`lib/vocacional-rules.ts`) + e2e de integração, mas os
*handlers* (guards, parsing, 409, isolamento de tenant) não são exercitados diretamente.
- **Aceite:** testes mockando `auth()` + `prisma` cobrindo, por rota:
  401 sem sessão · 403 papel insuficiente · 403 cross-tenant · 409 re-encerramento e carta em
  participação terminal · 403 acompanhamento por FC alheio · 403 cancelamento por não-admin.
- **Risco se não feito:** regressão de segurança/authz não é pega pelo CI.
- **Entregue:** `frontend/src/__tests__/api/vocacional-routes.test.ts` (15 casos, verdes).
  Inaugura a infra de teste de *handler* (mock `auth`+`prisma`+I/O; regras/schemas/livro reais).
  Nota: cross-tenant retorna **404 por escopo** (`findFirst` filtrado por `organizacaoId`) — o
  teste assenta sobre esse comportamento real e verifica o `where.organizacaoId`.

### P0.2 · Trilha de auditoria de LEITURA das notas de foro íntimo — **0,5 dd** — ✅
Hoje logamos escrita, não leitura. Direção espiritual (LGPD + canônico) exige rastrear "quem leu".
- **Aceite:** `logAction("vocacional_acompanhamento_lido", …)` no GET de `acompanhamento`
  (com `participacaoId` + papel), verificável no `AuditLog`.
- **Entregue:** log no GET de `acompanhamento/route.ts` + nova `AuditAction`
  `vocacional_acompanhamento_lido`; coberto pelo teste P0.1.

**Subtotal P0: ~2,5–3,0 dd — caminho crítico para o GA. ✅ entregue.**

---

## P1 — Importantes (próximas 1–2 sprints)

### P1.1 · Carta recorrente por etapa + surfacing na aba Documentos do formando — **2,5–3,0 dd** — ✅
Requisito de produto já levantado ("ao fim de cada etapa há retiro e carta"); hoje só existe
`cartaArquivoId` na participação vocacional.
- **Aceite:** modelo genérico de "carta de etapa" (recorrente) · upload reaproveitando o fluxo
  atual · exibição na aba Documentos de `/formandos/[id]` (o `Arquivo` já grava
  `tipoEvento="carta_vocacional"` + `formandoId`).
- **Depende de:** P1.4 (a decisão de nível afeta a modelagem). ✅ resolvido.
- **Decisão do CTO:** **reusar `Arquivo`, sem tabela nova** (sem migração).
- **Entregue:** a etapa é codificada em `tipoEvento="carta_etapa:{nivel}"`. Nova rota
  `POST /api/formandos/[id]/cartas` (espelha o upload da carta vocacional — MIME-based; magic-bytes
  fica para P2.1) + nova `AuditAction carta_etapa_registrada`. O server component busca as cartas
  (`tipoEvento startsWith "carta_"`, inclui as vocacionais legadas) e passa por props. UI: card
  "Cartas de etapa" na aba Documentos de `/formandos/[id]` com dialog de upload (etapa +
  PDF/imagem), download e exclusão; a aba passou a aparecer também p/ orgs `vocacionalHabilitado`
  (Processos seguem canônico-only). Testes: `formando-cartas-route.test.ts` (5 casos).

### P1.2 · Alerta de *regressão* de coverage no PR (não só threshold absoluto) — **0,5–1,0 dd** — ✅
O gate caiu 12 pp (84,6% → 72,3%) sem detecção. Threshold absoluto não pega erosão gradual.
- **Aceite:** CI compara cobertura do PR vs. base e falha/comenta se cair > X pp (ou bot de cobertura).
- **Tipo:** saúde de pipeline, não produto. **Puxar para já — barato e preventivo.**
- **Entregue:** job `coverage-diff` (PR-only) em `.github/workflows/ci.yml` mede statements do
  head vs. base (`git worktree`), faz upsert de comentário no PR e **reprova se a queda > 1,0 pp**
  (`MAX_COVERAGE_DROP_PP`). Reporter `json-summary` habilitado no `vitest.config.ts`. Resiliente:
  se a base ainda não tem baseline, comenta e não bloqueia.

### P1.3 · Investigar a regressão histórica do coverage — **0,5 dd** — ✅
`git bisect`/`log` nos 6 arquivos do gate entre 19/06 e 28/06 para achar o commit que adicionou
funções sem teste e checar dívida correlata.
- **Aceite:** commit identificado + documentado; backfill de testes se houver buraco.
- **Achado:** o buraco era `doNotify` em `lib/plan-limits.ts` (linhas 201-227) — caminho de
  notificação por e-mail (prisma + email) introduzido em **`bae5719`** (`feat(billing): plano
  Personalizado…`), sem teste; somado às branches de proxy de `getClientIp` (`d1ea846`) e ao path
  Upstash do rate-limit (já documentado como intestável sem credenciais).
- **Backfill:** 4 testes cobrindo o caminho completo do `doNotify` (cooldown / sem admins / envio +
  auditoria). `plan-limits.ts` 85% → **100%** stmts; gate global 88,1% → **93,1%**.

### P1.4 · Decisão definitiva sobre `nivelFormativo` do vocacional — **1,0–2,0 dd** — ✅
A turma usa `nivelFormativo=null`; o seletor de nível em `/planos` e `/grades` não oferece
"vocacional", então plano/grade próprios do vocacional dependem de grade emprestada de outro nível.
- **Aceite:** (a) introduzir nível `vocacional` tratando os ~9 mapas `Record<NivelFormativo>`
  (ver memória `feedback-niveis-union-exaustivo`), **ou** (b) decisão explícita de que o vocacional
  usa grade sem nível próprio, documentada.
- **Bloqueia:** P1.1.
- **Decisão do CTO:** opção **(a)** — `vocacional` vira nível nativo (sobrepõe a memória
  `feedback-niveis-union-exaustivo`, atualizada).
- **Entregue:** `'vocacional'` na union `NivelFormativo` + `NivelFormativoEnum` (zod) + 9 mapas
  exaustivos (labels/ícone/cores/requisitos/avatar/charts/etapaLabels). **Sem migração** (Prisma
  guarda `nivelFormativo` como `String`). Decisão de design: `vocacional` é **selecionável**
  (`NIVEIS_FORMATIVOS_SELECIONAVEIS`, usado em `/planos` e `/grades`) mas fica **FORA de
  `SEQUENCIA_ETAPAS`** (escada de promoção) — `getProximaEtapa` corrigido p/ retornar `null` em
  níveis fora da sequência. Invariante travada em `niveis-formativos.test.ts`.

**Subtotal P1: ~4,5–6,5 dd.**

---

## P2 — Hardening / escala (quando houver tração)

### P2.1 · Validação de conteúdo do upload da carta (anti-spoof / AV) — **1,0–1,5 dd** — ✅
`arquivo.type` é MIME declarado pelo browser (spoofável); o arquivo é armazenado e re-servido.
- **Aceite:** validação por *magic bytes* (assinatura real) e/ou scan antivírus antes do `uploadFile`.
- **Entregue:** helper puro `assinaturaConfere()` (`lib/file-signature.ts`, PDF/JPEG/PNG/WebP/HEIC)
  ligado às duas rotas de carta (vocacional + carta de etapa); mismatch → 400. Testes:
  `file-signature.test.ts` + caso anti-spoof na rota. (Scan AV fica para quando houver um serviço.)

### P2.2 · Paginação / typeahead nas listas não paginadas — **1,0–1,5 dd** — ✅ (parcial)
`participacoes` da turma, formandos disponíveis e acompanhadores carregam tudo. OK hoje; degrada
em orgs grandes.
- **Aceite:** paginação/busca server-side seguindo o padrão `parsePagination`.
- **Entregue:** `GET /api/vocacional/participacoes` ganhou `parsePagination` + `paginationHeaders` +
  busca `q` por nome do formando (escopada ao tenant), backward-compatible (sem params → retorna
  tudo). 3 testes em `vocacional-routes.test.ts`.
- **Adiado (sub-parte de baixo valor agora — 1 org em prod):** converter os *selects* de formando
  disponível e acompanhador (hoje renderizados no server component, arrays completos) em **typeahead**
  via `command.tsx`. Não capado para não esconder registros (regressão funcional). Tarefa de UI focada.

### P2.3 · Extrair o retry P2002 + lavratura para helper único — **0,5 dd** — ✅
O loop de retry está duplicado (POST/PATCH do vocacional + espelha o de processos eclesiásticos).
- **Aceite:** helper `lavrarComRetry(txFn)` reutilizado; comportamento idêntico coberto por teste.
- **Entregue:** `lib/livro-retry.ts` (`lavrarComRetry` + `isP2002`/`p2002Target`), mantendo
  `livro-registro.ts` puro. Substitui os **3 loops** do vocacional (inscrição POST + cancelamento +
  encerramento no PATCH). A opção `naoRetentar` preserva o caso permanente (`formandoId` → 409 "já
  participa", sem retry). Nota: processos-eclesiásticos faz `$transaction` simples **sem** retry
  (não havia loop a unificar lá). 6 testes em `livro-retry.test.ts`.

### P2.4 · `e2e-vocacional.ts`: reduzir risco de *drift* — **0,5–1,0 dd** — ✅
O script replica a lógica das rotas; pode divergir do handler real ao longo do tempo.
- **Aceite:** converter as checagens para chamar as rotas reais (com sessão), **ou** marcar
  explicitamente como "smoke de dados" e cobrir o handler via P0.1.
- **Entregue (opção b):** cabeçalho do script reescrito — agora declara-se **SMOKE DE DADOS** (valida
  a camada de dados + Livro contra Postgres real, NÃO os handlers HTTP) e aponta
  `__tests__/api/vocacional-routes.test.ts` (P0.1) como a **fonte de verdade** do comportamento de
  handler (authz/tenant/409). Drift aceito e documentado; regra: ao mudar uma rota, atualizar o
  handler + teste mockado primeiro.

**Subtotal P2: ~3,0–4,5 dd. ✅ entregue.**

---

## Resumo — TODO O BACKLOG CONCLUÍDO (2026-06-28)

| Tier | Itens | Estado |
|---|---|---|
| **P0** (GA) | P0.1, P0.2 | ✅ |
| **P1** | P1.1–P1.4 | ✅ (P1.2 typeahead dos selects adiado) |
| **P2** | P2.1–P2.4 | ✅ (P2.1 scan AV adiado; sem serviço) |

Commits: `cb0d7e4` (P0.1/P0.2) · `85ef003` (P1.2/P1.3) · `9886ee2` (P1.4) · `76ceaa4` (P1.1) ·
`4f3419e` (P2.1) · `7b70bc1` (P2.2) · `423e2ad` (P2.3) · P2.4 neste commit. Todos em `master`,
verdes (suíte + typecheck + lint).

### Pendências menores adiadas (baixo valor com 1 org em prod)
- **P2.2** — converter os *selects* de formando/acompanhador em typeahead (UI focada).
- **P2.1** — scan antivírus no upload (depende de um serviço de AV).

---

_Referências: memórias de projeto `project-periodo-vocacional`, `project-ci-integrity`,
`feedback-niveis-union-exaustivo`. Validação: `frontend/scripts/e2e-vocacional.ts`._
