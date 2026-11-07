---
version: "1.0"
name: Formattio
origin: >-
  Design system VIVO da plataforma Formattio (gestão da jornada formativa de
  comunidades católicas). Síntese de três fontes: o briefing de marca
  (Documentos/Briefing - Logomarca e Design System Formatio.md — requisitos +
  personalidade), a implementação real em src/app/globals.css (fonte da verdade
  dos valores OKLCH) e a DISCIPLINA do formato DESIGN.md (clickup.design.md —
  adotamos o rigor, NÃO a estética da ClickUp).
canonical_source: "src/app/globals.css — valores OKLCH ao vivo (light + .dark)."
description: >-
  Formattio roda uma única voltagem de marca — clay/terracota "#B25433"
  (Conceito H · Travessia) — reservada para AÇÃO e estado ativo, sobre um canvas
  warm-white "#FBF8F4" que faz o trabalho pesado. Tipografia Geist (Sans + Mono),
  tokens OKLCH perceptualmente uniformes com paridade light/dark, raio base 10px.
  Público católico com letramento digital intermediário → a interface prioriza
  compreensão fácil, alvos grandes e COR NUNCA SOZINHA (sempre com ícone+palavra).
  Tom: sério, acolhedor, profissional sem ser frio; institucional mas humano.
  Evitar: infantil, sacro/devocional explícito, genérico-startup, gótico.

# Snapshot de tokens (DERIVADO de globals.css — NÃO é a fonte; ao editar, edite
# globals.css e, se mudar a semântica, atualize este arquivo). Hexes aproximados.
brand:
  primary-clay: "#B25433"        # OKLCH 0.55 0.135 36 — a única voltagem
  primary-clay-dark: "#D4754C"   # OKLCH 0.66 0.135 41 — dark mode (elevado)
  canvas-light: "#FBF8F4"        # warm white
  canvas-dark: "#1A1108"
  font-sans: "Geist Sans"
  font-mono: "Geist Mono"
  radius-base: "0.625rem (10px)"

semantic-tokens:   # nomes shadcn — use os utilitários, nunca hex solto
  - primary / primary-foreground      # ação, link, destaque, estado ativo
  - primary-soft                      # RESERVADO — fundo suave/badge de clay (guia)
  - primary-deep                      # RESERVADO — hover/ênfase do primário (guia)
  - secondary / secondary-foreground  # ação de apoio, superfície suave
  - muted / muted-foreground          # texto secundário, fundos neutros
  - accent / accent-foreground        # realce discreto (hover, seleção)
  - card / card-foreground            # superfície de card
  - border / input / ring             # hairlines, campos, foco
  - destructive                       # erro / ação destrutiva (vermelho)
  - success / warning / info          # NOVO — semânticas; sempre com ícone+palavra
  - chart-1..5                        # clay, verde, âmbar, azul, vermelho
  - sidebar-*                         # superfície da sidebar

type-ramp:   # tokens NOVOS (globals.css @theme) — Geist, tracking negativo sutil
  text-display: "3rem / 1.05 / -0.02em / 700"    # hero, marketing
  text-title: "1.875rem / 1.15 / -0.015em / 650" # h1 de página
  text-heading: "1.25rem / 1.3 / -0.01em / 600"  # seção
  # Abaixo de heading, use a escala text-* padrão do Tailwind (sm/base/lg) com
  # font-semibold para rótulos de card (text-sm font-semibold é o padrão atual).

radius-lanes:   # derivados de --radius (10px) — cada faixa carrega hierarquia
  sm: "~6px — chips, badges, inputs pequenos"
  md: "~8px — botões, inputs"
  lg: "10px — superfícies médias"
  xl: "~14px — CARDS (o Card base usa rounded-xl), modais, superfícies destacadas"
  2xl+: "~18px+ — heróis, painéis grandes"
  full: "9999px — avatares, pills de status"

