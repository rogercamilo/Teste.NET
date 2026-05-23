import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LandingPage from "./LandingPage";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  return <LandingPage />;
}
