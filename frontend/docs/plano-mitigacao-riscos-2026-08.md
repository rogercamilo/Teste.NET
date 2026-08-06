# Plano de Mitigação de Riscos e Pendências — Formattio (agosto/2026)

> Derivado da [auditoria técnica de 2026-08-06](./auditoria-tecnica-2026-08.md).
> Cada risco tem: severidade (probabilidade × impacto), mitigação, plano de execução
> com **rollback**, critério de saída verificável e prioridade.
>
> **P0** = antes do go-live/campanha paga · **P1** = primeiras 2–4 semanas ·
> **P2** = pós-tração / contínuo.

## Matriz-resumo

| # | Risco / Pendência | Prob. | Impacto | Sev. | Prio | Esforço |
|---|---|---|---|---|---|---|
| R1 | Latência geográfica (região `sfo`) degrada toda a experiência BR | Certa (medida) | Alto | **Crítica** | P0 | Horas–1 dia |
| R2 | Landing LCP 4,5 s queima verba de aquisição paga | Certa (medida) | Alto | **Crítica** | P0 | 1–2 dias |
| R3 | 11 vulnerabilidades Dependabot (4 high) no repositório | Alta | Médio–alto | **Alta** | P0 | 0,5–1 dia |
| R4 | Migração de região pode corromper/perder dados (risco da própria mitigação R1) | Baixa | Crítico | **Alta** | P0 | Incluído no R1 |
| R5 | Mudança de CSP pode quebrar páginas públicas (risco da mitigação R2) | Média | Alto | **Alta** | P0 | Incluído no R2 |
| R6 | Stripe em test mode — não há como cobrar cliente real | Certa | Alto | **Alta** | P0 | 0,5 dia |
| R7 | Capacidade prometida (1.000+ simultâneos) nunca validada sob carga | Média | Alto | Média–alta | P1 | 1–2 dias |
| R8 | WAF de borda inativo + pentest externo pendente | Média | Alto | Média–alta | P1 | 0,5 dia + contratação |
| R9 | DMARC `p=none` — domínio spoofável para phishing | Média | Médio–alto | Média | P1 | Minutos + observação |
| R10 | Sem observabilidade de p95/alertas — degradação só será notada por reclamação | Média | Médio | Média | P1 | 1 dia |
| R11 | `TRUST_PROXY` pendente no Railway (rate-limit por IP pode agrupar usuários) | Média | Médio | Média | P1 | Minutos |
| R12 | Upstash fora da região do app (latência em todo login/mutação) | Certa | Baixo–médio | Média | P0* | Minutos |
| R13 | Payloads HTML crescem linearmente com dados do tenant (362 KB `/formacoes`) | Média (futuro) | Médio | Média | P2 | 0,5–1 dia quando disparar |
| R14 | Pool Postgres (10 conexões) vira teto antes da CPU ao escalar | Baixa (hoje) | Médio | Baixa–média | P2 | Minutos quando disparar |
| R15 | Sem ambiente de staging — mudanças de infra são testadas em produção | Média | Médio | Média | P1 | 0,5 dia |
| R16 | Restore de backup nunca ensaiado ponta a ponta (backup existe e é validado) | Baixa | Crítico | Média | P1 | 2 h |
| R17 | Chave SSH da auditoria registrada na conta Railway | — | Baixo | Baixa | P1 | Minutos |
| R18 | Higiene de código: awaits sequenciais em rotas frias; bundle 528 KB do app | Baixa | Baixo | Baixa | P2 | Horas |

\* R12 é P0 apenas porque deve ser feito **junto** com a R1 (mesma janela), não por urgência própria.

---

## P0 — Antes do go-live / campanha paga

### R1 · Migrar região Railway `sfo` → `us-east4` (app + Postgres)

**Risco mitigado:** ~0,5 s de rede em toda interação do Brasil (TTFB `/api/health`
600 ms vs 4 ms local; edge Miami → origem SFO).

**Plano de execução (com R4 embutido):**
1. **Backup imediatamente antes** — disparar o job pg_dump→R2 já validado e
   conferir o artefato (tamanho > 0, restore de amostra local).
2. Criar os serviços na região `us-east4` primeiro (app + Postgres novos), sem
   desligar os atuais: restaurar o dump no Postgres novo, apontar o app novo para
   ele, replicar variáveis de ambiente (`railway variables` já inventariadas).
3. Smoke test no domínio interno do Railway do app novo: login, dashboard, ficha
   de formando, upload/download (R2), webhook Stripe em modo teste.
4. Janela de corte (horário de menor uso): congelar escritas (aviso ou modo
   manutenção), dump incremental final, restore, trocar o domínio
   `www.formattio.com.br` para o serviço novo, validar, liberar.
5. Manter o ambiente `sfo` **parado mas intacto por 7 dias** — é o rollback: basta
   reapontar o domínio.

**Rollback:** reapontar domínio para o serviço antigo (minutos). Perda máxima:
escritas feitas entre o corte e o rollback — por isso a janela curta e congelamento.

