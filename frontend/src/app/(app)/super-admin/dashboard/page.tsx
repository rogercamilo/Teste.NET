import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/lib/auth-helpers";
import DashboardClient from "./DashboardClient";

export default async function SuperAdminDashboardPage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (user?.role !== "super_admin") redirect("/dashboard");

  return <DashboardClient />;
}
