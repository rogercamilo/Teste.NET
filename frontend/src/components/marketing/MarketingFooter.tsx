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
