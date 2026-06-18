/**
 * Edge-compatible auth configuration (no Node.js APIs).
 * Imported by proxy.ts which runs on the Vercel/Next.js Edge Runtime.
 * Full provider config lives in auth.ts (Node.js only).
 */
import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

const isProd = process.env.NODE_ENV === "production";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 h
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: isProd,
        path: "/",
      },
    },
  },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;

// Edge-compatible auth instance used by proxy.ts middleware.
// Uses only JWT verification — no DB calls, no Node.js-only imports.
export const { auth } = NextAuth(authConfig);
