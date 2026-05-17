/**
 * Edge-compatible auth configuration (no Node.js APIs).
 * Imported by middleware.ts which runs on the Vercel/Next.js Edge Runtime.
 * Full provider config lives in auth.ts (Node.js only).
 */
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 h
  },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
