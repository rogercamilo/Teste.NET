"use client";

import { useLayoutEffect } from "react";
import { applyThemePalette } from "@/lib/themes";

export function ThemeApplier({ themeKey = "azul" }: { themeKey?: string }) {
  useLayoutEffect(() => {
    if (themeKey !== "azul") applyThemePalette(themeKey);
  }, [themeKey]);

  return null;
}
