import { auth } from "@/auth";
import { redirect } from "next/navigation";
import GrupoFormacaoDetail from "./GrupoFormacaoDetail";

export default async function GrupoFormacaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const user = session?.user as { role?: string; grupoFormacaoId?: string | null; id?: string };

  if (user?.role === "formador_comunitario" && user?.grupoFormacaoId !== id) {
    redirect(`/grupos-formacao/${user.grupoFormacaoId ?? ""}`);
  }

  return (
    <GrupoFormacaoDetail
      id={id}
      userRole={user?.role ?? "formador_comunitario"}
      userId={user?.id ?? ""}
    />
  );
}
