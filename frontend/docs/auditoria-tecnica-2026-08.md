# Auditoria Técnica Completa — Formattio (agosto/2026)

> Conduzida com medições reais em produção (www.formattio.com.br, medida do Brasil),
> build de produção local, clone do banco de produção, métricas do Railway (API GraphQL)
> e análise estática do código. **Toda conclusão abaixo tem a evidência que a sustenta.**
> Onde não foi possível medir (ex.: teste de carga real), isso está dito explicitamente.

---

## 1. Executive Summary

**O código não é o gargalo. A geografia é.**

A mesma build de produção que responde páginas autenticadas em **30–150 ms** rodando
localmente entrega **600–1.200 ms** de TTFB para um usuário no Brasil — porque o
container roda em **San Francisco (região `sfo`)**, atrás de um edge do Railway em
**Miami** (`x-hikari-trace: mia1`). O piso de rede medido (`/api/health`, handler
trivial) é **~600 ms**; ou seja, **85–95% da latência percebida é rede/localização,
não computação, banco ou React**.

| Página (prod, Brasil) | TTFB medido | Mesma build local | Overhead rede/infra |
|---|---|---|---|
| `/api/health` | 570–650 ms | 4 ms | ~99% |
| `/` (landing) | 1.040–1.710 ms | 32–77 ms | ~94% |
| `/login` | 500–1.150 ms | 33–68 ms | ~92% |
| `/blog` | 570–1.080 ms | 42–67 ms | ~93% |

**Web Vitals reais (Playwright, viewport mobile, primeira visita):**

| Página | TTFB | FCP | LCP | CLS |
|---|---|---|---|---|
| `/` (landing) | 3.855 ms | 4.472 ms | **4.472 ms (RUIM)** | 0,052 (bom) |
| `/login` | 806 ms | 1.172 ms | 2.176 ms (ok) | 0 |
| `/blog` | 593 ms | 988 ms | 988 ms (bom) | 0 |

A landing — destino do tráfego pago Meta — tem **LCP de 4,5 s em mobile na primeira
visita** (limiar "bom" do Google: 2,5 s). Causa dupla: (a) todo HTML é gerado
dinamicamente por request (CSP nonce via proxy ⇒ `cf-cache-status: DYNAMIC`, zero
cache de borda para HTML) e (b) **352 KB gzip de JavaScript** na landing.

**Infraestrutura: superprovisionada e ociosa.** Métricas Railway (últimos 7 dias,
10.681 amostras): CPU média ≈ 0, **pico 0,115 de 8 vCPU (1,4%)**; RAM média 0,49 GB,
pico 0,95 de 8 GB (12%). 2 réplicas online. **Upgrade de plano não produz ganho
mensurável nenhum. Mudar a REGIÃO produz.**

**Banco: irrelevante como gargalo.** Postgres 18.4, **13 MB** de dados totais
(pré-lançamento), 70+ índices (compostos + GIN trigram), `pg_stat_statements`
habilitado. Queries locais < 5 ms. O dashboard agrega no SQL e paraleliza com
`Promise.all`. Não há N+1 em caminho quente.

**As 3 ações que mudam o produto (ordem de ROI):**

1. **Migrar a região Railway `sfo` → `us-east4` (Virgínia)** — corta o trecho
   Miami↔SFO de todo request. Estimativa: −150 a −250 ms por round trip de origem.
   Esforço: horas. Beneficia **toda** interação de **todo** usuário.
2. **Tornar landing/blog/páginas de marketing cacheáveis na borda Cloudflare**
   (remover a dependência de nonce nessas rotas públicas + Cache Rule). TTFB
   1,1 s → ~100 ms; LCP estimado 4,5 s → ~2,0 s. Esforço: 1–2 dias. Beneficia
   aquisição paga e SEO.
3. **Dieta de JS na landing** (Sentry lazy, corte de código acima da dobra):
   352 KB gz → alvo < 200 KB gz. Esforço: 1 dia.

---

## 2. Architecture Assessment

**Nota: 8,5/10.**

