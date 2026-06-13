import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // argon2 uses native addons — must not be bundled by webpack
  serverExternalPackages: ["argon2", "@react-pdf/renderer"],
};

// Only wrap with Sentry when org+project are configured (skips in CI without Sentry vars)
const sentryEnabled =
  typeof process.env.SENTRY_ORG === "string" &&
  process.env.SENTRY_ORG.length > 0 &&
  typeof process.env.SENTRY_PROJECT === "string" &&
  process.env.SENTRY_PROJECT.length > 0;

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      sourcemaps: { disable: process.env.NODE_ENV !== "production" },
    })
  : nextConfig;
