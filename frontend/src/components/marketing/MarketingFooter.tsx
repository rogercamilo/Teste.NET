import Link from "next/link";

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-slate-950 border-t border-white/5 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center mb-3">
              <img
                src="/brand/formatio-horizontal-on-dark.svg"
                alt="Formattio"
                height={28}
                className="h-7 w-auto"
              />
            </Link>
            <p className="text-xs text-slate-500 leading-relaxed">
              Plataforma de gestão formativa para comunidades e organizações religiosas.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://www.instagram.com/formattio.app"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Formattio no Instagram"
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                {/* lucide removeu o ícone do Instagram (v1.14) — SVG inline */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a
                href="https://www.youtube.com/@Formattio"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Formattio no YouTube"
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                {/* lucide removeu o ícone do YouTube (v1.14) — SVG inline */}
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                  <path d="M23 12s0-3.9-.5-5.6a2.8 2.8 0 0 0-2-2C18.7 4 12 4 12 4s-6.7 0-8.5.4a2.8 2.8 0 0 0-2 2C1 8.1 1 12 1 12s0 3.9.5 5.6a2.8 2.8 0 0 0 2 2C5.3 20 12 20 12 20s6.7 0 8.5-.4a2.8 2.8 0 0 0 2-2C23 15.9 23 12 23 12zM10 15.5v-7l6 3.5-6 3.5z" />
                </svg>
              </a>
            </div>
          </div>

          {[
            {
              title: "Produto",
              links: [
                ["Recursos", "/recursos"],
                ["Para quem é", "/para-quem-e"],
                ["Preços", "/precos"],
                ["FAQ", "/faq"],
              ],
            },
            {
              title: "Conta",
              links: [
                ["Entrar", "/login"],
                ["Criar conta", "/registro"],
              ],
            },
            {
              title: "Legal",
              links: [
                ["Privacidade", "/privacidade"],
                ["Termos de Uso", "/termos"],
              ],
            },
          ].map(({ title, links }) => (
            <div key={title}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                {title}
              </p>
              <ul className="space-y-2">
                {links.map(([label, href]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <p>© {year} Formattio. Todos os direitos reservados.</p>
          <p>Desenvolvido com amor para comunidades brasileiras.</p>
        </div>
      </div>
    </footer>
  );
}
