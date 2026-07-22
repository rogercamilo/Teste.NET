import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { NEUTRAL_BRANDING } from "@/lib/public-branding";

// Login em 2 passos: o 1º paint é NEUTRO (marca da plataforma) — superfície anônima
// não resolve o tenant. A identidade da organização entra no passo da senha, depois
// que o usuário informa o e-mail (LoginForm busca em /api/public/branding/by-email).
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginForm branding={NEUTRAL_BRANDING} />
    </Suspense>
  );
}
