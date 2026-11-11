import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { FileBarChart } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { CatalogoCard } from "@/components/relatorios/CatalogoCard";
import { relatoriosDoPerfil } from "@/lib/relatorios/catalogo";
import type { SessionUser } from "@/lib/auth-helpers";
import type { PerfilUsuario } from "@/types";

const PERFIS_RELATORIOS: PerfilUsuario[] = ["formador_comunitario", "formador_geral", "fundador", "administrador"];

export default async function RelatoriosPage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.organizacaoId) redirect("/login");

  const perfil = (user.role ?? "formador_comunitario") as PerfilUsuario;
  // Formador Pedagógico (autor de conteúdo) e Super Admin não têm acompanhamento.
  if (!PERFIS_RELATORIOS.includes(perfil)) redirect("/dashboard");

  const relatorios = relatoriosDoPerfil(perfil);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-title text-foreground">Relatórios</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Documentos de acompanhamento para consultar na tela e exportar em PDF ou CSV.
        </p>
      </div>

      {relatorios.length === 0 ? (
        <EmptyState icon={FileBarChart} title="Nenhum relatório disponível" description="Seu perfil ainda não tem relatórios de acompanhamento." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {relatorios.map((def) => (
            <CatalogoCard key={def.slug} def={def} />
          ))}
        </div>
      )}
    </div>
  );
}
