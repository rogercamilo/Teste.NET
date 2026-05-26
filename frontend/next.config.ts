import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  // Prevents embedding in iframes (clickjacking protection)
  { key: "X-Frame-Options", value: "DENY" },
  // Prevents MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Stops sending Referer to cross-origin requests
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Enforces HTTPS for 1 year (including subdomains)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Disables browser features not used by this app
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js requires 'unsafe-inline' for styles; nonce-based CSP would be ideal but requires more setup
      "style-src 'self' 'unsafe-inline'",
      // Next.js chunks + Stripe.js
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
      // Images: self + data URIs (avatars) + Stripe-hosted images
      "img-src 'self' data: blob: https://*.stripe.com",
      // Stripe checkout iframes
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      // API calls: self + Stripe
      "connect-src 'self' https://api.stripe.com",
      // Fonts: self only
      "font-src 'self'",
      // Block object embeds
      "object-src 'none'",
      // Base URI: self only
      "base-uri 'self'",
      // Form submissions to self only
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // argon2 uses native addons — must not be bundled by webpack
  serverExternalPackages: ["argon2"],
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
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
      disableLogger: true,
      automaticVercelMonitors: false,
    })
  : nextConfig;
