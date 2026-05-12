"use client";

import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ColumnMapping {
  fileColumn: string;
  systemField: string;
  required: boolean;
}

export interface SystemField {
  key: string;
  label: string;
  required: boolean;
  example?: string;
}

export interface ImportResult {
  success: number;
  errors: { row: number; message: string }[];
}

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  systemFields: SystemField[];
  onImport: (data: Record<string, string>[]) => Promise<ImportResult>;
  templateUrl?: string;
}

type Step = "upload" | "mapping" | "preview" | "importing" | "result";

export function ImportModal({
  open,
  onOpenChange,
  title,
  description,
  systemFields,
  onImport,
}: ImportModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("upload");
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult(null);
  }

  function handleClose() {
    onOpenChange(false);
    setTimeout(reset, 300);
  }

  async function processFile(f: File) {
    setFile(f);
    const buffer = await f.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

    if (data.length === 0) return;

    const fileHeaders = (data[0] as string[]).map(String);
    const fileRows = data.slice(1, 6).map((r) => (r as string[]).map(String));

    setHeaders(fileHeaders);
    setRows(fileRows);

    // Auto-map columns by similarity
    const autoMap: Record<string, string> = {};
    systemFields.forEach((field) => {
      const match = fileHeaders.find(
        (h) =>
          h.toLowerCase().includes(field.key.toLowerCase()) ||
          field.label.toLowerCase().includes(h.toLowerCase())
      );
      if (match) autoMap[field.key] = match;
    });
    setMapping(autoMap);
    setStep("mapping");
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  }

  async function handleImport() {
    setStep("importing");
    const mappedData = rows.map((row) => {
      const obj: Record<string, string> = {};
      systemFields.forEach((field) => {
        const colName = mapping[field.key];
        if (colName) {
          const colIdx = headers.indexOf(colName);
          obj[field.key] = colIdx >= 0 ? (row[colIdx] ?? "") : "";
        }
      });
      return obj;
    });

    const res = await onImport(mappedData);
    setResult(res);
    setStep("result");
  }

  const requiredMapped = systemFields
    .filter((f) => f.required)
    .every((f) => !!mapping[f.key]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">{title}</DialogTitle>
              {description && (
                <DialogDescription className="text-xs mt-0.5">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1 mt-4">
            {(["upload", "mapping", "preview", "result"] as const).map((s, i) => {
              const labels = ["Upload", "Mapeamento", "Preview", "Resultado"];
              const stepOrder = { upload: 0, mapping: 1, preview: 2, importing: 2, result: 3 };
              const currentIdx = stepOrder[step];
              const isDone = currentIdx > i;
              const isCurrent = currentIdx === i;
              return (
                <div key={s} className="flex items-center gap-1">
                  <div className={cn(
                    "flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md",
                    isDone ? "text-emerald-600" :
                    isCurrent ? "text-primary bg-primary/8" :
                    "text-muted-foreground"
                  )}>
                    {isDone ? <CheckCircle2 className="h-3 w-3" /> : (
                      <span className={cn(
                        "h-4 w-4 rounded-full border text-[10px] font-bold flex items-center justify-center",
                        isCurrent ? "border-primary text-primary" : "border-muted-foreground/40 text-muted-foreground"
                      )}>{i + 1}</span>
                    )}
                    {labels[i]}
                  </div>
                  {i < 3 && <ChevronRight className="h-3 w-3 text-muted-foreground/30" />}
                </div>
              );
            })}
          </div>
        </DialogHeader>

        <div className="p-6">
          {/* STEP 1 — Upload */}
          {step === "upload" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileInput}
              />
              <Upload className={cn("h-10 w-10 mx-auto mb-3", isDragging ? "text-primary" : "text-muted-foreground/40")} />
              <p className="text-sm font-medium text-foreground">
                Arraste o arquivo aqui ou <span className="text-primary">clique para selecionar</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Formatos aceitos: .xlsx, .xls, .csv
              </p>
            </div>
          )}

          {/* STEP 2 — Column Mapping */}
          {step === "mapping" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{file?.name}</p>
                  <p className="text-xs text-muted-foreground">{headers.length} colunas detectadas</p>
                </div>
                <Button variant="ghost" size="sm" onClick={reset} className="h-7 text-xs">
                  <X className="h-3.5 w-3.5 mr-1" />
                  Trocar arquivo
                </Button>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {systemFields.map((field) => (
                  <div key={field.key} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground">{field.label}</span>
                        {field.required && (
                          <span className="text-xs text-red-500 font-medium">*</span>
                        )}
                      </div>
                      {field.example && (
                        <span className="text-xs text-muted-foreground">ex: {field.example}</span>
                      )}
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    <Select
                      value={mapping[field.key] ?? ""}
                      onValueChange={(v) => setMapping((m) => ({ ...m, [field.key]: v ?? "" }))}
                    >
                      <SelectTrigger className="h-8 w-44 text-xs">
                        <SelectValue placeholder="Selecionar coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {!requiredMapped && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg p-2.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Mapeie todos os campos obrigatórios (*) para continuar.
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={reset} className="flex-1">
                  Cancelar
                </Button>
                <Button size="sm" onClick={() => setStep("preview")} disabled={!requiredMapped} className="flex-1">
                  Visualizar Preview
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3 — Preview */}
          {step === "preview" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Prévia dos primeiros {rows.length} registros do arquivo:
              </p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="text-xs w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      {systemFields
                        .filter((f) => mapping[f.key])
                        .map((f) => (
                          <th key={f.key} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">
                            {f.label}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rIdx) => (
                      <tr key={rIdx} className="border-t border-border/60 hover:bg-muted/20">
                        {systemFields
                          .filter((f) => mapping[f.key])
                          .map((f) => {
                            const colIdx = headers.indexOf(mapping[f.key]);
                            return (
                              <td key={f.key} className="px-3 py-1.5 text-foreground whitespace-nowrap max-w-[120px] truncate">
                                {row[colIdx] ?? "—"}
                              </td>
                            );
                          })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setStep("mapping")} className="flex-1">
                  Voltar
                </Button>
                <Button size="sm" onClick={handleImport} className="flex-1">
                  Confirmar Importação
                </Button>
              </div>
            </div>
          )}

          {/* STEP — Importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm font-medium text-foreground">Importando registros...</p>
              <p className="text-xs text-muted-foreground">Aguarde, não feche esta janela.</p>
            </div>
          )}

          {/* STEP 4 — Result */}
          {step === "result" && result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 className="h-7 w-7 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-700">{result.success}</p>
                    <p className="text-xs text-emerald-600">importados com sucesso</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
                  <XCircle className="h-7 w-7 text-red-400 shrink-0" />
                  <div>
                    <p className="text-2xl font-bold text-red-600">{result.errors.length}</p>
                    <p className="text-xs text-red-500">erros encontrados</p>
                  </div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  <p className="text-xs font-medium text-muted-foreground">Inconsistências:</p>
                  {result.errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs bg-red-50 text-red-700 rounded-lg px-3 py-2">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span><strong>Linha {e.row}:</strong> {e.message}</span>
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={handleClose} className="w-full" size="sm">
                Concluir
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
