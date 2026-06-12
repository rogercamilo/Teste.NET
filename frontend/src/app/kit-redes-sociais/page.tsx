import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Kit de Redes Sociais · Formattio",
  description:
    "Todos os recursos visuais para criar e padronizar os perfis da Formattio no YouTube, Instagram e LinkedIn.",
};

export default function KitRedesSociaisPage() {
  return (
    <div
      style={{
        fontFamily: "var(--font-geist-sans, var(--font-sans, system-ui, sans-serif))",
        background: "#FBF8F4",
        color: "#2A1E16",
        minHeight: "100vh",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <style>{`
        .kit-wrap { max-width: 1080px; margin: 0 auto; padding: 0 32px; }
        .kit-section { padding: 64px 0; border-top: 1px solid #E5DED2; }
        .kit-mock {
          background: #fff; border: 1px solid #E5DED2; border-radius: 18px;
          box-shadow: 0 20px 25px -5px rgb(20 12 8/.10),0 8px 10px -6px rgb(20 12 8/.06);
          overflow: hidden;
        }
        .kit-mock-bar {
          display: flex; align-items: center; gap: 8px; padding: 13px 18px;
          border-bottom: 1px solid #E5DED2; background: #fff;
        }
        .kit-dot { width: 11px; height: 11px; border-radius: 50%; flex: none; }
        .kit-url {
          flex: 1; text-align: center;
          font-family: var(--font-geist-mono, ui-monospace, monospace);
          font-size: 12px; color: #847A6F;
        }
        .kit-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 22px; margin-top: 26px; }
        .kit-asset {
          background: #fff; border: 1px solid #E5DED2; border-radius: 14px;
          overflow: hidden; display: flex; flex-direction: column;
          box-shadow: 0 1px 2px rgb(20 12 8/.05),0 1px 3px rgb(20 12 8/.06);
        }
        .kit-asset-prev {
          background: repeating-linear-gradient(45deg,#F4F0EA 0 11px,#F0EBE3 11px 22px);
          padding: 24px; display: flex; align-items: center; justify-content: center;
          min-height: 150px; gap: 16px;
        }
        .kit-asset-info {
          padding: 18px 20px 20px; display: flex; flex-direction: column; gap: 4px;
          border-top: 1px solid #E5DED2;
        }
        .kit-chip {
          font-family: var(--font-geist-mono, ui-monospace, monospace);
          font-size: 12px; color: #56291B; background: #F4F0EA;
          border: 1px solid #E5DED2; padding: 7px 13px; border-radius: 999px;
        }
        .kit-note {
          font-size: 13.5px; color: #847A6F;
          font-family: var(--font-geist-mono, ui-monospace, monospace);
          background: #F4F0EA; border: 1px solid #E5DED2; border-radius: 10px;
          padding: 14px 18px; margin-top: 26px; line-height: 1.6;
        }
        .kit-dl-link {
          display: inline-flex; align-items: center; gap: 7px; text-decoration: none;
          background: #2A1E16; color: #FBF6F0; font-size: 13.5px; font-weight: 500;
          padding: 9px 15px; border-radius: 9px; margin-right: 8px; transition: filter .15s;
        }
        .kit-dl-link:hover { filter: brightness(1.15); }
        @media(max-width: 720px){
          .kit-grid { grid-template-columns: 1fr; }
          .kit-hero-h1 { font-size: 42px !important; }
          .yt-head { flex-wrap: wrap; }
          .ig-top { flex-wrap: wrap; }
          .pill-btn { margin-left: 0 !important; }
        }
      `}</style>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <header style={{ padding: "88px 0 40px" }}>
        <div className="kit-wrap">
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 40 }}>
            <Image src="/brand/formatio-symbol.svg" alt="Formattio" width={34} height={34} style={{ height: 34, width: "auto" }} />
            <span style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-.015em" }}>Formattio</span>
          </div>
          <p style={{
            fontFamily: "var(--font-geist-mono, ui-monospace, monospace)",
            fontSize: 13, letterSpacing: ".42em", textTransform: "uppercase",
            color: "#B25433", fontWeight: 500, margin: "0 0 22px",
          }}>
            Kit de Redes Sociais · Identidade Digital
          </p>
          <h1 className="kit-hero-h1" style={{
            fontSize: 60, lineHeight: 1.02, letterSpacing: "-.03em",
            fontWeight: 600, margin: "0 0 20px", maxWidth: "14ch",
          }}>
            Perfis sociais, prontos para publicar.
          </h1>
          <p style={{ fontSize: 19, color: "#5C4F44", maxWidth: "60ch", margin: 0, lineHeight: 1.55 }}>
            Todos os recursos visuais necessários para criar e padronizar os perfis da Formattio no
            YouTube, Instagram e LinkedIn — exportados nas dimensões exatas de cada plataforma,
            a partir do sistema de marca.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 34 }}>
            {["8 arquivos PNG", "Dimensões nativas", "Geist · Argila #B25433", "YouTube · Instagram · LinkedIn"].map((t) => (
              <span key={t} className="kit-chip">{t}</span>
            ))}
          </div>
        </div>
      </header>

      {/* ── 01 YOUTUBE ────────────────────────────────────────── */}
      <section className="kit-section">
        <div className="kit-wrap">
          <SectionHead num="01" title="YouTube" sub="Ícone do canal + arte de banner com área segura central." />

          <div className="kit-mock">
            <MockBar url="youtube.com/@formattio" />
            <div style={{ aspectRatio: "6.2/1", overflow: "hidden", background: "#FBF8F4" }}>
              <Image
                src="/social/youtube-banner.png"
                alt="Banner YouTube"
                width={2560} height={413}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
              />
            </div>
            <div style={{ display: "flex", gap: 24, alignItems: "center", padding: "26px 30px 30px" }}>
              <Image
                src="/social/youtube-avatar.png" alt="Avatar"
                width={128} height={128}
                style={{ width: 128, height: 128, borderRadius: "50%", flexShrink: 0,
                  boxShadow: "0 4px 6px -1px rgb(20 12 8/.08),0 2px 4px -2px rgb(20 12 8/.06)" }}
                className="yt-head"
              />
              <div className="yt-head">
                <h3 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-.02em", margin: "0 0 4px" }}>Formattio</h3>
                <p style={{ color: "#847A6F", fontSize: 15, margin: "0 0 4px" }}>@formattio</p>
                <p style={{ color: "#847A6F", fontSize: 14, margin: 0 }}>Plataforma de gestão formativa · comunidades católicas</p>
              </div>
              <button className="pill-btn" style={{
                marginLeft: "auto", background: "#B25433", color: "#FBF6F0",
                border: "none", fontWeight: 500, fontSize: 15,
                padding: "11px 22px", borderRadius: 999, alignSelf: "center", cursor: "default",
              }}>
                Inscrever-se
              </button>
            </div>
          </div>

          <div className="kit-grid">
            <AssetCard
              imgSrc="/social/youtube-avatar.png"
              imgCircle
              imgSize={140}
              name="Ícone do canal"
              dims="800 × 800 px · 1:1"
              usage="Foto de perfil. Exibida em círculo — símbolo centralizado com margem de segurança."
              file="youtube-avatar.png"
              href="/social/youtube-avatar.png"
              dlLabel="↓ Baixar PNG"
            />
            <AssetCard
              imgSrc="/social/youtube-banner.png"
              imgStyle={{ maxHeight: 120 }}
              name="Arte do banner"
              dims="2560 × 1440 px · área segura 1546 × 423"
              usage="Todo o texto e o logo ficam na faixa central, visível em TV, desktop e celular."
              file="youtube-banner.png"
              href="/social/youtube-banner.png"
              dlLabel="↓ Baixar PNG"
            />
          </div>
        </div>
      </section>

      {/* ── 02 INSTAGRAM ──────────────────────────────────────── */}
      <section className="kit-section">
        <div className="kit-wrap">
          <SectionHead num="02" title="Instagram" sub="Foto de perfil + capas de destaques (highlights)." />

          <div className="kit-mock" style={{ maxWidth: 680 }}>
            <MockBar url="instagram.com/formattio" />
            <div style={{ padding: "30px 34px 26px" }}>
              <div className="ig-top" style={{ display: "flex", gap: 42, alignItems: "center", marginBottom: 22 }}>
                <Image
                  src="/social/instagram-avatar.png" alt="Foto de perfil"
                  width={124} height={124}
                  style={{ width: 124, height: 124, borderRadius: "50%", flexShrink: 0,
                    boxShadow: "0 0 0 4px #fff,0 0 0 6px #E8B894" }}
                />
                <div style={{ display: "flex", gap: 38 }}>
                  {[["128", "posts"], ["4,7k", "seguidores"], ["312", "seguindo"]].map(([n, l]) => (
                    <div key={l}>
                      <b style={{ fontSize: 21, fontWeight: 600, display: "block", letterSpacing: "-.01em" }}>{n}</b>
                      <span style={{ fontSize: 14, color: "#847A6F" }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 3px" }}>Formattio</h3>
                <p style={{
                  color: "#B25433", fontSize: 14, margin: "0 0 8px",
                  fontFamily: "var(--font-geist-mono, ui-monospace, monospace)",
                }}>@formattio</p>
                <p style={{ margin: 0, fontSize: 15, color: "#5C4F44", maxWidth: "52ch" }}>
                  Plataforma de gestão formativa para comunidades católicas brasileiras.
                  Tecnologia, gestão e confiança para o caminho formativo. ✦
                </p>
              </div>
              <div style={{ display: "flex", gap: 30, marginTop: 28, paddingTop: 8 }}>
                {[
                  { src: "/social/instagram-highlight-simbolo.png", label: "Sobre" },
                  { src: "/social/instagram-highlight-clay.png", label: "Formação" },
                  { src: "/social/instagram-highlight-trilha.png", label: "Plataforma" },
                ].map(({ src, label }) => (
                  <figure key={label} style={{ margin: 0, textAlign: "center" }}>
                    <Image
                      src={src} alt={label} width={76} height={76}
                      style={{ width: 76, height: 76, borderRadius: "50%",
                        border: "1px solid #E5DED2", padding: 3, background: "#fff" }}
                    />
                    <figcaption style={{ fontSize: 12, color: "#847A6F", marginTop: 8 }}>{label}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>

          <div className="kit-grid">
            <AssetCard
              imgSrc="/social/instagram-avatar.png"
              imgCircle
              imgSize={140}
              name="Foto de perfil"
              dims="1080 × 1080 px · 1:1"
              usage="Mesmo ícone do YouTube/LinkedIn em alta resolução. Exibido em círculo."
              file="instagram-avatar.png"
              href="/social/instagram-avatar.png"
              dlLabel="↓ Baixar PNG"
            />
            <div className="kit-asset">
              <div className="kit-asset-prev">
                {[
                  { src: "/social/instagram-highlight-simbolo.png", label: "Símbolo" },
                  { src: "/social/instagram-highlight-clay.png", label: "Argila" },
                  { src: "/social/instagram-highlight-trilha.png", label: "Trilha" },
                ].map(({ src, label }) => (
                  <Image key={label} src={src} alt={label} width={78} height={78}
                    style={{ width: 78, height: 78, borderRadius: "50%",
                      boxShadow: "0 4px 6px -1px rgb(20 12 8/.08),0 2px 4px -2px rgb(20 12 8/.06)" }}
                  />
                ))}
              </div>
              <div className="kit-asset-info">
                <span style={{ fontWeight: 600, fontSize: 16, letterSpacing: "-.01em" }}>Capas de destaques · 3 variações</span>
                <span style={{ fontFamily: "var(--font-geist-mono, ui-monospace, monospace)", fontSize: 12.5, color: "#B25433" }}>
                  1080 × 1080 px · 1:1
                </span>
                <span style={{ fontSize: 13.5, color: "#847A6F", marginTop: 2 }}>
                  Símbolo (claro), símbolo (argila) e trilha. Combine livremente entre as categorias.
                </span>
                <span style={{ fontFamily: "var(--font-geist-mono, ui-monospace, monospace)", fontSize: 11.5, color: "#A89D90", marginTop: 2 }}>
                  instagram-highlight-&#123;simbolo,clay,trilha&#125;.png
                </span>
                <div style={{ marginTop: 14 }}>
                  {[
                    { href: "/social/instagram-highlight-simbolo.png", label: "↓ Símbolo" },
                    { href: "/social/instagram-highlight-clay.png", label: "↓ Argila" },
                    { href: "/social/instagram-highlight-trilha.png", label: "↓ Trilha" },
                  ].map(({ href, label }) => (
                    <a key={label} className="kit-dl-link" href={href} download>{label}</a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 03 LINKEDIN ───────────────────────────────────────── */}
      <section className="kit-section">
        <div className="kit-wrap">
          <SectionHead num="03" title="LinkedIn" sub="Logo da página + imagem de capa da empresa." />

          <div className="kit-mock">
            <MockBar url="linkedin.com/company/formattio" />
            <div style={{ aspectRatio: "1128/280", overflow: "hidden", background: "#FBF8F4" }}>
              <Image
                src="/social/linkedin-cover.png" alt="Capa LinkedIn"
                width={1128} height={280}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
              />
            </div>
            <div style={{ padding: "0 34px 30px", position: "relative" }}>
              <Image
                src="/social/linkedin-logo.png" alt="Logo"
                width={118} height={118}
                style={{ width: 118, height: 118, borderRadius: 18, border: "4px solid #fff",
                  marginTop: -58, boxShadow: "0 4px 6px -1px rgb(20 12 8/.08),0 2px 4px -2px rgb(20 12 8/.06)",
                  position: "relative" }}
              />
              <h3 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.02em", margin: "18px 0 5px" }}>Formattio</h3>
              <p style={{ fontSize: 16, color: "#5C4F44", margin: "0 0 6px" }}>
                Plataforma de gestão formativa para comunidades católicas brasileiras
              </p>
              <p style={{ fontSize: 14, color: "#847A6F", margin: 0 }}>
                Software · Educação · Brasil · 2–10 funcionários
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                <button style={{
                  background: "#B25433", color: "#FBF6F0", border: "none",
                  fontWeight: 500, fontSize: 15, padding: "9px 20px", borderRadius: 999, cursor: "default",
                }}>+ Seguir</button>
                <button style={{
                  background: "#fff", color: "#B25433", boxShadow: "inset 0 0 0 1.5px #B25433",
                  border: "none", fontWeight: 500, fontSize: 15, padding: "9px 20px", borderRadius: 999, cursor: "default",
                }}>Visitar site</button>
              </div>
            </div>
          </div>

          <div className="kit-grid">
            <AssetCard
              imgSrc="/social/linkedin-logo.png"
              imgStyle={{ width: 128, height: 128, borderRadius: 18 }}
              name="Logo da página"
              dims="400 × 400 px · 1:1"
              usage="Exibido em quadrado arredondado. Mesmo ícone de marca, fundo argila."
              file="linkedin-logo.png"
              href="/social/linkedin-logo.png"
              dlLabel="↓ Baixar PNG"
            />
            <AssetCard
              imgSrc="/social/linkedin-cover.png"
              imgStyle={{ maxHeight: 110 }}
              name="Imagem de capa"
              dims="1128 × 376 px · 3:1"
              usage="Banner da página da empresa. Logo e texto alinhados à esquerda."
              file="linkedin-cover.png"
              href="/social/linkedin-cover.png"
              dlLabel="↓ Baixar PNG"
            />
          </div>

          <p className="kit-note">
            <b style={{ color: "#56291B" }}>Como usar.</b> Cada arquivo já está na dimensão nativa da
            plataforma — basta enviar sem recortar. Avatares são idênticos entre as três redes (um único
            ícone, várias resoluções) para garantir reconhecimento. Pasta de origem:{" "}
            <b style={{ color: "#56291B" }}>/public/social/</b>.
          </p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer style={{ padding: "60px 0 90px", borderTop: "1px solid #E5DED2", color: "#847A6F", fontSize: 13 }}>
        <div className="kit-wrap">
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
            <Image src="/brand/formatio-symbol.svg" alt="" width={24} height={24} style={{ height: 24, width: "auto" }} />
            <strong style={{ color: "#2A1E16" }}>Formattio</strong>
          </div>
          <p style={{ margin: "0 0 8px" }}>Kit de Redes Sociais · Gerado a partir do Design System Formattio.</p>
          <Link href="/" style={{ color: "#B25433", textDecoration: "none", fontSize: 13 }}>
            ← Voltar para o site
          </Link>
        </div>
      </footer>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function MockBar({ url }: { url: string }) {
  return (
    <div className="kit-mock-bar">
      <span className="kit-dot" style={{ background: "#E25A4A" }} />
      <span className="kit-dot" style={{ background: "#DDA259" }} />
      <span className="kit-dot" style={{ background: "#5BAE76" }} />
      <span className="kit-url">{url}</span>
    </div>
  );
}

function SectionHead({ num, title, sub }: { num: string; title: string; sub: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 36 }}>
      <span style={{
        fontFamily: "var(--font-geist-mono, ui-monospace, monospace)",
        fontSize: 13, color: "#B25433", letterSpacing: ".1em", paddingTop: 6,
      }}>
        {num}
      </span>
      <div>
        <h2 style={{ fontSize: 34, letterSpacing: "-.02em", fontWeight: 600, margin: 0 }}>{title}</h2>
        <p style={{ fontSize: 15, color: "#847A6F", margin: "6px 0 0" }}>{sub}</p>
      </div>
    </div>
  );
}

function AssetCard({
  imgSrc, imgCircle, imgSize, imgStyle,
  name, dims, usage, file, href, dlLabel,
}: {
  imgSrc: string;
  imgCircle?: boolean;
  imgSize?: number;
  imgStyle?: React.CSSProperties;
  name: string;
  dims: string;
  usage: string;
  file: string;
  href: string;
  dlLabel: string;
}) {
  const size = imgSize ?? 200;
  return (
    <div className="kit-asset">
      <div className="kit-asset-prev">
        <Image
          src={imgSrc} alt={name} width={size} height={size}
          style={{
            borderRadius: imgCircle ? "50%" : 4,
            boxShadow: "0 4px 6px -1px rgb(20 12 8/.08),0 2px 4px -2px rgb(20 12 8/.06)",
            maxHeight: 200,
            ...imgStyle,
          }}
        />
      </div>
      <div className="kit-asset-info">
        <span style={{ fontWeight: 600, fontSize: 16, letterSpacing: "-.01em" }}>{name}</span>
        <span style={{ fontFamily: "var(--font-geist-mono, ui-monospace, monospace)", fontSize: 12.5, color: "#B25433" }}>
          {dims}
        </span>
        <span style={{ fontSize: 13.5, color: "#847A6F", marginTop: 2 }}>{usage}</span>
        <span style={{ fontFamily: "var(--font-geist-mono, ui-monospace, monospace)", fontSize: 11.5, color: "#A89D90", marginTop: 2 }}>
          {file}
        </span>
        <div style={{ marginTop: 14 }}>
          <a className="kit-dl-link" href={href} download>{dlLabel}</a>
        </div>
      </div>
    </div>
  );
}
