import Link from "next/link";

export const metadata = {
  title: "Página não encontrada — Formattio",
};

// 404 branded do app inteiro. Server Component puro (sem estado/JS) para renderizar
// o conteúdo já no SSR — não depende de hidratação, então imune ao bloqueio de
// scripts por CSP nonce/strict-dynamic. Marca Formattio por padrão (tema default).
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-center">
      <div className="w-full max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/formatio-symbol.svg" alt="Formattio" width={56} height={56} className="mx-auto mb-6" />
        <p className="text-sm font-semibold text-primary">Erro 404</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Página não encontrada</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          O endereço que você procurou não existe ou pode ter sido movido.
          Confira o link e tente novamente.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Ir para a página inicial
        </Link>
        <p className="mt-10 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Formattio
        </p>
      </div>
    </div>
  );
}
