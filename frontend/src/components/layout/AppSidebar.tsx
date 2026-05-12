"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LogOut, ShieldCheck, UserCog } from "lucide-react";
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
import { navGroupsAdmin, navGroupsFormador, type NavGroup } from "./nav-items";

export interface AppSidebarUser {
  name: string;
  email: string;
  role: string;
  moradaId?: string | null;
}

interface AppSidebarProps {
  user: AppSidebarUser;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    setLogo(localStorage.getItem("appForm:logo"));
    const handler = () => setLogo(localStorage.getItem("appForm:logo"));
    window.addEventListener("appform:logo-changed", handler);
    return () => window.removeEventListener("appform:logo-changed", handler);
  }, []);

  const isAdmin = user.role === "administrador";
  const roleLabel = isAdmin ? "Formador Geral" : "Formador Comunitário";
  const RoleIcon = isAdmin ? ShieldCheck : UserCog;

  const navGroups: NavGroup[] = isAdmin
    ? navGroupsAdmin
    : navGroupsFormador.map((g) => {
        if (g.label === "Minha Morada" && user.moradaId) {
          return {
            ...g,
            items: [
              { title: "Visão Geral", href: `/moradas/${user.moradaId}`, icon: Home },
              ...g.items,
            ],
          };
        }
        return g;
      });

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-1">
          {logo ? (
            <img
              src={logo}
              alt="Logo"
              className="h-8 w-8 shrink-0 rounded-lg object-contain bg-muted"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
              <span className="text-xs font-bold text-primary-foreground leading-none">AFC</span>
            </div>
          )}
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold text-foreground leading-tight truncate">
              Formação Comunitária
            </span>
            <span className="text-xs text-muted-foreground truncate">
              Dom Bosco
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.title}
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
              onClick={() => signOut({ callbackUrl: "/login" })}
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
