import * as Sentry from "@sentry/nextjs";

// Inicialização do Sentry no cliente, exportada como FUNÇÃO (não como efeito de
// import) para que o `instrumentation-client` possa adiá-la para FORA do caminho
// crítico de carregamento: o SDK é carregado sob demanda (após idle), aliviando
// o JS inicial — em especial nas páginas públicas de marketing (R2).
export function initSentryClient(): void {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    debug: false,
    beforeSend(event) {
      // Strip PII from request headers and bodies
      if (event.request) {
        if (event.request.headers) {
          delete event.request.headers["authorization"];
          delete event.request.headers["cookie"];
          delete event.request.headers["set-cookie"];
        }
        event.request.cookies = undefined;
        event.request.data = undefined;
      }
      // Strip user PII — keep only id
      if (event.user) {
        event.user = { id: event.user.id };
      }
      return event;
    },
  });
}