Evidências (leitura direta do código):

- **Server-first consistente**: Server Components + Prisma → props → Client
  Component + `router.refresh()`. Sem biblioteca de estado client-side; estado de UI
  local. Padrão aplicado uniformemente nas 65 páginas.
- **Separação de camadas real**: `lib/` concentra lógica de negócio (users-store,
  grade-formacoes, leituras-store, tenant-context, audit-log, crypto, rate-limit);
  142 rotas de API seguem o mesmo pipeline: `auth()` → checagem de papel → escopo
  `organizacaoId` → lógica em `lib/` → `logAction()`.
- **Multi-tenancy por escopo de query** com `organizacaoId` em toda tabela e
  sessão JWT como fonte — verificado no dashboard, formandos, agenda.
- **Proxy (middleware) edge-safe**: sem Prisma/Node APIs; JWT verify, CSP nonce,
  headers de segurança, CSRF por Origin, gates de papel. Duas configs de auth
  (edge/full) intencionais.
- **Acoplamento controlado**: `types/index.ts` como fonte única de constantes de
  domínio; `nav-items.ts` como fonte única de navegação (sidebar + command palette).

Pontos de atenção (não bloqueantes):

- **Componentes-cliente gigantes**: `FormandoDetailClient.tsx` (159 KB),
  `ConfiguracoesClient.tsx` (126 KB), `GrupoFormacaoDetail.tsx` (85 KB). Não é
  problema de runtime hoje (code-splitting por rota funciona), é custo de
  manutenção e de hidratação da rota específica.
- 119 arquivos `"use client"` — proporção razoável para 65 páginas, mas as telas
  de detalhe concentram interatividade demais num único componente.
- Overengineering: não detectado. Antipatterns (useEffect-fetch para dado inicial,
  estado duplicado): não encontrados nos arquivos amostrados; o padrão do repo os
  proíbe explicitamente.

## 3. Performance Assessment (Next.js 16 + React 19 + Frontend)

**Nota compute: 9/10. Nota percebida (Brasil): 6,5/10 — dominada por rede.**

### Renderização e cache (medido)

- **Build**: 130 páginas; apenas `/privacidade`, `/termos`, `/robots.txt`,
  `/sitemap.xml`, `/_not-found` saem estáticas. **Todo o resto é ƒ Dynamic** —
  consequência direta do CSP nonce por request no proxy (nonce ⇒ HTML único por
  request ⇒ `Cache-Control: private, no-cache` ⇒ Cloudflare `DYNAMIC`).
  **Blog e landing pagam SSR de origem a cada visita** apesar de serem conteúdo
  editorial que muda raramente (`/blog/feed.xml` tem `revalidate: 3600`, as
  páginas não).
- **Data cache**: `unstable_cache` de 30 s para branding da org (layout) — correto.
  Por instância (2 réplicas), aceitável.
- **Assets estáticos**: `immutable, max-age=31536000`, **Cloudflare HIT** (Age
  135.916 s), brotli ativo. Correto.
- **Fonts**: Geist self-hosted com preload — correto.

### Custo de render por página (build de produção local, clone do banco, 3 runs)

| Página | TTFB local (quente) | Tamanho HTML |
|---|---|---|
| `/dashboard` (admin) | 80–255 ms | 150 KB |
| `/formandos` | 61–128 ms | 148 KB |
| `/formandos/[id]` | 56–103 ms | 178 KB |
| `/agenda` | 89–143 ms | **280 KB** |
| `/grupos-formacao` | 85–92 ms | 164 KB |
| `/configuracoes` | 62–118 ms | 132 KB |
| `/formacoes` | 60–68 ms | **362 KB** |
| `/planos` | 47–89 ms | 157 KB |
| APIs (`/api/formandos`, `/api/agendamentos`, `/api/notificacoes`) | 26–79 ms | ≤ 2 KB |

Todos os valores são saudáveis. Os HTMLs de `/formacoes` (362 KB) e `/agenda`
(280 KB) indicam serialização integral de coleções nas props — comprime bem com
brotli, mas **cresce linearmente com os dados do tenant**; monitorar após adoção.

