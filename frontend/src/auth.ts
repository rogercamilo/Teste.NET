import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import { authenticate, findByEmail, findById } from "@/lib/users-store";
import { authConfig } from "@/auth.config";

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Credenciais",
    credentials: {
      email: { label: "E-mail", type: "email" },
      password: { label: "Senha", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      const user = authenticate(
        credentials.email as string,
        credentials.password as string
      );
      if (!user) return null;

      return {
        id: user.id,
        name: user.nome,
        email: user.email,
        role: user.perfil,
        moradaId: user.moradaId ?? null,
        primeiroAcesso: user.primeiroAcesso ?? false,
      };
    },
  }),
];

if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_ID !== "cole_aqui_o_client_id" &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CLIENT_SECRET !== "cole_aqui_o_client_secret"
) {
  providers.unshift(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "google") {
          const dbUser = findByEmail(user.email!);
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.perfil;
            token.moradaId = dbUser.moradaId ?? null;
            token.primeiroAcesso = dbUser.primeiroAcesso ?? false;
          } else {
            token.id = user.id ?? `g_${Date.now()}`;
            token.role = "formador_comunitario";
            token.moradaId = null;
            token.primeiroAcesso = false;
          }
        } else {
          token.id = user.id;
          token.role = (user as { role?: string }).role ?? "formador_comunitario";
          token.moradaId = (user as { moradaId?: string | null }).moradaId ?? null;
          token.primeiroAcesso =
            (user as { primeiroAcesso?: boolean }).primeiroAcesso ?? false;
        }
      } else if (token.id) {
        const dbUser = findById(token.id as string);
        if (dbUser) token.primeiroAcesso = dbUser.primeiroAcesso ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { moradaId?: string | null }).moradaId =
          token.moradaId as string | null;
        (session.user as { primeiroAcesso?: boolean }).primeiroAcesso =
          token.primeiroAcesso as boolean;
      }
      return session;
    },
  },
});
