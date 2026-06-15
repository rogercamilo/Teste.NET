"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const navLinks = [
  ["Recursos", "/recursos"],
  ["Para quem é", "/para-quem-e"],
  ["Preços", "/precos"],
  ["FAQ", "/faq"],
] as const;

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <img
            src="/brand/formatio-horizontal-on-dark.svg"
            alt="Formattio"
            height={32}
            className="h-8 w-auto"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className={`text-sm transition-colors ${
                pathname === href
                  ? "text-white font-medium"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2"
          >
            Fazer Login
          </Link>
          <Link
            href="/registro"
            className="text-sm font-medium bg-white text-slate-950 hover:bg-slate-100 transition-colors px-4 py-2 rounded-lg"
          >
            Cadastre-se
          </Link>
        </div>

        <button
          className="md:hidden text-slate-400 hover:text-white"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/10 bg-slate-950 px-4 py-4 space-y-3">
          {navLinks.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              className={`block text-sm py-1 ${
                pathname === href
                  ? "text-white font-medium"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
          <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
            <Link
              href="/login"
              className="text-sm text-center text-slate-400 hover:text-white py-2"
            >
              Fazer Login
            </Link>
            <Link
              href="/registro"
              className="text-sm font-medium bg-white text-slate-950 text-center px-4 py-2 rounded-lg"
            >
              Cadastre-se
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
