import type { Metadata } from "next";
import { ReelClient } from "./ReelClient";

// Peça de vídeo (gravada para /jornada/formattio-15s.webm). Fora do índice:
// é o palco de renderização do filme, não uma página de conteúdo.
export const metadata: Metadata = {
  title: "Formattio — 15s",
  robots: { index: false, follow: false },
};

export default function ReelPage() {
  return <ReelClient />;
}
