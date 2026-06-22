import NextAuth, { CredentialsSignin } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import { authenticateGlobal, findByEmailGlobal, findById, recordLoginFailure, clearLoginFailures } from "@/lib/users-store";
import { authConfig } from "@/auth.config";
import { limiters } from "@/lib/rate-limit";
import { getClientIp, logAction } from "@/lib/audit-log";
import { verifyTotpToken } from "@/lib/totp";

class MFARequiredError extends CredentialsSignin {
  code = "MFARequired";
}

// Sinaliza ao cliente que o acesso foi barrado por rate-limit (IP/e-mail) ou bloqueio
// temporário da conta — distinto de credenciais inválidas, para a UI dar a orientação certa
// ("aguarde alguns minutos" em vez de "senha incorreta"). Não revela se a conta existe.
class TooManyAttemptsError extends CredentialsSignin {
  code = "TooManyAttempts";
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
      const email = (credentials.email as string).toLowerCase().trim();

      // Só aplica o limite por IP quando o IP é conhecido. Atrás de um proxy mal configurado
      // (sem x-real-ip / TRUST_PROXY) getClientIp devolve "unknown" para todos — aplicar o
      // limite nesse caso colapsaria a plataforma inteira num único balde de 50/15min.
      if (ip !== "unknown") {
        const rlIp = await limiters.login(ip);
        if (!rlIp.allowed) {
          logAction("login_blocked", undefined, ip, { email, reason: "ip_rate_limit" });
          throw new TooManyAttemptsError();
        }
      }

      const rlEmail = await limiters.loginPerEmail(email);
      if (!rlEmail.allowed) {
        logAction("login_blocked", undefined, ip, { email, reason: "email_rate_limit" });
        throw new TooManyAttemptsError();
      }

      // Check account lockout before the expensive password verification
      const candidate = await findByEmailGlobal(email);
      if (candidate?.lockedUntil && candidate.lockedUntil > new Date()) {
        logAction("login_blocked", candidate.id, ip, { email, reason: "account_locked" }, candidate.organizacaoId);
        throw new TooManyAttemptsError();
      }

      const user = await authenticateGlobal(email, credentials.password as string);
      if (!user) {
        if (candidate?.id) await recordLoginFailure(candidate.id);
        logAction("login_failure", candidate?.id, ip, { email }, candidate?.organizacaoId);
        return null;
      }

      await clearLoginFailures(user.id);

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
          await recordLoginFailure(user.id);
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
    async jwt({ token, user, account, trigger }) {
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
      } else if (trigger === "update" && token.id) {
        // Atualização explícita da sessão (useSession().update()), disparada logo após o
        // próprio usuário alterar a senha (modal de primeiro acesso ou Configurações).
        // Re-sincroniza o token com a BD — incluindo passwordChangedAt — para que a sessão
        // que efetuou a troca NÃO seja invalidada pela verificação periódica abaixo.
        const dbUser = await findById(token.id as string, token.organizacaoId as string | undefined);
        if (!dbUser || !dbUser.ativo) return null;
        token.primeiroAcesso = dbUser.primeiroAcesso ?? false;
        token.grupoFormacaoId = dbUser.grupoFormacaoId ?? null;
        token.role = dbUser.perfil;
        token.organizacaoId = dbUser.organizacaoId;
        token.passwordChangedAt = dbUser.passwordChangedAt?.getTime() ?? null;
        token._lastDbCheck = Date.now();
      } else if (token.id) {
        // Periodically re-validate the token against the DB (throttled to 30s intervals).
        // Checks: primeiroAcesso flag, and whether the password was changed after token issuance.
        const now = Date.now();
        const lastCheck = (token._lastDbCheck as number | undefined) ?? 0;
        if (now - lastCheck > 30_000) {
          const dbUser = await findById(token.id as string, token.organizacaoId as string | undefined);
          if (!dbUser || !dbUser.ativo) return null; // User deleted or deactivated — invalidate session

          // Invalida apenas se a senha foi alterada por OUTRA sessão depois de este token ter
          // sido emitido/sincronizado. Usa o passwordChangedAt guardado no token como linha de
          // base (atualizado no login e no trigger "update"); cai para token.iat em tokens
          // antigos que ainda não possuíam o campo, preservando o comportamento anterior.
          const baseline =
            (token.passwordChangedAt as number | null | undefined) ?? (token.iat as number) * 1000;
          if (dbUser.passwordChangedAt && dbUser.passwordChangedAt.getTime() > baseline) {
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
