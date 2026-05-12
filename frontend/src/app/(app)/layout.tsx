import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";
import { ThemeApplier } from "@/components/layout/ThemeApplier";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sessionUser = session.user as {
    name?: string | null;
    email?: string | null;
    role?: string;
    moradaId?: string | null;
  };

  const user = {
    name: sessionUser.name ?? "Usuário",
    email: sessionUser.email ?? "",
    role: sessionUser.role ?? "formador_comunitario",
    moradaId: sessionUser.moradaId ?? null,
  };

  return (
    <SidebarProvider>
      <ThemeApplier />
      <AppSidebar user={user} />
      <SidebarInset>
        <AppTopbar />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
        <footer className="shrink-0 border-t border-border/60 bg-card/50 px-4 md:px-6 py-2.5">
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} Aplicativo para Formação Comunitária —{" "}
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