### Bundle JavaScript (medido na build)

| Página | Scripts | Raw | Gzip |
|---|---|---|---|
| `/` (landing) | 20 | 1,15 MB | **352 KB** |
| `/dashboard` | 27 | 1,74 MB | **528 KB** |
| `/agenda` | 27 | 1,44 MB | 451 KB |

Maior chunk: 424 KB raw. Recharts já é dynamic import. Para o app autenticado,
528 KB gz é aceitável (SPA de trabalho, cache de longo prazo). Para a **landing de
tráfego pago, 352 KB gz é o dobro do orçamento razoável** (~150–200 KB) e contribui
para o LCP de 4,5 s em mobile.

### React 19

- Hidratação sem erros observados; CLS 0–0,05 (excelente).
- ESLint com `react-hooks` v6 (purity/set-state-in-effect) como guarda; React
  Compiler **não** está ativado (opcional; ganho pequeno dado o server-first).
- Props drilling contido pelo desenho por rota; um único Context relevante
  (`ComunidadeProvider`).

## 4. Database Assessment

**Nota: 9/10 (para a escala atual e a projetada de médio prazo).**

- **Produção**: PostgreSQL 18.4, banco de **13 MB**, `pg_stat_statements` ativo
  (ótimo para observabilidade futura). Proxy TCP público recusando conexão —
  positivo de segurança (sem exposição pública do Postgres).
- **Volume (clone fiel local)**: Formando 11, Agendamento 8, Usuario 13,
  PresencaFormacao 5, Organizacao 4. **Nesta ordem de grandeza não existe query
  lenta possível**; EXPLAIN ANALYZE aqui não discrimina nada (o planner usa seq
  scan por ser mais barato que índice em tabelas de 10 linhas).
- **Índices**: cobertura completa dos predicados quentes — compostos
  (`organizacaoId, status, dataInicio` em Agendamento; `organizacaoId, deletedAt,
  nome` em Formando), parciais implícitos por unique, e **GIN trigram** para busca
  textual em Formando/GrupoFormacao/Formacao/PlanoFormativo/GradeFormativa.
  Leve over-indexação (custo de escrita marginal) — irrelevante no volume atual.
- **Padrões Prisma**: dashboard usa `Promise.all` (9 queries paralelas) +
  `$queryRaw` com agregação no Postgres (`COUNT FILTER … GROUP BY`) para presença
  por morada — exatamente o padrão certo. `select` mínimo nas listagens.
- **N+1**: nenhum em caminho quente. Loops sequenciais com `await` existem apenas
  em rotas frias/administrativas (`api/relatorios` — 3 `findFirst` sequenciais por
  perspectiva; `api/admin/importar`; `super-admin/bulk-action`; retries do livro).
  Impacto real: poucos ms × baixa frequência. Quick win opcional (`Promise.all`).
- **Pool**: `DATABASE_POOL_SIZE=5` × 2 réplicas = 10 conexões; folga ampla.
- **Vacuum/dead tuples/locks**: nada relevante possível com 13 MB e tráfego atual.

## 5. Infrastructure Assessment (Railway, Cloudflare, R2, Upstash)

**Nota: 7/10 — recursos excelentes, geografia errada.**

### Railway (medido via API GraphQL, 7 dias, 10.681 amostras)

| Métrica | Média | Pico | Limite | Utilização pico |
|---|---|---|---|---|
| CPU | ~0,000 vCPU | 0,115 vCPU | 8 vCPU | **1,4%** |
| RAM | 0,49 GB | 0,95 GB | 8 GB | **12%** |

- 2 réplicas online, região **`sfo` (San Francisco)**; edge de entrada em **Miami**.
- Sem OOM, sem throttle, sem cold start (serviço não dorme).
- **Não existe região América do Sul no Railway** (verificado via API: us-west,
  us-east4/Virgínia, europe-west4, asia-southeast1). A melhor opção para usuários
  no Brasil é **us-east4 (Virgínia)** — rota BR↔Miami↔Virgínia é muito mais curta
  que BR↔Miami↔São Francisco.
