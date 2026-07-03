# Backlog pós Go-to-Market — Formattio

> Documento de produto/engenharia. Fonte de verdade do backlog **posterior ao lançamento**.
> Os bloqueadores de go-live (Stripe prod, WAF/Cloudflare, pentest externo, staging) NÃO estão
> aqui — ver `docs/` de segurança e a memória de go-live-readiness.
>
> Princípios de aceite (fase go-to-market): **produto real, usuários reais**; features **úteis e de
> mecânica fácil**; **encantar** o usuário; **zero código inútil** (código reservado para etapa
> futura planejada NÃO é código morto — mantém-se).

Última atualização: 2026-07-01.

---

## Leitura estratégica

Dois blocos de maturidade no produto:

- **Forte — Governança & Registro (diferencial):** Jornada Vocacional, Processos Eclesiásticos, Livro
  de Registro cartorial, Período Vocacional, Documentos, Livro de Promessas. Profundo e difícil de
  copiar — vende o contrato.
- **Mais fino — Engajamento & Ritmo do dia a dia:** Agenda, Presença, Portal do Formando,
  Notificações. Funciona, mas é *informativo*; ainda não **puxa** o usuário de volta com regularidade.

O ganho de maior alavancagem pós-GTM está no segundo bloco, com tie-in de negócio direto:
**retenção → churn** (métrica já acompanhada no cockpit super-admin). Governança fecha o contrato;
ritmo/engajamento segura a renovação.

---

## P0 — Higiene contínua (transversal, sempre ligada)

| # | Item | Ganho | Skill |
|---|---|---|---|
| 0.1 | **Zero código inútil** — sweep com `knip` (arquivos/exports/deps/types órfãos) no CI. Distinguir *inútil* (remove) de *reservado p/ etapa planejada* (mantém) | App enxuto; menos superfície e ruído | `security-review` / `/code-review` |

Status 2026-07-01: `lib/mock-data.ts` (protótipo órfão) **removido**. Reservados/planejados que
**permanecem**: coluna `googleCalendarEventId` (→ item 1.4) e modelo `Compromisso` (→ item 1.5).

---

## Tema 1 — Engajamento & Ritmo *(maior ROI de retenção)*

| # | Item | Ganho / feature alavancada | Esforço | Skill |
|---|---|---|---|---|
| 1.1 | **"Adicionar ao calendário" (`.ics` + link Google)** — fonte = seção Calendário; espelha p/ Portal do Formando. Gerado no cliente (Blob + link Google), sem endpoint novo | Evento no calendário pessoal + lembrete nativo ↔ Agenda, Portal | P | `feature-dev` → `/code-review` → `verify` |
| 1.2 | ✅ **Lembretes inteligentes** (T-24h / T-2h via push+e-mail com `.ics`) — cron `*/15`, idempotência via flags no `Agendamento`, escopo espelha o agendamento (org vs grupo+FC) | Reduz falta ↔ Push, Agenda, Presença | P/M | `feature-dev` |
| 1.3 | ✅ **Confirmação de presença 1-clique no lembrete** (deep link RSVP) — botões "Vou/Não vou" no e-mail (1.2) → página pública `/rsvp/[token]` (POST no mount, sem login) grava `confirmacaoFormando` via upsert; ausência com motivo opcional notifica o FC; guard `data <= now` protege a taxa de presença | Fecha o loop de presença ↔ Portal RSVP | M | `feature-dev` |
| 1.4 | **Sync bidirecional Google Calendar** — só sob demanda de cliente pagante (usa `googleCalendarEventId` reservado) | Propagação de alteração + RSVP de volta ↔ Agenda | G | `Plan` → `feature-dev` → `security-review` |
| 1.5 | ✅ **Agenda pessoal do formador (modelo `Compromisso`)** — aba "Meus compromissos" na Agenda (privada por formador), CRUD com categorias (reunião/visita/formação pessoal/outro), vínculo opcional a formando, `.ics` via AdicionarAoCalendario; sem migração (usou o modelo reservado) | Organiza o dia do formador ↔ Agenda, Formandos | M | `feature-dev` |
| 1.6 | ✅ **E-mail de agenda opt-out por FG** — toggle `emailAgendamentoAtivo` (default ligado) em Configurações governa TODOS os e-mails de agenda ao formando (novo e-mail de **criação** + lembretes 1.2), com `.ics`+RSVP; push/bell sempre ligados; e-mail ao FC (staff) mantido. `sendAgendamentoCriadoEmail` + gate no cron de lembretes | Notificação por e-mail com controle de reputação ↔ Configurações (FG), Agenda, e-mail | M | `feature-dev` |
| 1.7 | **Agendamento para vários grupos** — hoje um `Agendamento` é *ou* de um grupo *ou* geral (org). Permitir selecionar **um ou mais grupos** na criação (notifica membros desses grupos + seus FCs). Requer mudança de schema (N:N `Agendamento`↔`GrupoFormacao`) + UI de criação; os lembretes do 1.2 passam a espelhar o multi-escopo | Precisão do alcance de convites/lembretes ↔ Agenda, Grupos, Push | M | `Plan` → `feature-dev` |

