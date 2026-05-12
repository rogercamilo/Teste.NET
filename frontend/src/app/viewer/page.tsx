import { Suspense } from "react";
import ViewerClient from "./ViewerClient";

export default async function ViewerPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; nome?: string; origem?: string }>;
}) {
  const { id = "", nome = "Documento", origem = "/planos" } = await searchParams;
  return (
    <Suspense>
      <ViewerClient id={id} nome={decodeURIComponent(nome)} origem={decodeURIComponent(origem)} />
    </Suspense>
  );
}
