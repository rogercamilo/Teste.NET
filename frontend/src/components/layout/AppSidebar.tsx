"use client";

import Link from "next/link";
import NextImage from "next/image";
import { usePathname } from "next/navigation";
import { Home, LogOut, Shield, ShieldCheck, UserCog } from "lucide-react";
import { signOut } from "next-auth/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { navGroupsGestao, navGroupsFormador, navGroupsSuperAdmin, type NavGroup } from "./nav-items";
import { useComunidade, useTermos } from "@/lib/data-store";

export interface AppSidebarUser {
  name: string;
  email: string;
  role: string;
  grupoFormacaoId?: string | null;
}

interface AppSidebarProps {
  user: AppSidebarUser;
  nomePlataforma?: string | null;
}

export function AppSidebar({ user, nomePlataforma }: AppSidebarProps) {
  const pathname = usePathname();
  const [comunidade] = useComunidade();
  // Logo carregada client-side via useComunidade para evitar transferir base64 no SSR
  const logo = comunidade.logoUrl ?? null;

  const { grupoFormacao, formando, formador } = useTermos();

  const isFormadorGeral = user.role === "formador_geral";
  const isAdmin = user.role === "administrador";
  const isSuperAdmin = user.role === "super_admin";
  const isGestao = isFormadorGeral || isAdmin;

  const roleLabel = isSuperAdmin ? "Super Admin" : isFormadorGeral ? "Formador Geral" : isAdmin ? "Administrador" : formador;
  const RoleIcon = isSuperAdmin ? ShieldCheck : isFormadorGeral ? ShieldCheck : isAdmin ? Shield : UserCog;

  // Inject "Visão Geral" for formadores before applying term substitution
  const baseGroups: NavGroup[] = isSuperAdmin
    ? navGroupsSuperAdmin
    : isGestao
    ? navGroupsGestao
    : navGroupsFormador.map((g) => {
        if (g.label === "Minha Morada" && user.grupoFormacaoId) {
          return {
            ...g,
            items: [
              { title: "Visão Geral", href: `/grupos-formacao/${user.grupoFormacaoId}`, icon: Home },
              ...g.items,
            ],
          };
        }
        return g;
      });

  const tipoOrg = comunidade.tipoOrganizacao;

  // Apply custom terminology and org-type guard
  const navGroups: NavGroup[] = baseGroups.map((g) => ({
    ...g,
    label: g.label === "Minha Morada" ? `Minha ${grupoFormacao}` : g.label,
    items: g.items
      .filter((item) => !item.requiredTipoOrg || (tipoOrg != null && item.requiredTipoOrg.includes(tipoOrg)))
      .map((item) => ({
        ...item,
        title:
          item.title === "Moradas" ? `${grupoFormacao}s` :
          item.title === "Formandos" ? `${formando}s` :
          item.title,
      })),
  }));

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2">
          {isSuperAdmin ? (
            <img
              src="/brand/formatio-symbol.svg"
              alt="Formattio"
              width={32}
              height={32}
              className="h-8 w-8 shrink-0"
            />
          ) : logo ? (
            <NextImage
              src={logo}
              alt="Logo"
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-lg object-contain bg-muted"
              unoptimized={logo.startsWith("data:")}
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
              <span className="text-xs font-bold text-primary-foreground leading-none">Fo</span>
            </div>
          )}
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            {isSuperAdmin ? (
              <>
                <span className="text-sm font-semibold text-foreground leading-tight truncate">Formattio</span>
                <span className="text-xs text-muted-foreground truncate">Plataforma</span>
              </>
            ) : (
              <>
                <span className="text-sm font-semibold text-foreground leading-tight break-words text-center">
                  {nomePlataforma || comunidade.nome || "Formattio"}
                </span>
                {nomePlataforma && (
                  <span className="text-xs text-muted-foreground break-words">
                    {comunidade.nome || ""}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1 gap-1">
            <SidebarGroupLabel className="h-6">{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (!item.exact && pathname.startsWith(item.href + "/"));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.title}
                      size="sm"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-auto py-2" tooltip={user.name}>
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium truncate">{user.name}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                  <RoleIcon className="h-3 w-3 shrink-0" />
                  {roleLabel}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sair"
              size="sm"
              onClick={() => signOut({ callbackUrl: isSuperAdmin ? "/acesso-plataforma" : "/login" })}
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
