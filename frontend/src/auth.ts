import NextAuth, { CredentialsSignin } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import { authenticateGlobal, findByEmailGlobal, findById } from "@/lib/users-store";
import { authConfig } from "@/auth.config";
import { limiters } from "@/lib/rate-limit";
import { getClientIp, logAction } from "@/lib/audit-log";
import { verifyTotpToken } from "@/lib/totp";

class MFARequiredError extends CredentialsSignin {
  code = "MFARequired";
}

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Credenciais",
    credentials: {
      email: { label: "E-mail", type: "email" },
      password: { label: "Senha", type: "password" },
      totp: { label: "Código MFA", type: "text" },
      loginSource: { label: "Fonte", type: "text" },
    },
    async authorize(credentials, request) {
      if (!credentials?.email || !credentials?.password) return null;

      const ip = request ? getClientIp(request as Request) : "unknown";
      const rl = await limiters.login(ip);
      if (!rl.allowed) return null;

      const user = await authenticateGlobal(
        credentials.email as string,
        credentials.password as string
      );
      if (!user) {
        logAction("login_failure", undefined, ip, { email: credentials.email as string });
        return null;
      }

      // super_admin só pode acessar pela página exclusiva de acesso à plataforma
      const isSuperAdminSource = credentials.loginSource === "super_admin";
      if (user.perfil === "super_admin" && !isSuperAdminSource) {
        logAction("login_failure", user.id, ip, { reason: "source_mismatch" }, user.organizacaoId);
        return null;
      }
      if (user.perfil !== "super_admin" && isSuperAdminSource) {
        logAction("login_failure", user.id, ip, { reason: "source_mismatch" }, user.organizacaoId);
        return null;
      }

      if (user.mfaEnabled === true) {
        const totpCode = credentials.totp as string | undefined;
        if (!totpCode) throw new MFARequiredError();
        if (!user.mfaSecret || !await verifyTotpToken(totpCode, user.mfaSecret)) {
          logAction("login_failure", user.id, ip, { reason: "invalid_mfa" }, user.organizacaoId);
          return null;
        }
      }

      return {
        id: user.id,
        name: user.nome,
        email: user.email,
        role: user.perfil,
        grupoFormacaoId: user.grupoFormacaoId ?? null,
        organizacaoId: user.organizacaoId,
        primeiroAcesso: user.primeiroAcesso ?? false,
        passwordChangedAt: user.passwordChangedAt?.getTime() ?? null,
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
  // Em desenvolvimento sempre confia no host. Em produção, confia apenas se AUTH_TRUST_HOST
  // estiver definida (necessário quando o app roda atrás de um proxy reverso, como Railway).
  trustHost: process.env.NODE_ENV !== "production" || !!process.env.AUTH_TRUST_HOST,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "google") {
          if (!user.email) {
            throw new Error("Google OAuth não retornou e-mail.");
          }
          const dbUser = await findByEmailGlobal(user.email);
          if (dbUser) {
            if (dbUser.perfil === "super_admin") {
              throw new Error("Acesso não autorizado via OAuth.");
            }
            token.id = dbUser.id;
            token.role = dbUser.perfil;
            token.grupoFormacaoId = dbUser.grupoFormacaoId ?? null;
            token.organizacaoId = dbUser.organizacaoId;
            token.primeiroAcesso = dbUser.primeiroAcesso ?? false;
            token.passwordChangedAt = dbUser.passwordChangedAt?.getTime() ?? null;
          } else {
            // Google user sem registo na BD → acesso negado
            throw new Error("Utilizador não autorizado. Solicite um convite para aceder à plataforma.");
          }
        } else {
          token.id = user.id;
          token.role = (user as { role?: string }).role ?? "formador_comunitario";
          token.grupoFormacaoId = (user as { grupoFormacaoId?: string | null }).grupoFormacaoId ?? null;
          token.organizacaoId = (user as { organizacaoId?: string }).organizacaoId ?? null;
          token.primeiroAcesso =
            (user as { primeiroAcesso?: boolean }).primeiroAcesso ?? false;
          token.passwordChangedAt =
            (user as { passwordChangedAt?: number | null }).passwordChangedAt ?? null;
        }
      } else if (token.id) {
        // Periodically re-validate the token against the DB (throttled to 30s intervals).
        // Checks: primeiroAcesso flag, and whether the password was changed after token issuance.
        const now = Date.now();
        const lastCheck = (token._lastDbCheck as number | undefined) ?? 0;
        if (now - lastCheck > 30_000) {
          const dbUser = await findById(token.id as string, token.organizacaoId as string | undefined);
          if (!dbUser) return null; // User deleted — invalidate session

          // Invalidate if password was changed after this token was issued
          const tokenIssuedAt = (token.iat as number) * 1000;
          if (dbUser.passwordChangedAt && dbUser.passwordChangedAt.getTime() > tokenIssuedAt) {
            return null;
          }

          token.primeiroAcesso = dbUser.primeiroAcesso ?? false;
          token.grupoFormacaoId = dbUser.grupoFormacaoId ?? null;
          token.role = dbUser.perfil;
          token.organizacaoId = dbUser.organizacaoId;
          token._lastDbCheck = now;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { grupoFormacaoId?: string | null }).grupoFormacaoId =
          token.grupoFormacaoId as string | null;
        (session.user as { organizacaoId?: string | null }).organizacaoId =
          token.organizacaoId as string | null;
        (session.user as { primeiroAcesso?: boolean }).primeiroAcesso =
          token.primeiroAcesso as boolean;
      }
      return session;
    },
  },
});
