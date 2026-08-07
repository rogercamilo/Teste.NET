// Inicializa o Sentry no browser. Necessário com Turbopack (Next.js 15+/16): a
// auto-injeção via withSentryConfig não roda no `next dev`.
//
// R2 (dieta de JS): o SDK do Sentry é o maior lib removível do caminho crítico
// das páginas de marketing. Em vez de inicializar no boot, carregamos o chunk
// SOB DEMANDA (após idle) — o JS inicial não paga o custo do Sentry. Erros nos
// ~2 s iniciais não são capturados (trade-off aceitável para páginas públicas).
import type * as SentryNext from "@sentry/nextjs";

let sentryReady: Promise<typeof SentryNext> | null = null;

function loadSentry(): Promise<typeof SentryNext> {
  return (sentryReady ??= Promise.all([
    import("@sentry/nextjs"),
    import("../sentry.client.config"),
  ]).then(([S, cfg]) => {
    cfg.initSentryClient();
    return S;
  }));
}

if (typeof window !== "undefined") {
  const schedule: (cb: () => void) => void =
    typeof window.requestIdleCallback === "function"
      ? (cb) => window.requestIdleCallback(cb)
      : (cb) => window.setTimeout(cb, 2000);
  schedule(() => {
    void loadSentry();
  });
}

// Contrato do Next: captura o início das transições de rota. Enfileira até o
// SDK carregar (garante o load do Sentry mesmo se a navegação ocorrer antes do idle).
export function onRouterTransitionStart(
  ...args: Parameters<typeof SentryNext.captureRouterTransitionStart>
): void {
  void loadSentry().then((S) => S.captureRouterTransitionStart(...args));
}
