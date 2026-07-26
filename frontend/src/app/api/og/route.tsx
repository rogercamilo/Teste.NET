import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const CLAY = "#B25433";
const CREAM = "#FBF8F4";
const DARK = "#2A1E16";
const MUTED = "#8C6F5E";

// Origem fixa da marca — NÃO usar o host do request (Host header é forjável e
// levaria o Satori a buscar de um host arbitrário → SSRF cego).
const BRAND_ORIGIN = "https://www.formattio.com.br";

/** Tamanho de fonte do título que se adapta ao comprimento — evita que títulos
 *  longos de artigo estourem o card. */
function titleFontSize(len: number): number {
  if (len > 90) return 46;
  if (len > 60) return 54;
  if (len > 36) return 62;
  return 72;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title");
  const subtitle = searchParams.get("subtitle");
  // `eyebrow` (rótulo do pilar/cluster) presente => card de ARTIGO (título
  // grande, alinhado à esquerda). Ausente => card de marca (home/páginas).
  const eyebrow = searchParams.get("eyebrow");

  const heading = (title ?? "Formattio").slice(0, 120);
  const isHome = !title;
  const isArticle = Boolean(eyebrow);

  // URL absoluta fixa para o Satori buscar o PNG (SVG não é suportado em <img>).
  const logoUrl = `${BRAND_ORIGIN}/brand/icon-512.png`;

  // ── Card de ARTIGO ────────────────────────────────────────────────────────
  if (isArticle) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "1200px",
            height: "630px",
            background: CREAM,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "72px 76px",
            position: "relative",
            overflow: "hidden",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          {/* Círculo decorativo */}
          <div
            style={{
              position: "absolute",
              right: "-120px",
              top: "-120px",
              width: "440px",
              height: "440px",
              borderRadius: "50%",
              background: CLAY,
              opacity: 0.06,
              display: "flex",
            }}
          />

          {/* Topo: lockup da marca + eyebrow do pilar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <img src={logoUrl} width={52} height={52} style={{ width: "52px", height: "52px" }} />
              <div
                style={{
                  fontSize: "34px",
                  fontWeight: 700,
                  color: DARK,
                  letterSpacing: "-0.03em",
                  marginLeft: "14px",
                  display: "flex",
                }}
              >
                Formattio
              </div>
            </div>
            <div
              style={{
                fontSize: "22px",
                fontWeight: 600,
                color: CLAY,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                display: "flex",
              }}
            >
              {eyebrow!.slice(0, 40)}
            </div>
          </div>

          {/* Título do artigo */}
          <div
            style={{
              fontSize: `${titleFontSize(heading.length)}px`,
              fontWeight: 700,
              color: DARK,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              maxWidth: "1040px",
              display: "flex",
            }}
          >
            {heading}
          </div>

          {/* Rodapé: URL */}
          <div
            style={{
              fontSize: "24px",
              color: MUTED,
              letterSpacing: "0.01em",
              display: "flex",
            }}
          >
            www.formattio.com.br
          </div>

          {/* Barra clay inferior */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "12px",
              background: CLAY,
              display: "flex",
            }}
          />
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  // ── Card de MARCA (home / páginas) ────────────────────────────────────────
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: CREAM,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {/* Background decorative circles */}
        <div
          style={{
            position: "absolute",
            right: "-80px",
            top: "-80px",
            width: "460px",
            height: "460px",
            borderRadius: "50%",
            background: CLAY,
            opacity: 0.07,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "-60px",
            bottom: "-60px",
            width: "320px",
            height: "320px",
            borderRadius: "50%",
            background: CLAY,
            opacity: 0.05,
            display: "flex",
          }}
        />

        {/* Logo symbol — must be a rasterized PNG; Satori does not support SVG in <img> */}
        <img
          src={logoUrl}
          width={isHome ? 152 : 96}
          height={isHome ? 152 : 96}
          style={{ width: isHome ? "152px" : "96px", height: isHome ? "152px" : "96px" }}
        />

        {/* Wordmark */}
        <div
          style={{
            fontSize: isHome ? "92px" : "64px",
            fontWeight: 700,
            color: DARK,
            letterSpacing: "-0.03em",
            marginTop: isHome ? "12px" : "8px",
            lineHeight: 1,
            display: "flex",
          }}
        >
          Formattio
        </div>

        {isHome ? (
          <>
            {/* Home: full tagline */}
            <div
              style={{
                fontSize: "30px",
                color: MUTED,
                marginTop: "20px",
                textAlign: "center",
                display: "flex",
              }}
            >
              Plataforma de gestão formativa para comunidades e institutos
            </div>

            {/* URL */}
            <div
              style={{
                fontSize: "22px",
                color: CLAY,
                marginTop: "28px",
                letterSpacing: "0.01em",
                display: "flex",
              }}
            >
              www.formattio.com.br
            </div>
          </>
        ) : (
          <>
            {/* Page-specific title */}
            <div
              style={{
                fontSize: "48px",
                fontWeight: 600,
                color: DARK,
                marginTop: "20px",
                textAlign: "center",
                maxWidth: "900px",
                display: "flex",
              }}
            >
              {heading}
            </div>

            {subtitle && (
              <div
                style={{
                  fontSize: "30px",
                  color: MUTED,
                  marginTop: "12px",
                  textAlign: "center",
                  maxWidth: "800px",
                  display: "flex",
                }}
              >
                {subtitle}
              </div>
            )}
          </>
        )}

        {/* Bottom clay bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "12px",
            background: CLAY,
            display: "flex",
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
