"use client";

import { useLayoutEffect } from "react";
import { applyThemePalette, getStoredThemeKey } from "@/lib/themes";

export function ThemeApplier() {
  useLayoutEffect(() => {
    const key = getStoredThemeKey();
    if (key !== "azul") applyThemePalette(key);
  }, []);

  return null;
}
