import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  debug: false,
  beforeSend(event) {
    // Strip auth headers and PII — proxy/middleware handles auth cookies so this
    // runtime is especially sensitive. Mirrors the sanitisation in server/client configs.
    if (event.request) {
      if (event.request.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
        delete event.request.headers["set-cookie"];
      }
      event.request.cookies = undefined;
      event.request.data = undefined;
    }
    if (event.user) {
      event.user = { id: event.user.id };
    }
    return event;
  },
});
