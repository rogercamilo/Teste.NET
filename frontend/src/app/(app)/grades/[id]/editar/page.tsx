import { auth } from "@/auth";
import GradeFormPage from "../../GradeFormPage";

export default async function EditarGradePage({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([auth(), params]);
  const user = session?.user as { role?: string } | undefined;
  return <GradeFormPage id={id} role={user?.role ?? "formador_comunitario"} />;
}
