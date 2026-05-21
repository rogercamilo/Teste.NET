import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { ThemeApplier } from "@/components/layout/ThemeApplier";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import PrimeiroAcessoModal from "@/components/PrimeiroAcessoModal";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sessionUser = session.user as {
    name?: string | null;
    email?: string | null;
    id?: string;
    role?: string;
    organizacaoId?: string;
    moradaId?: string | null;
    primeiroAcesso?: boolean;
  };

  if (sessionUser.organizacaoId && sessionUser.role !== "super_admin") {
    const org = await prisma.organizacao.findUnique({
      where: { id: sessionUser.organizacaoId },
      select: { onboardingConcluido: true },
    });
    if (org && !org.onboardingConcluido) redirect("/onboarding");
  }

  const user = {
    name: sessionUser.name ?? "Usuário",
    email: sessionUser.email ?? "",
    role: sessionUser.role ?? "formador_comunitario",
    moradaId: sessionUser.moradaId ?? null,
  };

  const primeiroAcesso = sessionUser.primeiroAcesso ?? false;

  return (
    <SidebarProvider>
      <ThemeApplier />
      <PrimeiroAcessoModal primeiroAcesso={primeiroAcesso} />
      <AppSidebar user={user} />
      <SidebarInset>
        <AppTopbar />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
        <footer className="shrink-0 border-t border-border/60 bg-card/50 px-4 md:px-6 py-2.5">
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} Formatio —{" "}
            <span className="font-medium text-foreground/70">
              Comunidade Missionária Dom Bosco
            </span>
            . Todos os direitos reservados.
          </p>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
