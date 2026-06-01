import { auth } from "@/auth";
import GradeFormPage from "../GradeFormPage";

export default async function NovaGradePage() {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  return <GradeFormPage role={user?.role ?? "formador_comunitario"} />;
}
