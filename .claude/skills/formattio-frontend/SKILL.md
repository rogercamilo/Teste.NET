---
name: formattio-frontend
description: >-
  Governança completa de frontend/UI/UX do app Formattio (Next.js 16, Tailwind 4,
  shadcn, Geist, marca clay #B25433) — design system, hierarquia visual,
  posicionamento/layout, compreensão, jornada do usuário, acessibilidade e
  inclusão digital. Use SEMPRE que for criar ou editar QUALQUER interface:
  página, componente, tela nova, redesenho, dashboard, gráfico, formulário,
  card, modal, layout, estilo, cor, tipografia, espaçamento ou "deixar bonito" —
  mesmo que o usuário não diga a palavra "design". Garante que o resultado seja
  on-brand, acessível ao público (católico, letramento digital intermediário) e
  consistente com os tokens reais em vez de hex/estilos avulsos.
---

# Frontend Formattio — UI/UX e Design System

Você está construindo a interface de uma plataforma que gerencia a jornada
formativa de comunidades católicas. O público (formadores, coordenadores, e no
portal os próprios formandos) tem **letramento digital intermediário** e muitas
vezes dificuldade de leitura. Por isso a barra não é só "ficar bonito": é
**compreensão fácil + ação explícita + confiança institucional**. Beleza serve à
clareza, nunca o contrário.

## Antes de escrever qualquer UI

1. **Leia a spec viva:** `frontend/formattio.design.md` (tokens, regras de uso,
   do's/don'ts) e, para valores OKLCH, `src/app/globals.css` (fonte da verdade).
2. **Tokens, não valores avulsos.** Use utilitários (`bg-primary`,
   `text-muted-foreground`, `border-border`, `shadow-sm`, `text-title`) — nunca
   hex cru nem sombra/raio mágicos. Se faltar um token, proponha adicioná-lo em
   `globals.css` (aditivo), não gambiarra local.
3. **Reaproveite componentes.** Base em `src/components/ui/` (shadcn). Padrões de
   composição, variantes e gotchas: veja `references/patterns.md`.

## A disciplina de marca: uma voltagem, reservada

O clay `#B25433` (Conceito H · Travessia) é a **única voltagem**. Reserve-o para
**ação** (botão primário), **estado ativo** (nav/aba selecionada), **foco** (ring)
e momentos de marca. O canvas warm-white e os neutros lideram. Clay como fundo de
seção inteira vira "genérico-startup" — evite. (Mesma disciplina da ClickUp de
"uma voltagem"; a nossa é clay sólido, não gradiente neon — **não** copie a
estética da ClickUp: roxo, gradiente-marca, Plus Jakarta, pílula grafite.)

Tom visual: sério, acolhedor, profissional sem ser frio; institucional mas
humano. Evite infantil, sacro/devocional explícito, gótico.

## As 5 competências — checklist por tela

Aplique como checklist, não como ensaio. Em cada tela/componente, verifique:

**1. Hierarquia e qualidade visual**
- Um foco claro por tela; o olho sabe onde olhar primeiro.
- Títulos com o ramp (`text-title` em h1 de página, `text-heading` em seções);
  corpo ≥14px. Peso cria hierarquia antes da cor.
- Elevação coerente: card = `border-0 shadow-sm`; interativo sobe no hover.

**2. Posicionamento e layout**
- Ritmo de espaçamento consistente (escala Tailwind; seções respiram 20/24/40).
- Alinhamento em grade; nada "solto". Em grids estreitos use `min-w-0` para não
  estourar (gotcha recorrente — ver `references/patterns.md`).
- Alvos de toque amplos (público mobile pouco letrado); ação explícita (texto no
  botão, não só ícone).

**3. Compreensão**
- Uma ideia por tela; divulgação progressiva (não despeje tudo de uma vez).
- Rótulos claros em PT-BR, linguagem do domínio (formando, morada, etapa…).
- Números e unidades legíveis; evite jargão técnico na UI do usuário final.

**4. Jornada e estados**
- Trate SEMPRE os quatro estados: **carregando** (skeleton), **vazio**
  (`EmptyState`), **erro** (mensagem clara, não engolir), **sucesso**.
- Deixe o próximo passo óbvio; reduza o nº de passos até a ação.
- Navegação previsível (ordem canônica da sidebar — ver `references/patterns.md`).

**5. Acessibilidade e inclusão digital** (o diferencial do nosso público)
- **COR NUNCA SOZINHA:** toda sinalização por cor leva ícone + palavra
  (verde+✓+"Concluído", vermelho+✕+"Erro"). Daltonismo + dificuldade de leitura.
- Contraste WCAG AA mínimo em todos os estados (light e dark).
- Respeite `prefers-reduced-motion` (anime só transform/opacity; ver utilitários
  em `globals.css`). Teclado e foco visíveis.
- Texto maior e com respiro onde há leitura; não aperte.

## Restrições técnicas (quebram em produção se ignoradas)

- **CSP:** app sob `script-src nonce+strict-dynamic`, `style-src 'unsafe-inline'`.
  `style=""` inline é OK (Radix usa). Gráficos ECharts = **canvas** (o wrapper
  força); SVG injetaria `<style>` e violaria. Ver [[project-bi-charts-echarts-tremor]].
- **Tailwind 4** via `@theme inline` no `globals.css` (sem `tailwind.config`).
  Tokens novos entram lá.
- **Lint de TS/TSX desligado** (TS 7 porta nativa) → o portão é `npx tsc --noEmit`
  + build. Rode antes de dar como pronto.
- **Ícones lucide-react v1.40:** alguns ícones foram removidos (ex.: Instagram/
  YouTube). Confirme que o ícone existe antes de importar; se não, SVG inline.

## Ritual de verificação (OBRIGATÓRIO para tela nova/redesenhada)

Tela nova ou redesenhada **não está pronta sem SCREENSHOT olhado**. tsc/lint/unit
não pegam problema visual. Suba o app, tire o screenshot e OLHE: overflow em grid
estreito, contraste, honra ao design system, estados. Receita de login 2 passos +
dispensar cookies + creds demo: ver [[project-bi-charts-echarts-tremor]]. Mudou o
FLUXO de uma tela coberta por E2E? Rode Playwright local antes do push.

## Do's & Don'ts (resumo — completo em formattio.design.md)

- **Do** reservar o clay para ação/estado; deixar o neutro liderar.
- **Do** parear cor com ícone+palavra; tratar os 4 estados; usar tokens.
- **Don't** copiar a estética ClickUp; usar clay como fundo de seção; sinalizar só
  por cor; reverter às decisões provisórias do briefing (azul, "Fo", slate-950).

## Referências

- `references/patterns.md` — inventário de componentes, padrões de composição,
  gotchas de código, ordem canônica da sidebar.
- `frontend/formattio.design.md` — spec de tokens + regras + personalidade.
- `src/app/globals.css` — valores OKLCH canônicos (light + dark).
