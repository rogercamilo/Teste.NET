import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toGrupoFormacao } from "@/lib/converters";
import { getBillingInfo } from "@/lib/billing-data";
import { getUsage } from "@/lib/plan-limits";
import { SessionUser } from "@/lib/auth-helpers";
import { getUserName } from "@/lib/current-user";
import ConfiguracoesClient from "./ConfiguracoesClient";

export default async function ConfiguracoesPage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!user?.id) redirect("/dashboard");

  const orgId = user.organizacaoId;

  const [gruposFormacao, billingInfo, usageInfo] = await Promise.all([
    orgId
      ? prisma.grupoFormacao.findMany({
          where: { organizacaoId: orgId, ativo: true },
          orderBy: { nome: "asc" },
        })
      : Promise.resolve([]),
    orgId ? getBillingInfo(orgId).catch(() => null) : Promise.resolve(null),
    orgId ? getUsage(orgId).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <ConfiguracoesClient
      userId={user.id ?? ""}
      userName={(await getUserName(user.id)) ?? session?.user?.name ?? "Usuário"}
      userEmail={session?.user?.email ?? ""}
      userRole={user.role ?? "formador_comunitario"}
      userGrupoFormacaoId={user.grupoFormacaoId ?? null}
      initialGruposFormacao={gruposFormacao.map(toGrupoFormacao)}
      initialBilling={billingInfo}
      initialUsage={usageInfo}
    />
  );
}
