import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getOrgBranding } from "@/lib/org-cache";
import { getUserName } from "@/lib/current-user";
import { isGestao, type ComunidadeConfig, type TipoOrganizacao } from "@/types";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageTransition } from "@/components/layout/PageTransition";
import { ComunidadeProvider } from "@/components/layout/ComunidadeProvider";
import { ThemeApplier } from "@/components/layout/ThemeApplier";
import { getThemeInlineCss } from "@/lib/themes";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import PrimeiroAcessoModal from "@/components/PrimeiroAcessoModal";
import CookiePreferencesLink from "@/components/CookiePreferencesLink";
import QuotaWarningBanner from "@/components/QuotaWarningBanner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sessionUser = session.user as {
    name?: string | null;
    email?: string | null;
    id?: string;
    role?: string;
    organizacaoId?: string;
    grupoFormacaoId?: string | null;
    primeiroAcesso?: boolean;
  };

  let orgBranding = { onboardingConcluido: true, temaCor: null as string | null, nomePlataforma: null as string | null, nome: "" };
  let comunidadeInitial: ComunidadeConfig | undefined;

  if (sessionUser.organizacaoId && sessionUser.role !== "super_admin") {
    const org = await getOrgBranding(sessionUser.organizacaoId);
    if (org) {
      orgBranding = { ...orgBranding, ...org };
      if (!org.onboardingConcluido && isGestao(sessionUser.role)) redirect("/onboarding");
      comunidadeInitial = {
        tipoOrganizacao: org.tipoOrganizacao as TipoOrganizacao,
        nome: org.nome,
        descricao: org.descricao ?? "",
        endereco: org.endereco ?? "",
        missao: org.missao ?? "",
        anoFundacao: org.anoFundacao ?? "",
        logoUrl: org.logoUrl ?? undefined,
        termoGrupoFormacao: org.termoGrupoFormacao ?? undefined,
        termoFormando: org.termoFormando ?? undefined,
        termoFormador: org.termoFormador ?? undefined,
        termoPreDiscipulado: org.termoPreDiscipulado ?? undefined,
        termoDiscipulado: org.termoDiscipulado ?? undefined,
        termoPrimeirasPromessas: org.termoPrimeirasPromessas ?? undefined,
        termoFormacaoPermanente: org.termoFormacaoPermanente ?? undefined,
        vocacionalHabilitado: org.vocacionalHabilitado ?? false,
        termoVocacional: org.termoVocacional ?? undefined,
        termoAcompanhamentoVocacional: org.termoAcompanhamentoVocacional ?? undefined,
        vocacionalDuracaoPadraoMeses: org.vocacionalDuracaoPadraoMeses ?? undefined,
        nomePlataforma: org.nomePlataforma ?? undefined,
        temaCor: org.temaCor ?? undefined,
      };
    }
  }

  const user = {
    // Nome do banco (fonte da verdade) — o JWT não reflete edições de perfil.
    name: (await getUserName(sessionUser.id)) ?? sessionUser.name ?? "Usuário",
    email: sessionUser.email ?? "",
    role: sessionUser.role ?? "formador_comunitario",
    grupoFormacaoId: sessionUser.grupoFormacaoId ?? null,
  };

  const primeiroAcesso = sessionUser.primeiroAcesso ?? false;

  const themeCss = getThemeInlineCss(orgBranding.temaCor);

  return (
    <SidebarProvider>
      <ComunidadeProvider initialData={comunidadeInitial}>
        {themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
        <ThemeApplier themeKey={orgBranding.temaCor} />
        <PrimeiroAcessoModal primeiroAcesso={primeiroAcesso} />
        <AppSidebar user={user} nomePlataforma={orgBranding.nomePlataforma} />
        <SidebarInset>
          <AppTopbar role={user.role} grupoFormacaoId={user.grupoFormacaoId} />
          <QuotaWarningBanner role={user.role} />
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <PageTransition>{children}</PageTransition>
          </main>
          <footer className="shrink-0 border-t border-border/60 bg-card/50 px-4 md:px-6 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 text-xs text-muted-foreground">
              <p>
                {sessionUser.role !== "super_admin" && (orgBranding.nomePlataforma || orgBranding.nome)
                  ? <>{orgBranding.nomePlataforma || orgBranding.nome} · <span className="opacity-60">powered by Formattio</span></>
                  : <>© {new Date().getFullYear()} Formattio</>
                }
                {" "}— Todos os direitos reservados.
              </p>
              <span className="hidden sm:inline opacity-40">·</span>
              <div className="flex gap-3">
                <a href="/privacidade" target="_blank" className="hover:text-foreground transition-colors">Privacidade</a>
                <a href="/termos" target="_blank" className="hover:text-foreground transition-colors">Termos</a>
                <CookiePreferencesLink />
              </div>
            </div>
          </footer>
        </SidebarInset>
      </ComunidadeProvider>
    </SidebarProvider>
  );
}
