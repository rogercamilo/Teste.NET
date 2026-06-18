"use client";

import { useState, useRef, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImageIcon, Upload, X } from "lucide-react";
import { toast } from "sonner";

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Chamado após o crop com a key R2 (quando uploadEndpoint for fornecido)
   * ou com o data URL base64 (quando não for).
   */
  onSave: (imageData: string) => void;
  /** Chamado quando o usuário remove a imagem existente */
  onRemove?: () => void;
  /** Se já existe uma imagem (exibe botão Remover) */
  hasImage?: boolean;
  title?: string;
  /** Tamanho do lado do quadrado exportado em px (padrão 280) */
  outputSize?: number;
  /**
   * Endpoint para upload automático após o crop (ex: "/api/imagens").
   * Quando fornecido, o componente faz POST multipart/form-data e chama
   * onSave com a key retornada pelo servidor.
   * Quando ausente, onSave recebe o data URL base64 diretamente.
   */
  uploadEndpoint?: string;
}

export function ImageCropDialog({
  open,
  onOpenChange,
  onSave,
  onRemove,
  hasImage = false,
  title = "Foto",
  outputSize = 280,
  uploadEndpoint,
}: ImageCropDialogProps) {
  const [imagemSrc, setImagemSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  function processFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são aceitas (PNG, JPG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagemSrc(e.target?.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  }

  async function confirmCrop() {
    if (!imagemSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imagemSrc;
      });
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        outputSize,
        outputSize,
      );

      if (uploadEndpoint) {
        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.82)
        );
        const fd = new FormData();
        fd.append("file", new File([blob], "photo.jpg", { type: "image/jpeg" }));
        const res = await fetch(uploadEndpoint, { method: "POST", body: fd });
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          toast.error(body.error ?? "Erro ao fazer upload da imagem.");
          return;
        }
        const { key } = await res.json() as { key: string };
        onSave(key);
      } else {
        onSave(canvas.toDataURL("image/jpeg", 0.82));
      }

      handleClose();
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setImagemSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    if (inputRef.current) inputRef.current.value = "";
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {imagemSrc ? (
            <>
              <div className="relative h-72 rounded-xl overflow-hidden bg-muted">
                <Cropper
                  image={imagemSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  showGrid={false}
                  style={{ containerStyle: { borderRadius: "12px" } }}
                />
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-muted-foreground shrink-0">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 accent-primary h-1.5"
                />
              </div>
            </>
          ) : (
            <div
              className={`flex flex-col items-center justify-center gap-3 h-48 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border/60 bg-muted/30 hover:bg-muted/60"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) processFile(f);
              }}
              onClick={() => inputRef.current?.click()}
            >
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Clique ou arraste uma imagem</p>
                <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG ou WebP · máx. 5 MB</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) processFile(f);
                }}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <div className="flex gap-2 flex-1">
            {imagemSrc ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setImagemSrc(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Trocar imagem
              </Button>
            ) : hasImage && onRemove ? (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => { onRemove(); handleClose(); }}
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Remover foto
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            {imagemSrc && (
              <Button onClick={confirmCrop} disabled={saving}>
                {saving ? "Salvando..." : "Aplicar"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
