import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  debug: false,
  beforeSend(event) {
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
