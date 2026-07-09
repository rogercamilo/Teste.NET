import type { Metadata } from "next";
import { ContatoForm } from "./ContatoForm";

export const metadata: Metadata = {
  title: "Canal de Privacidade — Formattio",
  description: "Exerça seus direitos de titular de dados (LGPD) junto à Formattio.",
};

// Página interativa (client form) sob CSP com nonce/strict-dynamic: força render
// dinâmico para evitar tela branca em produção. Ver feedback-csp-nonce-static-page.
export const dynamic = "force-dynamic";

export default function PrivacidadeContatoPage() {
  return <ContatoForm />;
}