- **Migrar para Pro: não.** Nenhuma métrica chega perto do limite do plano atual.

### Cloudflare

- `www` já proxiado (`Server: cloudflare`), brotli, estáticos com HIT.
- **HTML nunca é cacheado** (`DYNAMIC`) — hoje é consequência do nonce; ver plano §10.
- HTTP/2/3 disponíveis via Cloudflare para browsers (o curl da medição usou 1.1).

### Cloudflare R2

- **Downloads diretos por presigned URL** (15 min docs, 1 h imagens) — o backend
  não proxia bytes. Imagens: rota autenticada valida tenant e responde **302**
  para o R2. Correto. Nenhum download passando pelo backend foi encontrado.
- Uploads passam pelo backend (validação de magic bytes/AV) — correto por segurança,
  volume pequeno.

### Upstash Redis

- Rate limiting em sliding window com **retry 1× + timeout 1 s + fail-open +
  fallback in-memory** (lição do incidente de 2026-07-08, corretamente aplicada).
- Custo no caminho quente: 1 chamada REST por mutação/login. Com o container em
  SFO e o Redis em outra região, isso adiciona latência ao login; ao migrar a
  região do app, **criar/mover o database Upstash para us-east-1**.
- Fallback in-memory é por réplica (2) — degradação aceitável e documentada.

## 6. Security Assessment

**Nota: 8,5/10** (consistente com o pentest interno white-box + DAST já realizado).

Verificado nesta auditoria (headers reais de produção + código):

- CSP `strict-dynamic` + nonce por request, sem `unsafe-inline`/`unsafe-eval` em
  prod; report-uri ativo. HSTS `preload`. COOP/CORP. X-Frame-Options SAMEORIGIN.
- Cookies NextAuth `__Host-`/`__Secure-`, HttpOnly, SameSite=Lax (observado no Set-Cookie).
- CSRF: verificação de Origin para mutações no proxy + proteção nativa NextAuth.
- Rate limiting em camadas (IP + conta + mutação global de 60/min), argon2 para
  senhas, lockout por conta, MFA disponível.
- Criptografia de campo AES-256-GCM (`APP_ENCRYPTION_KEY`), LGPD (export, exclusão,
  consentimento de cookies, retenção), auditoria com IP anonimizado, Sentry com
  PII removido (`beforeSend`) e `tracesSampleRate: 0.1`.
- Postgres sem exposição pública (proxy TCP recusando).

Pendências conhecidas (fora do código): WAF de borda com regras ativas, pentest
externo, DMARC ainda `p=none`, `TRUST_PROXY` no Railway.

## 7. UX Assessment (jornada cronometrada)

Tempos de produção estimados = compute local medido + overhead de rede medido (~0,6 s
por round trip do Brasil). Login medido de ponta a ponta.

| Jornada | Tempo hoje (Brasil) | Composição |
|---|---|---|
| Login (submit → dashboard pintado) | **~3,0–3,5 s** | argon2 ~1,0 s (custo de segurança intencional) + 2–3 round trips × 0,6 s + render |
| Navegação entre páginas do app | **~0,7–1,0 s** | RSC fetch 0,6 s rede + 50–150 ms render |
| Abrir ficha do formando | ~0,7–1,0 s | idem |
| Salvar avaliação/formando (POST) | ~0,7–0,9 s | 0,6 s rede + validação/write < 100 ms |
| Download de PDF/documento | rápido | 302 → R2 direto |
| Primeira visita à landing (mobile) | **LCP 4,5 s — RUIM** | TTFB 3,9 s frio + 352 KB JS |

Pós-migração de região (estimado): navegação ~0,4–0,6 s; login ~2,3–2,7 s.
Pós-edge-cache: landing LCP ~1,5–2,0 s.

## 8. Top Gargalos (ranking por impacto real)

