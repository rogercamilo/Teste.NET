"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileText } from "lucide-react";

interface ViewerClientProps {
  id: string;
  nome: string;
  origem: string;
}

function dataUrlToBlobUrl(dataUrl: string): string {
  try {
    const [header, base64] = dataUrl.split(",");
    const mimeMatch = header.match(/:(.*?);/);
    if (!mimeMatch || !base64) return dataUrl;
    const mimeType = mimeMatch[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch {
    return dataUrl;
  }
}

export default function ViewerClient({ id, nome, origem }: ViewerClientProps) {
  const router = useRouter();
  const [blobUrl, setBlobUrl] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [notFound, setNotFound] = useState(false);

  const isPdf =
    dataUrl.includes("application/pdf") || nome.toLowerCase().endsWith(".pdf");

  useEffect(() => {
    const stored = localStorage.getItem(`doc_${id}`);
    if (!stored) {
      setNotFound(true);
      return;
    }
    setDataUrl(stored);
    const url = dataUrlToBlobUrl(stored);
    setBlobUrl(url);
    return () => {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    };
  }, [id]);

  function handleDownload() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = nome;
    a.click();
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => router.push(origem)}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="h-4 w-px bg-border" />
        <FileText className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-medium flex-1 truncate">{nome}</span>
        {!notFound && (
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5" />
            Baixar
          </Button>
        )}
      </div>

      {notFound ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
          <FileText className="h-16 w-16 text-muted-foreground/20" />
          <div>
            <p className="font-medium text-foreground">Documento não disponível</p>
            <p className="text-sm text-muted-foreground mt-1">
              O arquivo não foi encontrado. Pode ter sido removido ou a sessão foi reiniciada.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push(origem)}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Voltar
          </Button>
        </div>
      ) : isPdf && blobUrl ? (
        <iframe src={blobUrl} className="flex-1 w-full border-0" title={nome} />
      ) : blobUrl ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
          <FileText className="h-16 w-16 text-muted-foreground/30" />
          <div>
            <p className="font-medium text-foreground">{nome}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Pré-visualização não disponível para este formato.
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Faça o download para abrir o arquivo.
            </p>
          </div>
          <Button onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" />
            Baixar arquivo
          </Button>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Carregando documento...</p>
        </div>
      )}
    </div>
  );
}
