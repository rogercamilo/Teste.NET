import {
  BookHeart,
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
  Sprout,
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
  /**
   * Restringe o item a uma capability da org. "vocacional" = orgs canônicas OU
   * com `vocacionalHabilitado`. Avaliado em AppSidebar via hasVocacionalAccess.
   */
  requiredCapability?: "vocacional";
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
        title: "Período Vocacional",
        href: "/vocacional",
        icon: Sprout,
        requiredCapability: "vocacional",
      },
      {
        title: "Livro de Registro",
        href: "/livro-registro",
        icon: BookMarked,
        requiredCapability: "vocacional",
      },
      {
        title: "Livro de Promessas",
        href: "/livro-promessas",
        icon: BookHeart,
        requiredCapability: "vocacional",
      },
      {
        title: "Vitrine de Documentos",
        href: "/vitrine",
        icon: Library,
        requiredCapability: "vocacional",
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
      { title: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
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

/**
 * Resolve os grupos de navegação para um usuário: escolhe o conjunto por papel,
 * injeta "Visão Geral" da morada do formador, aplica os guards de tipo de org /
 * capability vocacional e substitui a terminologia customizada. Fonte única
 * usada pelo `AppSidebar` e pelo `CommandPalette` (Cmd-K).
 */
export function resolveNavGroups(opts: {
  role: string;
  grupoFormacaoId?: string | null;
  termoGrupoFormacao: string;
  termoFormando: string;
  tipoOrg: TipoOrganizacao | null | undefined;
  vocacionalOk: boolean;
}): NavGroup[] {
  const { role, grupoFormacaoId, termoGrupoFormacao, termoFormando, tipoOrg, vocacionalOk } = opts;
  const isSuperAdmin = role === "super_admin";
  const isGestao = role === "formador_geral" || role === "administrador";

  const baseGroups: NavGroup[] = isSuperAdmin
    ? navGroupsSuperAdmin
    : isGestao
    ? navGroupsGestao
    : navGroupsFormador.map((g) => {
        if (g.label === "Minha Morada" && grupoFormacaoId) {
          return {
            ...g,
            items: [
              { title: "Visão Geral", href: `/grupos-formacao/${grupoFormacaoId}`, icon: Home },
              ...g.items,
            ],
          };
        }
        return g;
      });

  return baseGroups.map((g) => ({
    ...g,
    label: g.label === "Minha Morada" ? `Minha ${termoGrupoFormacao}` : g.label,
    items: g.items
      .filter((item) => !item.requiredTipoOrg || (tipoOrg != null && item.requiredTipoOrg.includes(tipoOrg)))
      .filter((item) => item.requiredCapability !== "vocacional" || vocacionalOk)
      .map((item) => ({
        ...item,
        title:
          item.title === "Moradas" ? `${termoGrupoFormacao}s` :
          item.title === "Formandos" ? `${termoFormando}s` :
          item.title,
      })),
  }));
}

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