> Honestidade metodológica: com 13 MB de dados, CPU a 1,4% do limite e compute de
> 30–150 ms por página, **não existem 50 gargalos reais neste sistema**. Listar 50
> seria fabricar problemas. Os gargalos genuínos, ordenados por tempo consumido ×
> frequência:

| # | Gargalo | Evidência | Custo | Correção | Ganho estimado | Esforço | Risco |
|---|---|---|---|---|---|---|---|
| 1 | **Região `sfo`** (edge Miami → origem SFO) | `/api/health` 600 ms vs 4 ms local; `x-hikari-trace: mia1` | ~0,5 s × toda interação × todo usuário | Migrar app+Postgres para `us-east4` | −150–250 ms/round trip (~30–40% da latência de navegação) | Horas (redeploy + migração do volume PG; janela curta) | Médio (migração de dados; ensaiar com backup) |
| 2 | **HTML de marketing sem cache de borda** (nonce CSP global) | `cf-cache-status: DYNAMIC` em `/`, `/blog`; TTFB 0,6–1,7 s; LCP 4,5 s | Aquisição paga e SEO pagam SSR de origem sempre | CSP sem nonce (hash/allowlist) nas rotas públicas de marketing + ISR/`revalidate` + Cache Rule CF | TTFB → ~100 ms; LCP 4,5 → ~2,0 s | 1–2 dias | Médio-baixo (regressão de CSP só nas rotas públicas; testar) |
| 3 | **352 KB gz de JS na landing** | Medido na build (20 scripts) | +1–2 s de LCP/TBT em 4G | Sentry client lazy-load, auditoria de imports da landing, `next/dynamic` abaixo da dobra | −100–150 KB gz; LCP −0,5–1,0 s | 1 dia | Baixo |
| 4 | Upstash fora da região do app (login/mutações) | Login POST local 1,18 s incl. RTT Upstash | dezenas de ms por mutação | Database Upstash em us-east-1 junto da migração | −30–80 ms por mutação | Minutos | Baixo |
| 5 | HTML de `/formacoes` 362 KB e `/agenda` 280 KB | Medido | Hoje nada (brotli); risco de crescimento linear com dados | `select` mínimo/paginação quando catálogo crescer | Previne degradação futura | 0,5–1 dia (quando disparar) | Baixo |
| 6 | Cadeia login→dashboard (3 round trips) | Medido | ~1,2 s de rede além do argon2 | Mitigado por #1; opcional: `redirect` direto pós-login sem hop intermediário | −0,3–0,6 s no login | 0,5 dia | Baixo |
| 7 | Awaits sequenciais em rotas frias (`relatorios`, `importar`, `bulk-action`) | Código | ms, baixa frequência | `Promise.all` | Marginal | 30 min cada | Nulo |
| 8 | Dashboard admin: 9+ queries por carga | Código (paralelizadas) | ~80–255 ms local — ok | Nada agora; cache de 30–60 s por org se virar hot spot | — | — | — |
| 9 | Bundle do app autenticado 528 KB gz | Medido | Primeira carga apenas (cache immutable depois) | Auditoria de chunks compartilhados | −50–100 KB | 1 dia | Baixo |
| 10 | Build TS 101 s / compile 92 s | Medido | CI/deploy ~4 min | Aceitável; `tsc` incremental no CI se incomodar | −1–2 min CI | 0,5 dia | Nulo |

## 9. Quick Wins por orçamento de tempo

- **30 min**: `Promise.all` nos 3 `findFirst` de `api/relatorios`; criar database
  Upstash us-east-1 (ativar na migração).
