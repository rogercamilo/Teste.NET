"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const pageTitles: Record<string, { title: string; parent?: string; parentHref?: string }> = {
  "/dashboard": { title: "Dashboard" },
  "/agenda": { title: "Agenda" },
  "/planos": { title: "Planos Formativos", parent: "Pedagógico" },
  "/grades": { title: "Grades Formativas", parent: "Pedagógico" },
  "/formacoes": { title: "Formações", parent: "Pedagógico" },
  "/formandos": { title: "Formandos", parent: "Pessoas" },
  "/presenca": { title: "Gestão de Presença", parent: "Minha Morada" },
  "/comentarios": { title: "Comentários", parent: "Minha Morada" },
  "/configuracoes": { title: "Configurações" },
};

export function AppTopbar() {
  const pathname = usePathname();
  const basePath = "/" + (pathname.split("/")[1] || "dashboard");
  const pageInfo = pageTitles[basePath] ?? { title: "Página" };

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 bg-background/80 backdrop-blur-sm border-b border-border/60 px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4 mx-1" />

      <Breadcrumb>
        <BreadcrumbList>
          {pageInfo.parent && (
            <>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink className="text-muted-foreground text-sm">
                  {pageInfo.parent}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage className="text-sm font-medium">
              {pageInfo.title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="h-8 w-48 pl-8 text-sm bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/40"
          />
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
        </Button>
      </div>
    </header>
  );
}