## Tema 2 — Deleite & Usabilidade *(o "encantar")*

| # | Item | Ganho | Esforço | Skill |
|---|---|---|---|---|
| 2.1 | ✅ **Empty states com propósito** — componente `ui/empty-state.tsx` (halo clay + CTA em slot) aplicado a 8 listas (Formandos, Grupos, Planos, Grades, Formações, Agenda, Jornada Vocacional, Vocacional); distingue vazio-de-verdade (CTA 1ª ação, respeita permissão) de vazio-por-filtro (limpar filtros) | Onboarding contínuo, sem tela morta | P | `frontend-design` |
| 2.2 | ✅ **Home "meu dia/minha semana" do formador** — saudação personalizada + faixa `MinhaSemana` (3 cards: próximos encontros 7d, pendências acionáveis por perfil, destaques = aniversariantes + marcos formativos ≥80%) no topo do dashboard | Vira home útil ↔ Dashboard, Agenda | M | `frontend-design` + `feature-dev` |
| 2.3 | 🔄 **Micro-interações & polish mobile** (transições, skeletons, toasts). **Feito:** skeletons de carregamento por rota (`ui/skeletons.tsx` + 14 `loading.tsx`), eliminando a tela congelada na navegação; toasts (sonner) já adotados. **Falta:** hover/press em cards/linhas, fade-in consistente nas listas, refino mobile fino | Sensação premium | P/M | `frontend-design` |
| 2.4 | ✅ **Busca global / command palette (Cmd-K)** — paleta ⌘K/Ctrl-K no topbar (troca o input decorativo); navegação por teclado + ações rápidas de criação (gestão) + busca de formandos/grupos/planos/grades/formações via `/api/search` escopado por org+papel; helper único `resolveNavGroups` (sidebar+paleta) | Velocidade p/ admins | M | `feature-dev` |

## Tema 3 — Insight & Gestão *(alavanca o diferencial de governança)*

| # | Item | Ganho | Esforço | Skill |
|---|---|---|---|---|
| 3.1 | ✅ **Painel de progresso da jornada por grupo** — aba "Jornada" no detalhe do grupo (funil por etapa, progresso na etapa com "pode avançar", "precisam de atenção" = ritmo atrasado e/ou presença <50%); client-side, helpers puros `lib/jornada-progresso.ts` | Registro → ação ↔ Jornada, Grupos | M | `feature-dev` |
| 3.2 | **Relatórios exportáveis (PDF/CSV) p/ coordenação** | Prestação de contas ↔ Relatórios, Livro | M | `feature-dev` |
| 3.3 | ✅ **Alertas de formando "em risco"** — cron semanal `/api/cron/formandos-em-risco` avalia (mesma régua do 3.1: ritmo atrasado e/ou presença <50%) e alerta o FC do grupo por bell + e-mail digest; anti-spam via `Formando.riscoAlertadoEm` (re-alerta 14d, reset ao recuperar) | Retenção do formando ↔ Presença, Progresso | M | `feature-dev` |

## Tema 4 — Integrações & Alcance

| # | Item | Ganho | Esforço | Skill |
|---|---|---|---|---|
| 4.1 | **WhatsApp p/ lembretes/convites** (canal real do público BR) | Alcance onde o público está ↔ Notificações | G | `Plan` primeiro |
| 4.2 | Sync Google Calendar 2-vias (= 1.4) | ver Tema 1 | G | — |

## Tema 5 — Expansão de módulo *(dirigido por demanda/receita)*

Comunicação em massa por segmento; biblioteca de recursos formativos; PWA instalável mais completo;
portal do formador comunitário enriquecido. **Só entram com sinal de cliente pagante.**

---

## Sequência recomendada

- **Onda 1 (quick wins de retenção):** 1.1 → 1.2 → 2.1 → 2.2 (+ 0.1 sempre ligada).
- **Onda 2:** 3.1 → 3.3 → 1.3 → 1.6 → 1.5 (fecham o ciclo governança ↔ engajamento, e-mail opt-in e a agenda do formador).
- **Onda 3 (demanda/receita):** 4.1 WhatsApp, 1.4 Google 2-vias.

**Em execução agora:** 1.1 (seguro para entrar antes mesmo do go-live).

---

## Nota sobre código reservado (não é código morto)

Pela régua do produto, **código reservado para uma etapa futura planejada permanece**. Reservados
hoje: `googleCalendarEventId` em `Agendamento`/`Compromisso` (item 1.4) e o modelo `Compromisso`
(item 1.5). O sweep `knip` (0.1) mira apenas o **inútil** (órfão, sem plano), como foi o caso do
`lib/mock-data.ts` já removido.
