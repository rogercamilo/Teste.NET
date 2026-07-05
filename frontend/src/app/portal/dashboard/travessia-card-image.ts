/**
 * Gera um card quadrado (1080×1080) on-brand para o vocacionado compartilhar sua
 * Travessia de Leitura no Instagram. Desenhado no canvas do cliente e devolvido
 * como PNG (Blob/File), pronto para o `navigator.share({ files })` ou download.
 *
 * Paleta da marca (ver project-brand): clay #B25433. Sem dependências externas —
 * usa fontes do sistema para não bloquear em web fonts no momento do share.
 */

const CLAY = "#B25433";
const CLAY_DARK = "#8f3f26";
const CREAM = "#FBF6F1";

export interface CardTravessiaDados {
  orgNome: string;
  instagramHandle: string | null;
  frutos: number;
  capitulosLidos: number;
  totalCapitulos: number;
}

/** Desenha o card num canvas e resolve com o Blob PNG (null se o canvas falhar). */
export async function gerarCardTravessia(dados: CardTravessiaDados): Promise<Blob | null> {
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Fundo em degradê clay.
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, CLAY);
  grad.addColorStop(1, CLAY_DARK);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Moldura interna creme.
  ctx.strokeStyle = "rgba(251,246,241,0.35)";
  ctx.lineWidth = 4;
  ctx.strokeRect(64, 64, size - 128, size - 128);

  ctx.textAlign = "center";
  const cx = size / 2;

  // Selo/rótulo superior.
  ctx.fillStyle = "rgba(251,246,241,0.85)";
  ctx.font = "600 34px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText("MINHA TRAVESSIA DE LEITURA", cx, 210);

  // Número de Frutos — protagonista.
  ctx.fillStyle = CREAM;
  ctx.font = "700 320px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText(String(dados.frutos), cx, 560);

  ctx.font = "600 52px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText(dados.frutos === 1 ? "Fruto da Travessia" : "Frutos da Travessia", cx, 650);

  // Progresso de leitura.
  ctx.fillStyle = "rgba(251,246,241,0.85)";
  ctx.font = "400 40px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText(
    `${dados.capitulosLidos} de ${dados.totalCapitulos} capítulos lidos`,
    cx,
    740
  );

  // Assinatura: comunidade + @ sugerido.
  ctx.fillStyle = CREAM;
  ctx.font = "600 44px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText(dados.orgNome, cx, 900);
  if (dados.instagramHandle) {
    ctx.fillStyle = "rgba(251,246,241,0.8)";
    ctx.font = "500 38px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.fillText(`@${dados.instagramHandle}`, cx, 960);
  }

  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/** Legenda sugerida para o compartilhamento (copiável no fallback). */
export function legendaTravessia(dados: CardTravessiaDados): string {
  const linhas = [
    `Minha Travessia de Leitura: ${dados.frutos} ${dados.frutos === 1 ? "Fruto" : "Frutos"} colhidos! 🌱`,
    `${dados.capitulosLidos} de ${dados.totalCapitulos} capítulos lidos.`,
  ];
  if (dados.instagramHandle) linhas.push(`Com @${dados.instagramHandle}`);
  return linhas.join("\n");
}
