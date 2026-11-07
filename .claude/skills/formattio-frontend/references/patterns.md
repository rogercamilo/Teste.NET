# Padrões de composição, componentes e gotchas

Complemento operacional da `SKILL.md`. Leia quando for montar/editar telas.

## Inventário `src/components/ui/` (shadcn + @base-ui/react)

button · card · badge · input · textarea · label · select · dropdown-menu ·
dialog · sheet · popover · tooltip · tabs · table · pagination · breadcrumb ·
avatar · progress · separator · scroll-area · collapsible · sidebar · calendar ·
command · sonner (toast) · skeleton · skeletons · empty-state · input-group ·
image-crop-dialog.

Gráficos de BI: wrapper único `src/components/charts/echart.tsx` (ECharts, canvas,
registro modular) + `bar-list.tsx` (Tremor copy-in). Ver [[project-bi-charts-echarts-tremor]].

**Nunca** estilize um `<button>`/`<input>` cru — use o componente ui. Se precisar
de uma variante nova, estenda o `cva`/`buttonVariants` do componente, não crie um
paralelo.

## Padrões de composição (como o app já faz)

- **Card padrão:** `<Card className="border-0 shadow-sm">` com `CardHeader`/
  `CardTitle` (`text-sm font-semibold`) + `CardContent`. É o tijolo do dashboard.
- **Botões:** `buttonVariants({ variant, size })` com `cn(...)` — variantes
  default (clay) / outline / ghost / secondary / destructive. Link que parece
  botão: `<Link className={cn(buttonVariants({variant:"ghost",size:"sm"}), "...")}>`.
- **Estados vazios:** `EmptyState` (ícone + frase). Sempre renderize para listas
  que podem vir vazias.
- **Carregando:** `Skeleton`/`skeletons` + `.skeleton-shimmer`; em `next/dynamic`
  use `loading:` com skeleton do mesmo tamanho (evita layout shift).
- **Toast:** `sonner` para feedback transitório; erros de escrita NUNCA engolidos.
- **Server-first:** dados em Server Components/rotas; client components só para
  estado de UI. Form → POST → `router.refresh()`/navegação.
- **cn:** `@/lib/utils` (clsx + tailwind-merge) para compor classes.

## Mutação de coleções

Salvar coleção de filhos = UMA transação no servidor (payload único), não N fetch
do cliente (estoura rate-limit → 429, perde dados). Padrão: `lib/grade-formacoes.ts`.
Ver [[feedback-batch-mutations-server-side]].

## Ordem canônica da sidebar

Seções fixas para todo perfil: **Principal → Formativo → Gestão Comunitária →
Sistema**, impostas por `SECTION_RANK` em `nav-items.ts` (fonte única,
compartilhada com o CommandPalette). O breadcrumb do `AppTopbar` espelha. Ver
[[project-sidebar-ordem-canonica]].

## Gotchas que já morderam

- **Scroll horizontal da página:** `SidebarInset` do shadcn sem `min-w-0` →
  conteúdo largo (tabela, régua de abas) empurra a página inteira. Fix: `min-w-0`
  no `SidebarInset` do layout. Diagnóstico: `scrollWidth` vs `clientWidth`. Ver
  [[feedback-sidebar-inset-min-w-0]].
- **Banner de cookies cobrindo ações:** telas centralizadas (login/portal/token)
  reservam `--cookie-banner-h` via `padding-bottom` nas classes
  `.min-h-screen.items-center/.justify-center` (já em `globals.css`). Ver
  [[project-cookie-banner-overlap-mobile]].
- **CSP e nonce:** páginas públicas do portal usam CSP sem nonce (webview antiga
  bloqueia stylesheet com nonce). NÃO pôr nonce no `style-src` (quebra `style=""`
  do Radix no app). Ver [[project-portal-csp-nonce-webview]].
- **lucide v1.40** removeu ícones (IG/YT): confirme a existência antes de importar;
  senão SVG inline.
- **ECharts:** sempre canvas (não SVG) sob a CSP; `prefers-reduced-motion` desliga
  animação; cor de dado sempre com número/rótulo visível.
- **PDF:** visualizador em canvas (react-pdf), bytes same-origin `?stream=1`
  (302→R2 quebra CORS). Ver [[project-visualizador-pdf-canvas]].

## Branding por tenant vs marca Formattio

- Telas do CLIENTE (app): logo + cor da ORGANIZAÇÃO; Formattio só no rodapé
  ("powered by"). A cor de tema da org vem do dado (6 temas); não force clay.
- Landing, login, super-admin: identidade Formattio (clay). Nunca carregue
  branding de org nessas. Ver [[project-brand]], [[project-vitrine-branding-org]].

## Verificação visual — receita

Docker up → `npm run dev` → login 2 passos (e-mail→Continuar→senha→Entrar),
**dispensar banner de cookies primeiro** (intercepta clique). 1º hit do dev
recompila (>15s, repetir). Build com dev vivo dá EPERM no `.next` → parar dev +
remover `.next`. Scripts de screenshot: `frontend/scripts/.shot-*.mjs` (dot-prefix,
untracked). Detalhes e creds demo: [[project-bi-charts-echarts-tremor]].
