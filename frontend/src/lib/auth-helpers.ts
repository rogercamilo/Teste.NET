export type SessionUser = {
  id?: string;
  name?: string | null;
  email?: string;
  role?: string;
  organizacaoId?: string;
  grupoFormacaoId?: string | null;
  primeiroAcesso?: boolean;
};

export { isAdmin, isAdminOrAbove } from "@/types";
