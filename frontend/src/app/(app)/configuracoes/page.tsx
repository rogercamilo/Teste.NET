import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toGrupoFormacao } from "@/lib/converters";
import { getBillingInfo } from "@/lib/billing-data";
import { getUsage } from "@/lib/plan-limits";
import ConfiguracoesClient from "./ConfiguracoesClient";

export default async function ConfiguracoesPage() {
  const session = await auth();
  const sessionUser = session?.user as {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string;
    organizacaoId?: string;
  };

  if (!sessionUser) redirect("/dashboard");

  const orgId = sessionUser.organizacaoId;

  const [gruposFormacao, billingInfo, usageInfo] = await Promise.all([
    orgId
      ? prisma.grupoFormacao.findMany({
          where: { organizacaoId: orgId },
          orderBy: { nome: "asc" },
        })
      : Promise.resolve([]),
    orgId ? getBillingInfo(orgId).catch(() => null) : Promise.resolve(null),
    orgId ? getUsage(orgId).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <ConfiguracoesClient
      userId={sessionUser.id ?? ""}
      userName={sessionUser.name ?? "Usuário"}
      userEmail={sessionUser.email ?? ""}
      userRole={sessionUser.role ?? "formador_comunitario"}
      initialGruposFormacao={gruposFormacao.map(toGrupoFormacao)}
      initialBilling={billingInfo}
      initialUsage={usageInfo}
    />
  );
}
