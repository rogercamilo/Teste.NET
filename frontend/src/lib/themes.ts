export interface ThemePalette {
  key: string;
  label: string;
  preview: string;
  vars: Record<string, string>;
}

function mkPalette(
  key: string,
  label: string,
  preview: string,
  p: string,
  acc: string,
  accFg: string
): ThemePalette {
  const fg = "oklch(0.985 0 0)";
  return {
    key,
    label,
    preview,
    vars: {
      "--primary": p,
      "--primary-foreground": fg,
      "--ring": p,
      "--accent": acc,
      "--accent-foreground": accFg,
      "--sidebar-primary": p,
      "--sidebar-primary-foreground": fg,
      "--sidebar-accent": acc,
      "--sidebar-accent-foreground": accFg,
      "--sidebar-ring": p,
      "--chart-1": p,
    },
  };
}

export const THEME_PALETTES: ThemePalette[] = [
  mkPalette(
    "azul", "Azul", "#3b82f6",
    "oklch(0.546 0.245 264.376)",
    "oklch(0.951 0.025 254.624)",
    "oklch(0.418 0.182 264.376)"
  ),
  mkPalette(
    "verde", "Verde", "#22c55e",
    "oklch(0.548 0.198 142.495)",
    "oklch(0.951 0.022 142.495)",
    "oklch(0.418 0.160 142.495)"
  ),
  mkPalette(
    "roxo", "Roxo", "#a855f7",
    "oklch(0.546 0.245 293.541)",
    "oklch(0.951 0.025 293.541)",
    "oklch(0.418 0.182 293.541)"
  ),
  mkPalette(
    "ambar", "Âmbar", "#f59e0b",
    "oklch(0.627 0.195 70.08)",
    "oklch(0.958 0.025 70.08)",
    "oklch(0.418 0.145 70.08)"
  ),
  mkPalette(
    "rosa", "Rosa", "#ec4899",
    "oklch(0.546 0.245 350)",
    "oklch(0.951 0.025 350)",
    "oklch(0.418 0.182 350)"
  ),
  mkPalette(
    "teal", "Teal", "#0d9488",
    "oklch(0.546 0.155 200)",
    "oklch(0.951 0.020 200)",
    "oklch(0.418 0.115 200)"
  ),
];

export function applyThemePalette(key: string): void {
  const palette = THEME_PALETTES.find((p) => p.key === key);
  if (!palette) return;
  const root = document.documentElement;
  Object.entries(palette.vars).forEach(([k, v]) => root.style.setProperty(k, v));
}

/** Returns an inline `:root{…}` CSS string for SSR — eliminates theme flash on first paint. */
export function getThemeInlineCss(key: string | null | undefined): string {
  if (!key) return "";
  const palette = THEME_PALETTES.find((p) => p.key === key);
  if (!palette) return "";
  const vars = Object.entries(palette.vars).map(([k, v]) => `${k}:${v}`).join(";");
  return `:root{${vars}}`;
}


