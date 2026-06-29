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

### P1.1 · Carta recorrente por etapa + surfacing na aba Documentos do formando — **2,5–3,0 dd**
Requisito de produto já levantado ("ao fim de cada etapa há retiro e carta"); hoje só existe
`cartaArquivoId` na participação vocacional.
- **Aceite:** modelo genérico de "carta de etapa" (recorrente) · upload reaproveitando o fluxo
  atual · exibição na aba Documentos de `/formandos/[id]` (o `Arquivo` já grava
  `tipoEvento="carta_vocacional"` + `formandoId`).
- **Depende de:** P1.4 (a decisão de nível afeta a modelagem).

### P1.2 · Alerta de *regressão* de coverage no PR (não só threshold absoluto) — **0,5–1,0 dd**
O gate caiu 12 pp (84,6% → 72,3%) sem detecção. Threshold absoluto não pega erosão gradual.
- **Aceite:** CI compara cobertura do PR vs. base e falha/comenta se cair > X pp (ou bot de cobertura).
- **Tipo:** saúde de pipeline, não produto. **Puxar para já — barato e preventivo.**

### P1.3 · Investigar a regressão histórica do coverage — **0,5 dd**
`git bisect`/`log` nos 6 arquivos do gate entre 19/06 e 28/06 para achar o commit que adicionou
funções sem teste e checar dívida correlata.
- **Aceite:** commit identificado + documentado; backfill de testes se houver buraco.

### P1.4 · Decisão definitiva sobre `nivelFormativo` do vocacional — **1,0–2,0 dd** *(pendente decisão de produto)*
A turma usa `nivelFormativo=null`; o seletor de nível em `/planos` e `/grades` não oferece
"vocacional", então plano/grade próprios do vocacional dependem de grade emprestada de outro nível.
- **Aceite:** (a) introduzir nível `vocacional` tratando os ~9 mapas `Record<NivelFormativo>`
  (ver memória `feedback-niveis-union-exaustivo`), **ou** (b) decisão explícita de que o vocacional
  usa grade sem nível próprio, documentada.
- **Bloqueia:** P1.1.

**Subtotal P1: ~4,5–6,5 dd.**

---

## P2 — Hardening / escala (quando houver tração)

### P2.1 · Validação de conteúdo do upload da carta (anti-spoof / AV) — **1,0–1,5 dd**
`arquivo.type` é MIME declarado pelo browser (spoofável); o arquivo é armazenado e re-servido.
- **Aceite:** validação por *magic bytes* (assinatura real) e/ou scan antivírus antes do `uploadFile`.

### P2.2 · Paginação / typeahead nas listas não paginadas — **1,0–1,5 dd**
`participacoes` da turma, formandos disponíveis e acompanhadores carregam tudo. OK hoje; degrada
em orgs grandes.
- **Aceite:** paginação/busca server-side seguindo o padrão `parsePagination`.

### P2.3 · Extrair o retry P2002 + lavratura para helper único — **0,5 dd**
O loop de retry está duplicado (POST/PATCH do vocacional + espelha o de processos eclesiásticos).
- **Aceite:** helper `lavrarComRetry(txFn)` reutilizado; comportamento idêntico coberto por teste.

### P2.4 · `e2e-vocacional.ts`: reduzir risco de *drift* — **0,5–1,0 dd**
O script replica a lógica das rotas; pode divergir do handler real ao longo do tempo.
- **Aceite:** converter as checagens para chamar as rotas reais (com sessão), **ou** marcar
  explicitamente como "smoke de dados" e cobrir o handler via P0.1.

**Subtotal P2: ~3,0–4,5 dd.**

---

## Resumo

| Tier | Itens | Esforço |
|---|---|---|
| **P0** (GA) | P0.1, P0.2 | **~2,5–3,0 dd** |
| **P1** | P1.1–P1.4 | **~4,5–6,5 dd** (P1.4 pendente de decisão) |
| **P2** | P2.1–P2.4 | **~3,0–4,5 dd** |
| | **Total** | **~10–14 dd** |

### Sequenciamento recomendado
1. **P0.1 + P0.2** (~3 dd) → habilita liberação a clientes (caminho crítico do GA).
2. **P1.2 + P1.3** em paralelo (baratos, saúde de pipeline) → evitam novas regressões silenciosas.
3. **P1.4** (decisão de produto) **antes** de **P1.1** (modelagem da carta/grade depende do nível).
4. **P2** conforme tração/escala.

---

_Referências: memórias de projeto `project-periodo-vocacional`, `project-ci-integrity`,
`feedback-niveis-union-exaustivo`. Validação: `frontend/scripts/e2e-vocacional.ts`._
