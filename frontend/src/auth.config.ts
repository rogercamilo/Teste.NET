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
    // Session callback edge-compatible: mapeia os campos custom do JWT para session.user
    // sem chamar o DB — necessário para que o proxy (middleware) leia req.auth?.user?.role.
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { organizacaoId?: string | null }).organizacaoId =
          token.organizacaoId as string | null;
        (session.user as { grupoFormacaoId?: string | null }).grupoFormacaoId =
          token.grupoFormacaoId as string | null;
        (session.user as { primeiroAcesso?: boolean }).primeiroAcesso =
          token.primeiroAcesso as boolean;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

// Edge-compatible auth instance used by proxy.ts middleware.
// Uses only JWT verification — no DB calls, no Node.js-only imports.
export const { auth } = NextAuth(authConfig);
