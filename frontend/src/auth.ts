import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Credenciais",
    credentials: {
      email: { label: "E-mail", type: "email" },
      password: { label: "Senha", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      // TODO: substituir por consulta ao banco de dados PostgreSQL
      // Exemplo:
      //   const user = await db.user.findUnique({ where: { email: credentials.email } })
      //   const valid = await bcrypt.compare(credentials.password as string, user.passwordHash)
      //   if (!valid) return null

      const mockUsers = [
        {
          id: "u1",
          name: "Ana Costa",
          email: "ana.costa@dombosco.org",
          role: "administrador",
          moradaId: undefined,
        },
        {
          id: "u2",
          name: "Carlos Mendes",
          email: "carlos.mendes@dombosco.org",
          role: "formador_comunitario",
          moradaId: "m1",
        },
        {
          id: "u3",
          name: "Maria Silva",
          email: "maria.silva@dombosco.org",
          role: "formador_comunitario",
          moradaId: "m2",
        },
      ];

      const user = mockUsers.find((u) => u.email === credentials.email);
      if (!user) return null;

      // Em produção: verificar hash bcrypt da senha
      if (credentials.password !== "senha123") return null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        moradaId: user.moradaId,
      };
    },
  }),
];

// Incluir Google OAuth apenas se as credenciais estiverem configuradas
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
  providers,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "formador_comunitario";
        token.moradaId = (user as { moradaId?: string }).moradaId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { moradaId?: string | null }).moradaId =
          token.moradaId as string | null;
      }
      return session;
    },
  },
});
