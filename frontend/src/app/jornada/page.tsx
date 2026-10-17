

import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { JornadaClient } from "./JornadaClient";

export const metadata: Metadata = {
  title: "A jornada de quem conduz a formação — Formattio",
  description:
    "Do caderno espalhado à memória viva da comunidade: veja como a Formattio resolve as dores de quem acompanha a formação e os ganhos no dia a dia — encontros, presença, jornada formativa, risco e documentos em um só lugar.",
  alternates: { canonical: "/jornada" },
  openGraph: {
    title: "A jornada de quem conduz a formação — Formattio",
    description:
      "Como a Formattio transforma o dia a dia de quem acompanha a formação comunitária.",
    url: "/jornada",
  },
};

export default function JornadaPage() {
  return (
    <div className="font-sans antialiased bg-slate-950 min-h-screen">
      <MarketingNav />
      <JornadaClient />
      <MarketingFooter />
    </div>
  );
}