**Critério de saída:** `/api/health` TTFB < 350 ms medido do Brasil; E2E Playwright
verde contra produção; backup automático rodando no ambiente novo.

**Armadilhas conhecidas:** o deploy do Railway espera CI verde ("Wait for CI") — E2E
vermelho deixa deploy `Skipped` em silêncio; conferir o painel após o corte.

### R12 · Co-locar Upstash (na mesma janela da R1)

Criar database Upstash em `us-east-1`, trocar `UPSTASH_REDIS_REST_URL/TOKEN` no
serviço novo. Rate-limit é stateless entre janelas — não há dado a migrar (contadores
zeram, aceitável). **Critério:** login POST sem os +30–80 ms de RTT cross-region.

### R2 · Landing/blog cacheáveis na borda + dieta de JS

**Risco mitigado:** LCP 4,5 s mobile na primeira visita da landing — destino do
tráfego pago Meta; desperdício direto de verba e dano ao SEO.

**Plano de execução (com R5 embutido):**
1. **CSP por grupo de rotas no proxy:** manter nonce + `strict-dynamic` no app
   autenticado; nas rotas públicas de marketing (`/`, `/blog/*`, `/recursos`,
   `/para-quem-e`, `/precos`, `/faq`, `/termos`, `/privacidade`) usar CSP **sem
   nonce** (hash/allowlist). Atenção ao incidente conhecido: página estática +
   nonce = tela branca — é exatamente o acoplamento que está sendo removido.
2. Tornar essas rotas estáticas/ISR (`revalidate` 1 h; blog pode ser maior).
   Remover `force-dynamic` onde houver (ex.: `/precos`) avaliando por que existe.
3. Cache Rule no Cloudflare para os paths de marketing (respeitar `s-maxage`),
   com bypass por cookie de sessão para não cachear variante logada da `/`.
4. Dieta de JS da landing: Sentry client lazy (init pós-idle), auditar os 20
   scripts (352 KB gz) e adiar tudo que está abaixo da dobra com `next/dynamic`.
5. Validação em 3 camadas antes de anunciar: (a) `curl` — `cf-cache-status: HIT`
   e TTFB < 200 ms; (b) Playwright mobile — LCP < 2,5 s primeira visita; (c)
   console sem violação de CSP em todas as páginas públicas **e** no fluxo
   Stripe/checkout (js.stripe.com está na allowlist — retestar).

**Rollback:** reverter a Cache Rule (instantâneo) e o commit do proxy. O CSP
report-uri (`/api/csp-report`) já existe — monitorá-lo nos primeiros dias para
capturar violações não previstas.

**Critério de saída:** LCP mobile < 2,5 s medido; zero relatórios de CSP novos em
72 h; funil de leads (eBook) e Meta Pixel funcionando (o Pixel é consent-gated e
carrega via script — testar com consentimento dado).

### R3 · Triagem das 11 vulnerabilidades Dependabot (4 high)

1. Abrir `github.com/rogercamilo/Teste.NET/security/dependabot` e classificar:
   dependência de runtime vs. dev-only vs. transitiva sem caminho explorável.
2. `npm audit` local + aplicar upgrades; para transitivas sem fix, `overrides` no
   `package.json` com anotação.
3. Rodar CI completo (lint/typecheck/test/E2E) — upgrades de dependência são a
   causa clássica de regressão silenciosa.

**Critério de saída:** 0 high abertas; moderadas justificadas por escrito (issue ou
comentário no relatório). **Contínuo:** Dependabot + CodeQL já ativos; adicionar
verificação semanal à rotina.

### R6 · Stripe em produção

Ativar chaves live, recriar os 6 prices (3 planos × mensal/anual), configurar o
webhook live (`/api/stripe/webhook`) e fazer **uma compra real de valor mínimo**
com estorno. Atenção à divergência já mapeada de preços PDF (R$89/189/389) vs.
código (R$97/197/397) — **decidir o preço canônico antes** de criar os prices.

**Critério de saída:** checkout real completo + webhook processado + assinatura
visível no cockpit super-admin.

---

## P1 — Primeiras 2–4 semanas

### R8 · WAF de borda + pentest externo

- O `www` já está proxiado no Cloudflare — ativar **WAF Managed Rules** (free tier
  tem core ruleset) + rate limiting de borda nos endpoints de auth é a "FASE 2"
  já planejada da migração DNS. Rodar em modo *log* por 48 h antes de *block*
  para não derrubar tráfego legítimo (uploads grandes, webhooks).
  Exceções necessárias: `/api/stripe/webhook`, `/api/webhooks/resend` (assinados,
  podem parecer "anômalos" ao WAF).
- Pentest externo: contratar quando houver primeira receita; é o item que falta
  para subir a nota de segurança de 8,5.

### R9 · DMARC

