import { Suspense } from "react";
import RegistroForm from "./RegistroForm";

export default function RegistroPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <span className="animate-spin h-6 w-6 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <RegistroForm />
    </Suspense>
  );
}
