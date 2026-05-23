import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import Providers from "@/components/Providers";
import CookieBanner from "@/components/CookieBanner";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Formatio",
  description: "Plataforma formativa para gestão e acompanhamento da jornada comunitária",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>
          <TooltipProvider delay={300}>
            {children}
            <Toaster richColors position="top-right" />
            <CookieBanner />
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