elevation:   # tokens NOVOS — sombras tintadas de clay (warm), não cinza neutro
  card-base: "Card shadcn usa hairline ring-1 ring-foreground/10 + rounded-xl (sem sombra)"
  shadow-sm: "sutil — superfície elevada leve"
  shadow-md: "card interativo / hover"
  shadow-lg: "popover, dropdown"
  shadow-xl: "modal, sheet"
---

## Visão geral

Formattio é um SaaS de gestão da jornada formativa para comunidades católicas.
O design system existe para que a interface seja **confiável, organizada e
acolhedora** — competência técnica + cuidado humano ao mesmo tempo — para um
público que nem sempre manuseia bem celular/computador. Por isso a barra não é
só estética: é **compreensão**.

**Uma voltagem, reservada.** A identidade é o clay "#B25433" (Conceito H ·
Travessia). Ele NÃO é espalhado: aparece em ação (botões primários), estado
ativo (item de navegação, aba), foco (ring) e momentos de marca. O canvas
warm-white e os neutros fazem o trabalho pesado. É a mesma disciplina da
ClickUp ("uma voltagem dentro do gradiente, resto sóbrio") — mas a nossa
voltagem é o clay sólido, não um gradiente neon.

**Fonte da verdade.** Os valores de cor vivem em `src/app/globals.css` (OKLCH,
com paridade `.dark`). Este arquivo documenta SIGNIFICADO e USO; ao mudar um
valor, edite `globals.css`. Ao mudar a semântica, atualize este arquivo.

## Cores — regras de uso

- **primary (clay)** — ação principal, link, destaque, estado ativo, foco. Não
  usar como fundo de seções inteiras (vira "genérico-startup"); reserve para
  onde há intenção de ação.
- **primary-soft / primary-deep** — rampa de clay do guia da marca, **reservados**
  (ainda sem consumidor): `primary-soft` = preenchimento suave de badge/fundo de
  destaque; `primary-deep` = hover/ênfase do botão primário. Valores light seguem
  o guia (`#E8B894` / `#56291B`); no dark o papel se mantém mas o tom se adapta
  (soft = superfície escura tingida; deep clareia, já que "deep" só escurece sobre
  fundo claro). Sombras tintadas → use a escala `shadow-*`, não `primary-deep`.
- **secondary / accent / muted** — superfícies e textos de apoio. `muted-foreground`
  é o cinza-warm do texto secundário.
- **destructive / success / warning / info** — semânticas. **COR NUNCA SOZINHA**:
  toda sinalização por cor leva ícone + palavra (ex.: verde + ✓ + "Concluído";
  vermelho + ✕ + "Erro"). Público com dificuldade de leitura e daltonismo.
- **chart-1..5** — paleta de dados (clay/verde/âmbar/azul/vermelho). Em gráficos,
  o número e o rótulo ficam sempre visíveis (ver [[project-bi-charts-echarts-tremor]]).
- **Multitenancy:** cada organização cliente escolhe sua cor de tema; a marca
  Formattio (clay) aparece na landing, login e painel super-admin. Nas telas do
  cliente, o branding é da ORG (logo+cor), não do Formattio. Nunca misturar.

## Tipografia

Geist Sans para tudo; Geist Mono para IDs/código. Ramp de títulos novo
(`text-display` / `text-title` / `text-heading`) com tracking negativo sutil nos
tamanhos grandes — ar institucional e legível. Pesos: títulos 600–700, corpo
400–500. Sem itálico decorativo, sem uppercase em títulos (uppercase só em
eyebrows/rótulos curtos). Texto de corpo nunca abaixo de 14px em superfícies de
leitura — o público tem dificuldade de leitura; prefira maior + contraste.

## Layout e posicionamento

- Ritmo de espaçamento na escala do Tailwind; seções respiram (stack 20/24/40).
- **Gotcha de scroll horizontal:** `SidebarInset` precisa de `min-w-0` senão
  conteúdo largo (tabela, régua de abas) empurra a página (ver [[feedback-sidebar-inset-min-w-0]]).
