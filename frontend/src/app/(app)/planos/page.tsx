import { auth } from "@/auth";
import PlanosClient from "./PlanosClient";

export default async function PlanosPage() {
  const session = await auth();
  const user = session?.user as { role?: string; moradaId?: string | null } | undefined;

  return (
    <PlanosClient
      role={user?.role ?? "formador_comunitario"}
      moradaId={user?.moradaId ?? null}
    />
  );
}
