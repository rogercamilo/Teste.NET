export type SessionUser = {
  id?: string;
  name?: string | null;
  email?: string;
  role?: string;
  organizacaoId?: string;
  grupoFormacaoId?: string | null;
};

export { isAdmin, isAdminOrAbove } from "@/types";
