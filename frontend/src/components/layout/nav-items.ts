import {
  BookOpen,
  Calendar,
  ClipboardList,
  Home,
  LayoutDashboard,
  Library,
  Settings,
  type LucideIcon,
  Users,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
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
      { title: "Moradas", href: "/moradas", icon: Home },
      { title: "Formandos", href: "/formandos", icon: Users },
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
    label: "Formativo",
    items: [
      { title: "Planos Formativos", href: "/planos", icon: BookOpen },
      { title: "Grades Formativas", href: "/grades", icon: Library },
      { title: "Formações", href: "/formacoes", icon: BookOpen },
    ],
  },
  {
    label: "Minha Morada",
    items: [
      { title: "Gestão de Presença", href: "/presenca", icon: ClipboardList },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Configurações", href: "/configuracoes", icon: Settings },
    ],
  },
];

/** @deprecated Use navGroupsGestao */
export const navGroupsAdmin = navGroupsGestao;
