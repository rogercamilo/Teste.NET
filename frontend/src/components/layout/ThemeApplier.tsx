"use client";

import { useLayoutEffect } from "react";
import { applyThemePalette } from "@/lib/themes";

export function ThemeApplier({ themeKey }: { themeKey?: string | null }) {
  useLayoutEffect(() => {
    if (themeKey) applyThemePalette(themeKey);
  }, [themeKey]);

  return null;
}
