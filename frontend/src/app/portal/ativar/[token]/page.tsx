import Link from "next/link";
import { peekAccessToken } from "@/lib/portal-formando-auth";
import { getPublicBranding } from "@/lib/public-branding";
import AtivarClient from "./AtivarClient";

export const metadata = {
  title: "Primeiro acesso — Portal do Formando",
};

export default async function AtivarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [peek, branding] = await Promise.all([
    peekAccessToken(token, "ativacao"),
    getPublicBranding(),
  ]);

  if (!peek) {
    const communityName = branding.nomePlataforma ?? branding.nome;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-lg font-semibold text-foreground">Link inválido ou expirado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este link de primeiro acesso não é mais válido. Peça ao seu formador para reenviar o
            acesso ao portal.
          </p>
          <Link href="/portal" className="mt-4 inline-block text-sm text-primary hover:underline">
            Ir para o login
          </Link>
          <p className="mt-8 text-xs text-muted-foreground">
            © {new Date().getFullYear()} {communityName}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AtivarClient
      token={token}
      nome={peek.nome}
      email={peek.email}
      grupoNome={peek.grupoNome}
      branding={branding}
    />
  );
}
