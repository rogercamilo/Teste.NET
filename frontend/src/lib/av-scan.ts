import "server-only";

/**
 * Filtro heurístico/estrutural de malware para uploads — função de servidor.
 *
 * NÃO é um antivírus de assinatura. É uma camada barata (in-process, sem infra,
 * sem dado saindo) que rejeita os vetores de ataque mais comuns embutidos em
 * documentos aceitos pela plataforma:
 *   - Macros VBA em DOCX/DOC (o vetor de malware de Office mais comum)
 *   - Conteúdo ativo em PDF (JavaScript / Launch)
 *   - A string de teste EICAR (padrão de indústria — permite testar o pipeline)
 *
 * Roda DEPOIS da validação de magic bytes (`assinaturaConfere`) e ANTES de
 * persistir (`uploadFile`). Limitação conhecida: não detecta malware novo/ofuscado
 * nem conteúdo comprimido/cifrado dentro do arquivo — para isso é preciso um engine
 * real (ver "Seam para engine externo" abaixo).
 *
 * ── Seam para engine externo (ClamAV / Kaspersky Scan Engine) ──────────────────
 * Quando houver infra para um daemon de AV, plugue-o aqui SEM tocar nas rotas:
 * se `process.env.AV_SCAN_HOST` estiver setado, `scanUpload` deve encaminhar o
 * buffer para o serviço (ex.: clamd INSTREAM via TCP, ou ICAP/REST) e usar o
 * veredito dele; em falha do serviço, cai de volta na heurística (fail-safe).
 * O ponto de extensão está marcado em `scanUpload`.
 */

export type ScanResult = { clean: true } | { clean: false; reason: string };

// String de teste EICAR (inofensiva, reconhecida por todos os AVs). Montada em
// pedaços para o próprio arquivo-fonte não ser sinalizado por scanners.
const EICAR = ["X5O!P%@AP[4\\PZX54(P^)7CC)7}", "$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"].join("");

function contains(buf: Buffer, needle: string): boolean {
  return buf.includes(Buffer.from(needle, "latin1"));
}

/**
 * Varredura heurística pura (sem I/O). Exportada para teste direto.
 * @param buffer  conteúdo do arquivo
 * @param mime    MIME já validado por magic bytes
 */
export function heuristicScan(buffer: Buffer, mime: string): ScanResult {
  // 1) EICAR — qualquer tipo de arquivo.
  if (contains(buffer, EICAR)) {
    return { clean: false, reason: "assinatura de teste EICAR detectada" };
  }

  // 2) Macros VBA em documentos do Office.
  const isOoxml = mime.includes("openxmlformats");
  const isLegacyDoc = mime === "application/msword";
  if (isOoxml || isLegacyDoc) {
    // DOCX/DOCM (container ZIP) guardam a macro na parte `vbaProject.bin` — o nome
    // aparece em texto claro no cabeçalho local do ZIP, sem precisar descompactar.
    if (contains(buffer, "vbaProject.bin")) {
      return { clean: false, reason: "macro VBA detectada em documento Office (vbaProject.bin)" };
    }
    // DOC legado (OLE2) guarda a macro em streams `_VBA_PROJECT` / `VBA`.
    if (contains(buffer, "_VBA_PROJECT")) {
      return { clean: false, reason: "macro VBA detectada em documento Office (stream OLE)" };
    }
  }

  // 3) Conteúdo ativo em PDF — vetor de malware; documento de formação nunca precisa.
  //    Tokens de alto sinal e baixíssimo falso-positivo em PDFs de documento.
  if (mime === "application/pdf") {
    for (const token of ["/JavaScript", "/JS", "/Launch"]) {
      if (contains(buffer, token)) {
        return { clean: false, reason: `PDF com conteúdo ativo (${token})` };
      }
    }
  }

  return { clean: true };
}

/**
 * Ponto de entrada usado pelas rotas de upload. Assíncrono para acomodar um engine
 * externo no futuro (ver seam no topo). Hoje delega à heurística in-process.
 */
export async function scanUpload(buffer: Buffer, mime: string): Promise<ScanResult> {
  // ── Seam: engine externo (desativado enquanto AV_SCAN_HOST não estiver setado) ──
  // if (process.env.AV_SCAN_HOST) {
  //   try { return await externalEngineScan(buffer); }
  //   catch { /* serviço indisponível → cai na heurística (fail-safe) */ }
  // }
  return heuristicScan(buffer, mime);
}
