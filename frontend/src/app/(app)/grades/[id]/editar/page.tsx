"use client";
import { useParams } from "next/navigation";
import GradeFormPage from "../../GradeFormPage";

export default function EditarGradePage() {
  const { id } = useParams<{ id: string }>();
  return <GradeFormPage id={id} />;
}
