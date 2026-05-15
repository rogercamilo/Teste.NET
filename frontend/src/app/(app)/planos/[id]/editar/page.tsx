"use client";
import { useParams } from "next/navigation";
import PlanoFormPage from "../../PlanoFormPage";

export default function EditarPlanoPage() {
  const { id } = useParams<{ id: string }>();
  return <PlanoFormPage id={id} />;
}
