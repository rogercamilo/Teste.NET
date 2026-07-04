import { redirect } from "next/navigation";

// /portal é mantido como alias da entrada canônica do Portal do Formando
// (/portal/formando), preservando favoritos e links antigos que apontam para
// /portal (logout, sessão expirada, token inválido etc.).
export default function PortalPage() {
  redirect("/portal/formando");
}
