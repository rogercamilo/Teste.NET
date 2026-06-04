import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toGrupoFormacao } from "@/lib/converters";
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

  const gruposFormacao = sessionUser.organizacaoId
    ? await prisma.grupoFormacao.findMany({
        where: { organizacaoId: sessionUser.organizacaoId },
        orderBy: { nome: "asc" },
      })
    : [];

  return (
    <ConfiguracoesClient
      userId={sessionUser.id ?? ""}
      userName={sessionUser.name ?? "Usuário"}
      userEmail={sessionUser.email ?? ""}
      userRole={sessionUser.role ?? "formador_comunitario"}
      initialGruposFormacao={gruposFormacao.map(toGrupoFormacao)}
    />
  );
}
