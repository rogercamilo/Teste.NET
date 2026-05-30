// Initializes Sentry in the browser. Required with Turbopack (Next.js 15+/16) because
// webpack-based auto-injection via withSentryConfig does not run during `next dev`.
import * as Sentry from "@sentry/nextjs";
import "../sentry.client.config";

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
