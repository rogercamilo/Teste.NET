/**
 * Busca um endpoint de exportação e dispara o download do arquivo no navegador.
 * Retorna `true` em sucesso e `false` se a resposta não for OK (HTTP >= 400).
 * Erros de rede propagam — trate com try/catch no chamador.
 */
export async function downloadJsonExport(url: string, filename: string): Promise<boolean> {
  const res = await fetch(url);
  if (!res.ok) return false;
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
  return true;
}
