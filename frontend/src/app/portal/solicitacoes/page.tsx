import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import { getPublicBranding } from "@/lib/public-branding";
import { portalHomeFor } from "@/lib/portal-routes";
import { prisma } from "@/lib/prisma";
import SolicitacoesClient from "./SolicitacoesClient";

export const metadata = {
  title: "Solicitações",
};

export default async function PortalSolicitacoesPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal/formando");

  const [branding, formando, acompanhamento, licenca] = await Promise.all([
    getPublicBranding(session.organizacaoId),
    prisma.formando.findFirst({
      where: { id: session.formandoId, organizacaoId: session.organizacaoId, deletedAt: null },
      select: { id: true },
    }),
    prisma.solicitacaoAcompanhamentoFormando.findFirst({
      where: { formandoId: session.formandoId, organizacaoId: session.organizacaoId, status: "pendente" },
      select: { id: true },
    }),
    prisma.solicitacaoLicencaFormando.findFirst({
      where: { formandoId: session.formandoId, organizacaoId: session.organizacaoId, status: "pendente" },
      select: { id: true, motivo: true, solicitadoEm: true },
    }),
  ]);

  // Sessão válida mas formando inexistente/inativo → encerra pela porta de origem.
  if (!formando) redirect(portalHomeFor(session.audiencia));

  return (
    <SolicitacoesClient
      branding={branding}
      audiencia={session.audiencia}
      acompanhamentoPendente={!!acompanhamento}
      licenca={
        licenca
          ? { motivo: licenca.motivo, solicitadoEm: licenca.solicitadoEm.toISOString() }
          : null
      }
    />
  );
}
