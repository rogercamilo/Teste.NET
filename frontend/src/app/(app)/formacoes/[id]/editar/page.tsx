"use client";
import { useParams } from "next/navigation";
import FormacaoFormPage from "../../FormacaoFormPage";

export default function EditarFormacaoPage() {
  const { id } = useParams<{ id: string }>();
  return <FormacaoFormPage id={id} />;
}
