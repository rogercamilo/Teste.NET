import Link from "next/link";
import { peekAccessToken } from "@/lib/portal-formando-auth";
import { getPublicBranding } from "@/lib/public-branding";
import PortalSenhaForm from "../../PortalSenhaForm";
import PortalThemeStyle from "../../PortalThemeStyle";

export const metadata = {
  title: "Redefinir senha — Portal do Formando",
};

export default async function RecuperarTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // peek antes do branding: o token resolve a org do formando (branding correto do tenant).
  // Token inválido → peek null → branding cai no DEFAULT_ORG_ID.
  const peek = await peekAccessToken(token, "reset");
  const branding = await getPublicBranding(peek?.organizacaoId);

  if (!peek) {
    const communityName = branding.nomePlataforma ?? branding.nome;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-lg font-semibold text-foreground">Link inválido ou expirado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este link de redefinição não é mais válido. Solicite um novo abaixo.
          </p>
          <Link href="/portal/recuperar" className="mt-4 inline-block text-sm text-primary hover:underline">
            Solicitar novo link
          </Link>
          <p className="mt-8 text-xs text-muted-foreground">
            © {new Date().getFullYear()} {communityName}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PortalThemeStyle temaCor={branding.temaCor} />
      <PortalSenhaForm
        endpoint={`/api/portal/recuperar/${token}`}
        branding={branding}
        titulo="Redefinir senha"
        subtitulo="Crie uma nova senha para acessar seu portal."
        submitLabel="Salvar nova senha e entrar"
        email={peek.email}
      />
    </>
  );
}
