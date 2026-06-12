import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import Providers from "@/components/Providers";
import CookieBanner from "@/components/CookieBanner";

export const metadata: Metadata = {
  title: "Formattio",
  description: "Plataforma formativa para gestão e acompanhamento da jornada comunitária",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
    other: [{ rel: "mask-icon", url: "/brand/favicon.svg" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
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
