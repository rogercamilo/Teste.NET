import { auth } from "@/auth";
import { redirect } from "next/navigation";
import MoradaDetail from "./MoradaDetail";

export default async function MoradaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const user = session?.user as { role?: string; moradaId?: string | null; id?: string };

  if (user?.role === "formador_comunitario" && user?.moradaId !== id) {
    redirect(`/moradas/${user.moradaId ?? ""}`);
  }

  return (
    <MoradaDetail
      id={id}
      userRole={user?.role ?? "formador_comunitario"}
      userId={user?.id ?? ""}
    />
  );
}
