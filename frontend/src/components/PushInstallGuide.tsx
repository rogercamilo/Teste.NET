"use client";

import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Share,
  SquarePlus,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

/**
 * Guia visual, um passo por vez, para ativar notificações em ambientes onde o
 * navegador não expõe push por conta própria — feito para quem tem pouca
 * familiaridade com tecnologia: ícones grandes, texto curto e reconhecível
 * ("procure este ícone") em vez de instruções por escrito.
 *
 * - `ios-install`: adicionar o site à Tela de Início do iPhone (único caminho
 *   para push no iOS).
 * - `in-app`: link aberto dentro de outro app (WhatsApp/Instagram) → abrir no
 *   navegador de verdade.
 */
export function PushInstallGuide({
  variant,
  open,
  onOpenChange,
}: {
  variant: "ios-install" | "in-app";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl pb-8">
        {variant === "ios-install" ? <IosInstallSteps /> : <InAppSteps />}
      </SheetContent>
    </Sheet>
  );
}

// ── Passo genérico: número + ilustração + frase curta ─────────────────────────

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {n}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-base font-medium leading-snug text-foreground">{title}</p>
        {children}
      </div>
    </li>
  );
}

// ── iOS: Adicionar à Tela de Início ───────────────────────────────────────────

function IosInstallSteps() {
  return (
    <>
      <SheetHeader className="px-1 pt-1">
        <SheetTitle className="text-lg">Ativar notificações no iPhone</SheetTitle>
        <SheetDescription>
          São 3 passos rápidos. Basta seguir as imagens abaixo.
        </SheetDescription>
      </SheetHeader>

      <ol className="space-y-6 px-1">
        <Step
          n={1}
          title={
            <>
              Toque em <span className="text-primary">Compartilhar</span> — o
              ícone abaixo, na barra do Safari.
            </>
          }
        >
          {/* Mock da barra do Safari com o ícone Compartilhar em destaque */}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
            <ChevronLeft className="h-4 w-4 text-muted-foreground/40" />
            <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
            <div className="h-5 flex-1 rounded-md bg-background/80" />
            <span className="relative flex h-9 w-9 items-center justify-center rounded-lg ring-2 ring-primary ring-offset-1 ring-offset-muted/40">
              <Share className="h-5 w-5 text-primary" />
            </span>
            <Plus className="h-4 w-4 text-muted-foreground/40" />
          </div>
          <p className="text-xs text-muted-foreground">
            Fica na barra de baixo (ou ao lado do endereço).
          </p>
        </Step>

        <Step
          n={2}
          title={
            <>
              Role e escolha{" "}
              <span className="text-primary">Adicionar à Tela de Início</span>.
            </>
          }
        >
          {/* Mock da linha do menu do iOS */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-3">
            <span className="text-sm font-medium text-foreground">
              Adicionar à Tela de Início
            </span>
            <SquarePlus className="h-5 w-5 text-primary" />
          </div>
        </Step>

        <Step
          n={3}
          title={
            <>
              Abra o <span className="text-primary">Formattio</span> pelo novo
              ícone e toque em ativar.
            </>
          }
        >
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-3">
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[12px] bg-white shadow-sm ring-1 ring-black/10">
              <Image
                src="/brand/icon-192.png"
                alt="Ícone do Formattio"
                fill
                sizes="48px"
                priority
                className="object-contain p-1"
              />
            </span>
            <span className="text-sm text-muted-foreground">
              O app abre como um aplicativo — e as notificações passam a chegar
              mesmo com ele fechado.
            </span>
          </div>
        </Step>
      </ol>
    </>
  );
}

// ── Webview: abrir no navegador ───────────────────────────────────────────────

function InAppSteps() {
  return (
    <>
      <SheetHeader className="px-1 pt-1">
        <SheetTitle className="text-lg">Abrir no navegador</SheetTitle>
        <SheetDescription>
          Você abriu por dentro de outro app (como o WhatsApp), que não permite
          notificações. É só abrir no navegador do seu celular.
        </SheetDescription>
      </SheetHeader>

      <ol className="space-y-6 px-1">
        <Step
          n={1}
          title={
            <>
              Toque no menu <span className="text-primary">⋯</span> no canto da
              tela.
            </>
          }
        >
          <div className="flex items-center justify-end rounded-xl border border-border bg-muted/40 px-3 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg ring-2 ring-primary ring-offset-1 ring-offset-muted/40">
              <MoreHorizontal className="h-5 w-5 text-primary" />
            </span>
          </div>
        </Step>

        <Step
          n={2}
          title={
            <>
              Escolha{" "}
              <span className="text-primary">Abrir no Safari</span> (iPhone) ou{" "}
              <span className="text-primary">Abrir no Chrome</span> (Android).
            </>
          }
        >
          <p className="text-xs text-muted-foreground">
            No iPhone, depois disso siga o passo a passo de “Adicionar à Tela de
            Início”.
          </p>
        </Step>
      </ol>
    </>
  );
}
