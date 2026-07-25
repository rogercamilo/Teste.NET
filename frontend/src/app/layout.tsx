import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import Providers from "@/components/Providers";
import CookieBanner from "@/components/CookieBanner";
import { SITE_URL } from "@/lib/structured-data";
import { OG_IMAGE } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.formattio.com.br"),
  title: {
    default: "Formattio — Plataforma de gestão formativa para comunidades e institutos",
    template: "%s · Formattio",
  },
  description:
    "Plataforma de gestão formativa para novas comunidades, institutos religiosos, grupos de oração e centros formativos. Acompanhamento vocacional, documentos eclesiásticos e conformidade com a LGPD.",
  applicationName: "Formattio",
  keywords: [
    "gestão formativa",
    "formação vocacional",
    "novas comunidades",
    "institutos religiosos",
    "documentos eclesiásticos",
    "direito canônico",
    "acompanhamento vocacional",
    "software para comunidades católicas",
    "LGPD comunidade religiosa",
  ],
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
  // Card social padrão. Cobre qualquer página que não declare o seu próprio
  // openGraph (ex.: páginas legais); as páginas de marketing sobrescrevem via
  // marketingMeta() com títulos/descrições específicos.
  openGraph: {
    type: "website",
    siteName: "Formattio",
    locale: "pt_BR",
    url: SITE_URL,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    images: [OG_IMAGE.url],
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
