import {
  BookHeart,
  BookMarked,
  BookOpen,
  Building2,
  Calendar,
  DollarSign,
  FolderOpen,
  Gift,
  Home,
  LayoutDashboard,
  Library,
  Lock,
  MessageSquareQuote,
  ScrollText,
  Server,
  Settings,
  Shield,
  Sparkles,
  Sprout,
  Stamp,
  UserCog,
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

/**
 * Formador Geral e Administrador — acesso completo à plataforma.
 * Ordem das seções (fixa, igual a todos os perfis): Principal → Formativo →
 * Gestão Comunitária → Sistema.
 */
export const navGroupsGestao: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Agenda", href: "/agenda", icon: Calendar },
    ],
  },
  {
    label: "Gestão Comunitária",
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
        title: "Documentos Eclesiásticos",
        href: "/vitrine",
        icon: Stamp,
        requiredCapability: "vocacional",
      },
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

/**
 * Formador Pedagógico — especialista de conteúdo. Vê Dashboard + Agenda +
 * o bloco Formativo (Planos/Grades/Formações) + Configurações (Perfil).
 * NÃO tem o bloco de Gestão Comunitária (moradas, formandos, vocacional, livros...).
 */
export const navGroupsFormadorPedagogico: NavGroup[] = [
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
    label: "Sistema",
    items: [
      { title: "Configurações", href: "/configuracoes", icon: Settings },
    ],
  },
];

/**
 * Super Admin — acesso global à plataforma. O cockpit é uma página única com
 * régua de abas; cada item do menu faz deep-link para a aba via `?tab=`, de modo
 * que a barra lateral é a navegação primária (igual ao resto do app) e todas as
 * áreas ficam visíveis e alcançáveis em um clique. A aba ativa é derivada da URL
 * em `SuperAdminClient`; o estado ativo do item é resolvido em `AppSidebar`.
 */
export const navGroupsSuperAdmin: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { title: "Visão Geral", href: "/super-admin?tab=visao-geral", icon: LayoutDashboard },
    ],
  },
  {
    label: "Negócio",
    items: [
      { title: "Organizações", href: "/super-admin?tab=organizacoes", icon: Building2 },
      { title: "Financeiro", href: "/super-admin?tab=financeiro", icon: DollarSign },
      { title: "Cortesias", href: "/super-admin?tab=cortesias", icon: Gift },
      { title: "Leads", href: "/super-admin?tab=leads", icon: Sparkles },
      { title: "Depoimentos", href: "/super-admin?tab=depoimentos", icon: MessageSquareQuote },
    ],
  },
  {
    label: "Plataforma",
    items: [
      { title: "Infraestrutura", href: "/super-admin?tab=infraestrutura", icon: Server },
      { title: "Segurança", href: "/super-admin?tab=seguranca", icon: Lock },
      { title: "LGPD", href: "/super-admin?tab=lgpd", icon: Shield },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Minha Conta", href: "/super-admin?tab=conta", icon: UserCog },
      { title: "Configurações", href: "/configuracoes", icon: Settings },
    ],
  },
];

/**
 * Ordem canônica das seções do sidebar — IGUAL para todos os perfis:
 * Principal → Formativo → Gestão Comunitária → Sistema (Administração, exclusiva
 * do super-admin, fica entre Gestão Comunitária e Sistema). Rótulos desconhecidos
 * caem logo antes de "Sistema". `resolveNavGroups` ordena por este rank, de modo
 * que a ordem é garantida estruturalmente — não depende de como cada array acima
 * foi escrito.
 */
const SECTION_RANK: Record<string, number> = {
  Principal: 0,
  Formativo: 1,
  Negócio: 1, // super-admin (nunca coexiste com Formativo)
  "Gestão Comunitária": 2,
  Plataforma: 2, // super-admin (nunca coexiste com Gestão Comunitária)
  Administração: 3,
  Sistema: 5,
};
const sectionRank = (label: string): number => SECTION_RANK[label] ?? 4;

/**
 * Resolve os grupos de navegação para um usuário: escolhe o conjunto por papel,
 * injeta "Visão Geral" da morada do formador, impõe a ordem canônica das seções
 * (igual em todos os perfis), aplica os guards de tipo de org / capability
 * vocacional e substitui a terminologia customizada. Fonte única usada pelo
 * `AppSidebar` e pelo `CommandPalette` (Cmd-K).
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
  const isFormadorPedagogico = role === "formador_pedagogico";

  const baseGroups: NavGroup[] = isSuperAdmin
    ? navGroupsSuperAdmin
    : isFormadorPedagogico
    ? navGroupsFormadorPedagogico
    : isGestao
    ? navGroupsGestao
    : navGroupsFormador.map((g) => {
        if (g.label === "Gestão Comunitária" && grupoFormacaoId) {
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

  // Ordem canônica das seções, idêntica em todos os perfis. `sort` estável (spec
  // JS) preserva a ordem dos itens dentro de cada seção.
  const ordered = [...baseGroups].sort((a, b) => sectionRank(a.label) - sectionRank(b.label));

  return ordered.map((g) => ({
    ...g,
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
    label: "Gestão Comunitária",
    items: [
      { title: "Formandos", href: "/formandos", icon: Users },
      {
        title: "Jornada Vocacional",
        href: "/jornada-vocacional",
        icon: ScrollText,
        requiredTipoOrg: ["nova_comunidade", "instituto_religioso"],
      },
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

