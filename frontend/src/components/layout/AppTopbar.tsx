"use client";

import { Fragment } from "react";
import Link from "next/link";
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
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useTermos } from "@/lib/data-store";

type BreadcrumbSegment = { label: string; href: string };

const NAMED_ACTIONS = new Set(["novo", "nova", "editar"]);

function buildBreadcrumbs(pathname: string, morada: string): BreadcrumbSegment[] {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return [{ label: "Dashboard", href: "/dashboard" }];

  const root = parts[0];

  const simpleRoutes: Record<string, string> = {
    dashboard: "Dashboard",
    agenda: "Agenda",
    configuracoes: "Configurações",
    viewer: "Visualizador",
  };

  if (simpleRoutes[root]) {
    return [{ label: simpleRoutes[root], href: `/${root}` }];
  }

  if (root === "super-admin") {
    const base: BreadcrumbSegment[] = [
      { label: "Administração", href: "/super-admin" },
      { label: "Super Admin", href: "/super-admin" },
    ];
    if (parts[1] === "dashboard") {
      base.push({ label: "Cockpit", href: "/super-admin/dashboard" });
    } else if (parts[1] === "organizacoes" && parts[3] === "reset-credenciais") {
      base.push({ label: "Reset de Credenciais", href: pathname });
    }
    return base;
  }

  const sectionMap: Record<string, { parent: string; parentHref: string; label: string }> = {
    planos:     { parent: "Pedagógico",        parentHref: "/planos",    label: "Planos Formativos"   },
    grades:     { parent: "Pedagógico",        parentHref: "/planos",    label: "Grades Formativas"   },
    formacoes:  { parent: "Pedagógico",        parentHref: "/formacoes", label: "Formações"           },
    formandos:  { parent: "Gestão",            parentHref: "/formandos", label: "Formandos"           },
    moradas:    { parent: "Gestão",            parentHref: "/moradas",   label: "Moradas"             },
    documentos: { parent: "Gestão",            parentHref: "/moradas",   label: "Documentos"          },
    presenca:   { parent: `Minha ${morada}`,   parentHref: "/presenca",  label: "Gestão de Presença"  },
    comentarios:{ parent: `Minha ${morada}`,   parentHref: "/presenca",  label: "Comentários"         },
  };

  const subLabels: Record<string, Record<string, string>> = {
    planos:    { novo: "Novo Plano",     editar: "Editar Plano"     },
    grades:    { novo: "Nova Grade",     editar: "Editar Grade"     },
    formacoes: { novo: "Nova Formação",  editar: "Editar Formação"  },
    moradas:   { nova: "Nova Morada"                                },
  };

  const section = sectionMap[root];
  if (!section) {
    return [{ label: root.charAt(0).toUpperCase() + root.slice(1), href: `/${root}` }];
  }

  const crumbs: BreadcrumbSegment[] = [
    { label: section.parent, href: section.parentHref },
    { label: section.label,  href: `/${root}`          },
  ];

  if (parts.length === 1) return crumbs;

  const seg2 = parts[1];

  if (NAMED_ACTIONS.has(seg2)) {
    const label = subLabels[root]?.[seg2] ?? seg2.charAt(0).toUpperCase() + seg2.slice(1);
    crumbs.push({ label, href: pathname });
  } else {
    // Dynamic [id] segment
    if (parts.length === 2) {
      crumbs.push({ label: "Detalhes", href: pathname });
    } else {
      // /resource/[id]/editar
      const sub = parts[2];
      const label = subLabels[root]?.[sub] ?? sub.charAt(0).toUpperCase() + sub.slice(1);
      crumbs.push({ label: "Detalhes",  href: `/${root}/${seg2}` });
      crumbs.push({ label,              href: pathname             });
    }
  }

  return crumbs;
}

export function AppTopbar() {
  const pathname = usePathname();
  const { morada } = useTermos();

  const breadcrumbs = buildBreadcrumbs(pathname, morada);

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 bg-background/80 backdrop-blur-sm border-b border-border/60 px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4 mx-1" />

      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <Fragment key={`${crumb.href}-${index}`}>
                {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                <BreadcrumbItem className={!isLast ? "hidden md:block" : undefined}>
                  <BreadcrumbLink
                    render={<Link href={crumb.href} />}
                    className={
                      isLast
                        ? "text-sm font-medium text-foreground hover:text-foreground"
                        : "text-muted-foreground text-sm"
                    }
                  >
                    {crumb.label}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </Fragment>
            );
          })}
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
