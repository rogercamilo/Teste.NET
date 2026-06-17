import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const CLAY = "#B25433";
const CREAM = "#FBF8F4";
const DARK = "#2A1E16";
const MUTED = "#8C6F5E";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const { searchParams } = url;
  const title = searchParams.get("title");
  const subtitle = searchParams.get("subtitle");

  const heading = title ?? "Formattio";
  const isHome = !title;

  // Use absolute URL so Satori can fetch the PNG (SVG not supported in <img>)
  const logoUrl = `${url.protocol}//${url.host}/brand/icon-512.png`;

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
