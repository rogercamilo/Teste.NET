"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 5;

interface Admin { id: string; nome: string; email: string }
interface Org   { id: string; nome: string; status: string }

interface ResetResult {
  senhaTemporaria: string;
  usuario: { nome: string; email: string };
}

function initials(nome: string) {
  return nome.split(" ").slice(0, 2).map((n) => n[0] ?? "").join("").toUpperCase();
}

export default function ResetCredenciaisClient({ org, admins }: { org: Org; admins: Admin[] }) {
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResetResult | null>(null);

  const paged = admins.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleSubmit() {
    if (!selectedId || justificativa.trim().length < 10) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/organizacoes/${org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "reset-credenciais",
          usuarioId: selectedId,
          justificativa: justificativa.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        toast.error(data.error ?? "Falha ao resetar credenciais.");
        return;
      }
      const data = await res.json() as { usuarios: { nome: string; email: string }[]; senhaTemporaria: string };
      setResult({ senhaTemporaria: data.senhaTemporaria, usuario: data.usuarios[0] });
    } catch {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  // ── Estado de sucesso ────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="max-w-xl mx-auto space-y-6 py-2">
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800">Acesso resetado com sucesso</p>
            <p className="text-sm text-emerald-700 mt-0.5">
              {result.usuario.nome} · {result.usuario.email}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 space-y-3">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Senha Temporária</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-base font-bold tracking-widest text-amber-900 bg-white border border-amber-200 rounded px-3 py-2.5 select-all">
              {result.senhaTemporaria}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigator.clipboard.writeText(result.senhaTemporaria).then(() =>
                  toast.success("Senha copiada!")
                )
              }
            >
              <Copy className="h-4 w-4 mr-1.5" />Copiar
            </Button>
          </div>
          <p className="text-xs font-medium text-amber-700">
            ⚠ Guarde esta senha agora — ela não será exibida novamente.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          Um e-mail de notificação foi enviado ao administrador. O próximo acesso exigirá troca imediata de senha.
        </p>

        <Link href="/super-admin">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />Voltar ao Super Admin
          </Button>
        </Link>
      </div>
    );
  }

  // ── Formulário ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto space-y-6 py-2">

      {/* Header */}
      <div>
        <Link
          href="/super-admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />Voltar ao Super Admin
        </Link>
        <h1 className="text-base font-semibold flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-amber-600" />
          Reset de Credenciais
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Organização: <strong>{org.nome}</strong>
        </p>
      </div>

      {/* Aviso */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <p className="font-medium mb-1">O que será feito:</p>
        <ul className="list-disc list-inside space-y-0.5 text-amber-700 text-xs">
          <li>Uma senha temporária será gerada para o administrador selecionado</li>
          <li>O acesso será bloqueado até a troca de senha no próximo login</li>
          <li>Um e-mail de notificação será enviado ao administrador</li>
          <li>Esta ação ficará registrada no log de auditoria</li>
        </ul>
      </div>

      {/* Gridlist de admins */}
      <div className="space-y-3">
        <p className="text-sm font-medium">
          Administrador <span className="text-destructive">*</span>
        </p>

        {admins.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Nenhum administrador ativo encontrado nesta organização.
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {paged.map((admin) => (
                <button
                  key={admin.id}
                  type="button"
                  onClick={() => setSelectedId(admin.id === selectedId ? "" : admin.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors",
                    selectedId === admin.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/30 hover:bg-muted/40"
                  )}
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center shrink-0 select-none">
                    {initials(admin.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{admin.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                  </div>
                  {selectedId === admin.id && (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {admins.length > PAGE_SIZE && (
              <Pagination
                total={admins.length}
                page={page}
                pageSize={PAGE_SIZE}
                onPageChange={(p) => { setPage(p); setSelectedId(""); }}
              />
            )}
          </>
        )}
      </div>

      {/* Justificativa */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Justificativa <span className="text-destructive">*</span>
          <span className="text-muted-foreground font-normal ml-1">(mínimo 10 caracteres)</span>
        </label>
        <textarea
          className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          rows={3}
          placeholder="Ex: Solicitação via chamado #123 — admin sem acesso após troca de dispositivo"
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
        />
        <p className="text-xs text-muted-foreground text-right">
          {justificativa.trim().length}/10 mínimo
        </p>
      </div>

      {/* Ações */}
      <div className="flex items-center justify-between pt-1">
        <Link href="/super-admin">
          <Button variant="outline">Cancelar</Button>
        </Link>
        <Button
          className="bg-amber-600 hover:bg-amber-700 text-white"
          disabled={!selectedId || justificativa.trim().length < 10 || loading}
          onClick={handleSubmit}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Processando...
            </span>
          ) : (
            <>
              <KeyRound className="h-4 w-4 mr-1.5" />Resetar acesso
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