- Reserva do banner de cookies em telas centralizadas via `--cookie-banner-h`.
- Alvos de toque generosos (público mobile pouco letrado): botões e áreas
  clicáveis amplos, ação explícita (texto no botão, não só ícone).

## Elevação e forma

- Sombras **tintadas de clay** (warm), não cinza neutro — profundidade on-brand.
  O Card base (shadcn) usa hairline `ring-1 ring-foreground/10` + `rounded-xl`
  (14px), sem sombra; use `shadow-sm/md` para superfícies que precisam elevar.
- Escala de raio deriva de `--radius` (10px). Mantenha cada faixa na sua pista:
  não misture raios muito diferentes no mesmo cluster de componentes.

## Componentes

Base: shadcn/ui + @base-ui/react em `src/components/ui/` (30 componentes). Padrões
de composição, variantes e gotchas vivem na skill de frontend
(`.claude/skills/formattio-frontend/`). Resumo:
- **Botões** via `buttonVariants` (default/outline/ghost/secondary/destructive) — nunca estilizar `<button>` cru.
- **Card** base (shadcn) = `rounded-xl` + `ring-1 ring-foreground/10` (hairline, sem sombra); 14px bate com o guia da marca.
- **EmptyState / Skeletons** para estados vazio/carregando — sempre tratar os dois.
- **Cores semânticas** em badges/alertas com ícone+palavra.

## Do's & Don'ts

- **Do** reservar o clay para ação/estado ativo; deixar o canvas neutro liderar.
- **Do** parear toda cor semântica com ícone + palavra (inclusão digital).
- **Do** usar tokens/utilitários (`bg-primary`, `text-muted-foreground`, `shadow-sm`) — nunca hex solto.
- **Do** tratar estados: carregando (skeleton), vazio (EmptyState), erro, sucesso.
- **Don't** copiar a estética da ClickUp (roxo neon, gradiente-marca, Plus Jakarta, pílula grafite, tracking -3px) — briga com a marca e o público.
- **Don't** usar o clay como fundo de seção inteira (vira genérico-startup).
- **Don't** sinalizar só por cor; nem usar ícone sem rótulo em ação importante.
- **Don't** reverter às decisões PROVISÓRIAS do briefing (tema azul #3b82f6, símbolo "Fo", primário "indefinido") — foram superadas pela marca clay atual.

## Relação com o guia da marca (claude.ai/design)

`docs/Guia da Marca Formattio (standalone).html` é referência de **intenção da
marca**, não fonte de tokens — `globals.css` é a verdade. Comparação feita; o app
bate com o guia em símbolo, cores de marca/superfície (light+dark) e semânticas.
Divergências com **decisão consciente** (não "consertar"):

- **Ramp tipográfico:** o app usa `text-display`/`text-title`/`text-heading`
  (pesos 650–700), que **supera** os H1–H4 do guia (peso 600, 4 degraus). Mantido —
  mais ar institucional e já em uso. Não reconciliar com os pesos do guia.
- **Nome dos SVGs:** arquivos em `public/brand/` são `formatio-*.svg` (1 "t") por
  decisão; os imports apontam para o nome real. Não renomear para `formattio-`.
- **Raio de card:** o guia pede 14px e o app **já entrega** (Card = `rounded-xl`).
- `primary-soft` / `primary-deep` do guia foram adicionados como tokens reservados
  (ver acima); sem consumidor ainda.

## Lacunas conhecidas / próximos passos

- Aplicar o ramp de títulos (`text-title`) incrementalmente nos h1 de página.
- Documentar grid máximo da landing (hoje ~`max-w-6xl`).
- Estados de formulário (sucesso/erro inline) padronizados além do toast.
- Verificar paridade dark das telas de marketing.