- **1 h**: `revalidate` explícito nas páginas `/blog/*` (prepara o terreno do #2);
  lazy-load do Sentry client (`Sentry.lazyLoadIntegrations` / init pós-idle).
- **2 h**: auditoria de imports da landing com `next build --profile` + corte do
  que não é acima da dobra.
- **4 h**: migração de região ensaiada (staging do volume PG → us-east4, smoke
  test, janela de corte).
- **8 h**: CSP por grupo de rota (nonce só no app autenticado; hash/allowlist nas
  rotas públicas) + Cache Rule Cloudflare para `/`, `/blog/*`, `/recursos`,
  `/para-quem-e`, `/precos`, `/faq` + ISR.

## 10. Roadmap (5 sprints curtos)

- **Sprint 1 — Geografia (o dobrador de percepção):** migrar app + Postgres +
  Upstash para us-east4; validar TTFB alvo `/api/health` < 350 ms do Brasil;
  smoke E2E completo. *(Fazer antes do marketing pesado.)*
- **Sprint 2 — Landing rápida (aquisição paga):** CSP sem nonce nas rotas de
  marketing, ISR + edge cache, dieta de JS. Alvo: LCP mobile < 2,5 s medido.
- **Sprint 3 — Higiene de performance:** quick wins §9 restantes; orçamento de
  bundle no CI (falha se landing > 200 KB gz); Sentry release + alertas p95.
- **Sprint 4 — Observabilidade de produção:** dashboards p50/p95 por rota
  (Sentry tracing já a 10%), relatório mensal de `pg_stat_statements`, alerta de
  crescimento de payload HTML por rota.
- **Sprint 5 — Prova de escala:** teste de carga k6/Artillery (perfil: 500–1.000
  VUs, jornada login→dashboard→ficha→salvar), medir saturação real de réplica e
  pool; documentar o número de usuários/réplica.

## 11. Estimativa de ganho por intervenção

| Intervenção | Métrica | Hoje | Esperado | Δ | Complexidade | Risco |
|---|---|---|---|---|---|---|
| Região us-east4 | TTFB API (BR) | ~600 ms | ~350–420 ms | −30–40% | Baixa-média | Médio (dados) |
| Região us-east4 | Navegação app | 0,7–1,0 s | 0,4–0,6 s | −40% | — | — |
| Edge cache marketing | TTFB landing/blog | 0,6–1,7 s | ~0,1 s | −85–95% | Média | Médio-baixo |
| Edge cache + dieta JS | LCP landing mobile | 4,5 s | ~1,8–2,2 s | −55% | Média | Baixo |
| Upstash co-locado | Latência mutação | +30–80 ms | ~+5 ms | — | Trivial | Baixo |
| Promise.all rotas frias | ms por chamada | ~3× RTT DB | 1× RTT | marginal | Trivial | Nulo |

## 12. Decisão Executiva

1. **O Railway é o gargalo?** Como *plataforma*, não (CPU 1,4% do limite, RAM 12%,
   sem throttle/OOM/cold start). Como *localização*, **sim**: região `sfo` +
   edge Miami custam ~0,5 s por interação a partir do Brasil.
2. **Vale migrar para Hobby?** O serviço já opera com limites de classe Hobby
   (8 vCPU/8 GB, 2 réplicas) e sobra recurso. Não há o que ganhar.
3. **Vale migrar para Pro?** **Não.** Nenhuma métrica encosta nos limites atuais.
   Gastar em plano antes de mover região é pagar por CPU que ficará igualmente ociosa.
4. **O PostgreSQL é gargalo?** **Não.** 13 MB, índices completos, queries < 5 ms,
   `pg_stat_statements` pronto para monitorar quando houver volume.
5. **O Prisma é gargalo?** **Não.** Padrões corretos (paralelismo, agregação no
   banco, select mínimo); nenhum N+1 quente.
6. **O Next.js é gargalo?** Parcialmente — **por configuração, não por natureza**:
   o CSP nonce global torna todas as páginas dinâmicas e anula o cache de borda
   das páginas públicas. É autoinfligido e reversível (item #2).
7. **O React é gargalo?** **Não.** CLS ~0, hidratação limpa, render local rápido.
   O único débito frontend material é o peso de JS da landing.
8. **O Cloudflare R2 é gargalo?** **Não.** Downloads diretos por presigned URL,
   estáticos com HIT na borda.
9. **Maior gargalo da aplicação:** a distância física entre o usuário brasileiro
   e a origem em San Francisco.
10. **Melhoria de maior impacto:** migração de região (beneficia 100% das
    interações) — seguida do edge cache da landing (beneficia 100% da aquisição).
11. **Antes do Go Live:** Sprint 1 (região) e Sprint 2 (landing) — ambas ficam
    mais difíceis depois, com clientes ativos e campanha rodando. O restante pode
    ser pós-lançamento.
12. **Nota arquitetura: 8,5/10** — server-first disciplinado, camadas claras,
    multi-tenancy correto; desconto por componentes-cliente monolíticos.
13. **Nota escalabilidade: 8/10** — escopo por tenant, índices, paginação
    server-side; atenção aos payloads HTML que crescem com dados.
14. **Nota performance: 6,5/10 hoje** (percebida do Brasil, por geografia + landing);
    o compute isolado é 9/10. Com Sprints 1–2: ~8,5/10.
15. **Nota segurança: 8,5/10** — postura consistente e verificada; resta WAF
    ativo + pentest externo para subir.
16. **Nota maturidade para produção: 8/10** — backups validados, observabilidade
    básica, CI com E2E; falta teste de carga e alertas p95.
17. **Suporta N usuários simultâneos?** Base de cálculo: pico de 0,115 vCPU com o
    tráfego atual; custo de render medido 50–150 ms de CPU por página dinâmica;
    16 vCPU agregadas (2 réplicas) ⇒ capacidade teórica na ordem de **100–300
    páginas/s**. Com think time típico de 30 s por usuário ativo:
    - **50 simultâneos** (~2 req/s): folga de duas ordens de grandeza — **sim**.
    - **100** (~3–4 req/s): **sim**.
    - **500** (~17 req/s): **sim**, com margem ~10×.
    - **1.000** (~33 req/s): **sim** no compute; pool Postgres (10 conexões) passa
      a ser o primeiro limite a vigiar — subir `DATABASE_POOL_SIZE` e/ou réplicas.
    - **5.000** (~170 req/s): **provável com escala horizontal** (réplicas extra é
      um clique no Railway; Postgres precisa de pool maior e monitoramento), mas
      **este número exige teste de carga real antes de ser prometido** — é
      exatamente o Sprint 5.

## 13. Recomendação final de investimento

**Otimização de software/infra-posicionamento: sim. Compra de infraestrutura: não.**

O sistema tem sobra de recurso em tudo que se compra com dinheiro (CPU, RAM, plano,
réplicas) e déficit apenas no que se corrige com engenharia: **onde** a origem está
(região), **o que** é cacheado na borda (CSP/ISR) e **quanto** JavaScript a landing
carrega. As três correções somadas custam dias de trabalho, nenhuma mensalidade
adicional relevante, e trocam a experiência do usuário brasileiro de "0,7–1,0 s por
clique e landing de 4,5 s" para "~0,4–0,6 s por clique e landing < 2,5 s".

---

### Apêndice — Metodologia e fontes de evidência

- **Prod (Brasil)**: `curl` (TTFB/headers, 3–4 runs por rota) + Playwright Chromium
  viewport mobile (Web Vitals, primeira visita) em 2026-08-06.
- **Local**: mesma build `next build` (Next 16.2.11/Turbopack), `next start`,
  banco = clone fiel do tenant de produção; 2–3 runs por rota, valores quentes.
- **Railway**: API GraphQL (`metrics`: CPU_USAGE, MEMORY_USAGE_GB, limites;
  `regions`), `railway status/variables` — 7 dias de série.
- **Banco**: produção via variáveis do serviço (versão/tamanho/extensões
  confirmados antes de o proxy público ser bloqueado); estrutura e volumes no
  clone local; índices por leitura de `schema.prisma` (1.442 linhas).
- **Código**: leitura direta de proxy, layout, dashboard, storage, rate-limit,
  Sentry configs; greps de padrões (N+1, cache, client components) em `src/` completo.
- **Não medido (declarado)**: teste de carga real; p95 de produção com usuários
  reais (Sentry tracing coleta 10% — usar após lançamento); Lighthouse score
  completo (as métricas de campo LCP/CLS/FCP/TTFB foram coletadas diretamente).
