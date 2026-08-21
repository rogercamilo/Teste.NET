import { Sprout, BookOpen, Star, Flame, Compass, Bird, type LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import type { NivelFormativo } from "@/types";

// Ícone por nível formativo — substitui os emojis antes usados como marcadores.
// Bird representa o "Grupo Livre" (sem nível estruturado).
const NIVEL_ICONS: Record<NivelFormativo, ComponentType<LucideProps>> = {
  "pre-discipulado": Sprout,
  discipulado: BookOpen,
  "primeiras-promessas": Star,
  "formacao-permanente": Flame,
  vocacional: Compass,
};

export function NivelFormativoIcon({
  nivel,
  ...props
}: { nivel: NivelFormativo | null | undefined } & LucideProps) {
  const Icon = nivel ? NIVEL_ICONS[nivel] : Bird;
  return <Icon aria-hidden {...props} />;
}
