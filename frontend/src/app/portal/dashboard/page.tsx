import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import {
  getPortalDashboardData,
  getPortalMateriais,
  getPortalTravessia,
  getPortalAniversariantes,
  getPortalNotificacoes,
} from "@/lib/portal-data";
import { getPublicBranding } from "@/lib/public-branding";
import { portalHomeFor } from "@/lib/portal-routes";
import DashboardClient from "./DashboardClient";

export const metadata = {
  title: "Meu Acompanhamento",
};

export default async function PortalDashboardPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/formando");

  const [data, materiais, travessia, aniversariantes, branding, notificacoes] = await Promise.all([
    getPortalDashboardData(session.formandoId, session.organizacaoId),
    getPortalMateriais(session.formandoId, session.organizacaoId),
    // Acompanhamento de leitura é do GRUPO (vocacional ou de formação): retorna
    // null quando o grupo não tem livros, então buscar sempre é barato e cobre
    // tanto o vocacionado (Travessia) quanto o formando (leituras da formação).
    getPortalTravessia(session.formandoId, session.organizacaoId),
    getPortalAniversariantes(session.formandoId, session.organizacaoId),
    getPublicBranding(session.organizacaoId),
    getPortalNotificacoes(session.formandoId, session.organizacaoId),
  ]);

  // A identidade/terminologia da leitura segue o público: vocacional mantém a
  // "Travessia" (Frutos, evangelização, Mural); formando vê "Minhas leituras".
  const leituraContexto = session.audiencia === "vocacional" ? "vocacional" : "formativo";

  // Sessão válida mas formando inexistente/inativo → encerra pela porta de
  // origem (proxy limpará o cookie no próximo acesso protegido)
  if (!data) redirect(portalHomeFor(session.audiencia));

  return (
    <DashboardClient
      data={data}
      materiais={materiais}
      travessia={travessia}
      leituraContexto={leituraContexto}
      aniversariantes={aniversariantes}
      branding={branding}
      notificacoes={notificacoes}
    />
  );
}
