"use client";

import { usePathname } from "next/navigation";

/**
 * Fade-in de entrada consistente a cada navegação. O `key={pathname}` faz o
 * wrapper remontar só quando a rota muda de verdade — `router.refresh()`
 * (mesmo pathname) NÃO remonta, preservando o estado de UI das telas.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-in-fast">
      {children}
    </div>
  );
}
