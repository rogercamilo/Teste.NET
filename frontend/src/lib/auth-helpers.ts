export type SessionUser = {
  id?: string;
  role?: string;
  organizacaoId?: string;
  moradaId?: string | null;
};

export function isAdmin(role?: string): boolean {
  return role === "administrador" || role === "formador_geral";
}

export { isAdminOrAbove } from "@/types";