Evoluir `p=none` → `p=quarantine; pct=25` → `pct=100` → `p=reject`, observando os
relatórios `rua=` por 1–2 semanas em cada degrau (e-mail transacional é crítico
para convites/reset — não pular degraus). DNS no Cloudflare.

### R7 · Teste de carga (valida a promessa de capacidade)

k6/Artillery com jornada real (login → dashboard → ficha → salvar avaliação),
rampa 50 → 500 → 1.000 VUs, contra o ambiente novo em us-east4 (fora de horário
de uso; org demo isolada `demo_org_formattio` como alvo). Medir: p95 por rota,
saturação de réplica, conexões Postgres.
**Critério:** número documentado de "usuários simultâneos por réplica" e gatilho
de auto-scale definido a partir de dado, não de estimativa.

### R10 · Observabilidade mínima de produção

- Sentry: alertas de erro novo + p95 por transação (tracing já coleta 10%).
- Rotina mensal: top 10 do `pg_stat_statements` (já ativo no Postgres 18.4).
- Vigiar tamanho de resposta HTML por rota (ver R13) — pode ser um check simples
  no CI ou um cron que mede `/formacoes` e `/agenda` da org demo.
- O cockpit já alerta pool ≥80% via cron — conferir que continua ativo pós-migração
  (o `CRON_SECRET` é Repository secret; ambiente novo precisa dele).

### R11 · `TRUST_PROXY`

Setar no serviço Railway novo (pendência conhecida do hardening de auth): sem ele,
o rate-limit por IP pode enxergar o IP do proxy em vez do cliente — em evento de
abuso, bloquearia todos os usuários atrás do mesmo edge de uma vez.
**Critério:** log de login exibindo IP real do cliente.

### R15 · Staging mínimo

A migração R1 já cria, de graça, a receita de "ambiente paralelo por restore".
Formalizar: script que sobe app+Postgres efêmeros a partir do último dump para
ensaiar mudanças de infra/migrações destrutivas (a classe de incidente
"migration FK sobre dado denormalizado" — dev passa, prod quebra — é exatamente o
que staging com dados reais pega).

### R16 · Ensaio de restore (disaster recovery drill)

O backup diário pg_dump→R2 está validado como *artefato*; falta ensaiar o
*procedimento*: restore completo → app apontado → smoke test → tempo total medido
(RTO real). Repetir trimestralmente. **Critério:** runbook escrito com RTO/RPO
medidos (RPO atual = até 24 h; avaliar se é aceitável pós-receita).

### R17 · Chave SSH da auditoria

Decidir: manter (útil para diagnósticos futuros — a porta 22 estava bloqueada no
firewall local de qualquer forma) ou remover no painel Railway → Account → SSH Keys.

---

## P2 — Pós-tração / contínuo

### R13 · Payloads HTML que crescem com dados

Gatilho objetivo: quando `/formacoes` ou `/agenda` de um tenant real passar de
~500 KB raw, aplicar `select` mínimo + paginação (padrão já usado em `/formandos`).
Não fazer antes — é otimização especulativa hoje.

### R14 · Pool Postgres

`DATABASE_POOL_SIZE=5` × 2 réplicas = 10 conexões. Ao adicionar réplicas ou após
o teste de carga apontar espera de conexão, subir o pool e/ou introduzir pgbouncer.
O alerta de ≥80% do cockpit é o gatilho.

### R18 · Higiene de código (quick wins da auditoria)

- `Promise.all` nos 3 `findFirst` sequenciais de `api/relatorios` (e revisar
  `importar`/`bulk-action`).
- Orçamento de bundle no CI: falha se landing > 200 KB gz / app > 550 KB gz.
- Avaliar quebra dos componentes-cliente gigantes (`FormandoDetailClient` 159 KB)
  quando forem tocados por features — não como projeto próprio.

---

## Ordem de execução recomendada (visão de calendário)

| Semana | Entregas |
|---|---|
| **1** | R1+R12 (migração de região, com R4 controlado) → R3 (Dependabot) em paralelo à observação pós-migração |
| **2** | R2 (edge cache + dieta JS, com R5 controlado) → R6 (Stripe live) · R11 e R17 (minutos cada) |
| **3** | R8 (WAF em modo log→block) · R9 (DMARC 1º degrau) · R16 (drill de restore) |
| **4** | R7 (teste de carga no ambiente novo) · R10 (alertas/p95) · R15 (formalizar staging) |
| Contínuo | R9 (degraus DMARC) · R13/R14 (por gatilho) · R18 (oportunista) · pentest externo (pós-receita) |

**Dependências fortes:** R2 depois de R1 (medir LCP já na região nova, para não
otimizar duas vezes); R7 depois de R1 (carga contra o ambiente definitivo); R6
independente, mas antes da campanha; R8 depois de R2 (regras de cache e WAF na
mesma passada de Cloudflare).

**Critério global de "pronto para campanha":** TTFB API < 350 ms (BR) · LCP landing
mobile < 2,5 s · 0 vulns high · checkout real validado · WAF ativo · alerta de erro
e p95 ligados.
