import { Suspense } from "react";
import RegistroForm from "./RegistroForm";

export default function RegistroPage() {
  return (
    <Suspense>
      <RegistroForm />
    </Suspense>
  );
}
