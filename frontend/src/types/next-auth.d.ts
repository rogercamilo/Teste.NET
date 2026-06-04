import type { PerfilUsuario } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: PerfilUsuario;
      grupoFormacaoId: string | null;
      organizacaoId: string | null;
      primeiroAcesso: boolean;
    };
  }
}
