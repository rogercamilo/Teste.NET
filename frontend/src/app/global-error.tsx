"use client";

// Boundary global do App Router. Só dispara quando o PRÓPRIO root layout falha em
// renderizar — por isso substitui o layout inteiro e precisa das próprias tags
// <html>/<body>. Não importa Providers/componentes do app (eles podem ser a causa
// da falha). Estilos inline para não depender do globals.css do layout quebrado.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: "#faf7f5",
          color: "#1c1917",
        }}
      >
        <div style={{ maxWidth: 420, padding: "2rem", textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#B25433",
              margin: "0 auto 1.25rem",
            }}
          />
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            Algo deu errado
          </h1>
          <p style={{ fontSize: "0.925rem", lineHeight: 1.5, color: "#57534e", margin: "0 0 1.5rem" }}>
            Encontramos um erro inesperado e nossa equipe já foi notificada
            automaticamente. Tente novamente em instantes.
          </p>
          <button
            onClick={() => reset()}
            style={{
              appearance: "none",
              border: "none",
              cursor: "pointer",
              background: "#B25433",
              color: "#fff",
              fontSize: "0.925rem",
              fontWeight: 500,
              padding: "0.625rem 1.25rem",
              borderRadius: 8,
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
