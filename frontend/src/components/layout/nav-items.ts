import {
  BookMarked,
  BookOpen,
  Calendar,
  ClipboardList,
  FolderOpen,
  Home,
  LayoutDashboard,
  Library,
  ScrollText,
  Settings,
  ShieldAlert,
  type LucideIcon,
  Users,
} from "lucide-react";
import type { TipoOrganizacao } from "@/types";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  exact?: boolean;
  /** Restringe o item a um ou mais tipos de organização. Omitir = visível para todos. */
  requiredTipoOrg?: TipoOrganizacao[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Formador Geral e Administrador — acesso completo à plataforma */
export const navGroupsGestao: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Agenda", href: "/agenda", icon: Calendar },
    ],
  },
  {
    label: "Pedagógico",
    items: [
      { title: "Planos Formativos", href: "/planos", icon: BookOpen },
      { title: "Grades Formativas", href: "/grades", icon: Library },
      { title: "Formações", href: "/formacoes", icon: BookOpen },
    ],
  },
  {
    label: "Gestão",
    items: [
      { title: "Moradas", href: "/grupos-formacao", icon: Home },
      { title: "Formandos", href: "/formandos", icon: Users },
      { title: "Auditoria Documental", href: "/documentos", icon: FolderOpen },
      {
        title: "Jornada Vocacional",
        href: "/jornada-vocacional",
        icon: ScrollText,
        requiredTipoOrg: ["nova_comunidade", "instituto_religioso"],
      },
      {
        title: "Livro de Registro",
        href: "/livro-registro",
        icon: BookMarked,
        requiredTipoOrg: ["nova_comunidade", "instituto_religioso"],
      },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Configurações", href: "/configuracoes", icon: Settings },
    ],
  },
];

/** Super Admin — acesso global à plataforma */
export const navGroupsSuperAdmin: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { title: "Dashboard", href: "/super-admin/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Administração",
    items: [
      { title: "Super Admin", href: "/super-admin", icon: ShieldAlert, exact: true },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Configurações", href: "/configuracoes", icon: Settings },
    ],
  },
];

/** Formador Comunitário — acesso restrito à sua morada */
export const navGroupsFormador: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Agenda", href: "/agenda", icon: Calendar },
    ],
  },
  {
    label: "Minha Morada",
    items: [
      { title: "Formandos", href: "/formandos", icon: Users },
      { title: "Gestão de Presença", href: "/presenca", icon: ClipboardList },
    ],
  },
  {
    label: "Formativo",
    items: [
      { title: "Planos Formativos", href: "/planos", icon: BookOpen },
      { title: "Grades Formativas", href: "/grades", icon: Library },
      { title: "Formações", href: "/formacoes", icon: BookOpen },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Configurações", href: "/configuracoes", icon: Settings },
    ],
  },
];

