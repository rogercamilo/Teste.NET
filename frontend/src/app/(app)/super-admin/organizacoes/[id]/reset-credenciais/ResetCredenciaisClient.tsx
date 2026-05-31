"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, CheckCircle2, Copy, Users } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="space-y-5 animate-in-fast">
        <div>
          <h1 className="text-base font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-amber-600" />
            Reset de Credenciais
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organização: <strong>{org.nome}</strong>
          </p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 px-4 pb-4 space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Acesso resetado com sucesso</p>
                <p className="text-xs text-emerald-700 mt-0.5 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  {result.usuario.nome} · {result.usuario.email}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2.5">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Senha Temporária</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm font-bold tracking-widest text-amber-900 bg-white border border-amber-200 rounded px-3 py-2 select-all">
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

            <p className="text-xs text-muted-foreground">
              Um e-mail de notificação foi enviado ao administrador. O próximo acesso exigirá troca imediata de senha.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Link
            href="/super-admin"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <ArrowLeft className="h-4 w-4" />Voltar ao Super Admin
          </Link>
        </div>
      </div>
    );
  }

  // ── Formulário ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-in-fast">

      {/* Header */}
      <div>
        <Link
          href="/super-admin"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-3 -ml-1 text-muted-foreground")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />Super Admin
        </Link>
        <h1 className="text-base font-semibold flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-amber-600" />
          Reset de Credenciais
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Organização: <strong>{org.nome}</strong>
        </p>
      </div>

      {/* Aviso */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
        <p className="text-xs font-medium mb-1">O que será feito:</p>
        <ul className="list-disc list-inside space-y-0.5 text-amber-700 text-xs">
          <li>Uma senha temporária será gerada para o administrador selecionado</li>
          <li>O acesso será bloqueado até a troca de senha no próximo login</li>
          <li>Um e-mail de notificação será enviado ao administrador</li>
          <li>Esta ação ficará registrada no log de auditoria</li>
        </ul>
      </div>

      {/* Gridlist de admins */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">
            Administrador <span className="text-destructive">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {admins.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              Nenhum administrador ativo encontrado nesta organização.
            </div>
          ) : (
            <>
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

              {admins.length > PAGE_SIZE && (
                <div className="pt-1">
                  <Pagination
                    total={admins.length}
                    page={page}
                    pageSize={PAGE_SIZE}
                    onPageChange={(p) => { setPage(p); setSelectedId(""); }}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Justificativa */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">
            Justificativa <span className="text-destructive">*</span>
            <span className="text-muted-foreground font-normal ml-1 text-xs">(mínimo 10 caracteres)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <textarea
            className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            rows={3}
            placeholder="Ex: Solicitação via chamado #123 — admin sem acesso após troca de dispositivo"
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
          />
          <p className="text-xs text-muted-foreground text-right mt-1">
            {justificativa.trim().length}/10 mínimo
          </p>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex items-center justify-between">
        <Link
          href="/super-admin"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Cancelar
        </Link>
        <Button
          size="sm"
          className="bg-amber-600 hover:bg-amber-700 text-white"
          disabled={!selectedId || justificativa.trim().length < 10 || loading}
          onClick={handleSubmit}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Processando...
            </span>
          ) : (
            <>
              <KeyRound className="h-3.5 w-3.5 mr-1.5" />Resetar acesso
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
