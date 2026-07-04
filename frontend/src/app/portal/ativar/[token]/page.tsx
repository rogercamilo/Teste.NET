import Link from "next/link";
import { peekAccessToken } from "@/lib/portal-formando-auth";
import { getPublicBranding } from "@/lib/public-branding";
import PortalSenhaForm from "../../PortalSenhaForm";

export const metadata = {
  title: "Primeiro acesso — Portal do Formando",
};

export default async function AtivarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // peek antes do branding: o token resolve a org do formando (branding correto do tenant).
  // Token inválido → peek null → branding cai no DEFAULT_ORG_ID.
  const peek = await peekAccessToken(token, "ativacao");
  const branding = await getPublicBranding(peek?.organizacaoId);

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

  const communityName = branding.nomePlataforma ?? branding.nome;
  const primeiroNome = peek.nome.split(" ")[0];

  return (
    <PortalSenhaForm
      endpoint={`/api/portal/ativar/${token}`}
      branding={branding}
      titulo={`Olá, ${primeiroNome}!`}
      subtitulo={`Crie uma senha para acessar o ${communityName}.`}
      submitLabel="Criar senha e entrar"
      email={peek.email}
      infoLinha={peek.grupoNome ? `Grupo: ${peek.grupoNome}` : undefined}
    />
  );
}
