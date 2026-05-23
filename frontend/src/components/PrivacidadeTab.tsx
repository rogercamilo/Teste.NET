"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Download, FileJson, AlertTriangle, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Props {
  userEmail: string;
  isAdmin: boolean;
}

export default function PrivacidadeTab({ userEmail, isAdmin }: Props) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [emailConfirmacao, setEmailConfirmacao] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [downloadingUser, setDownloadingUser] = useState(false);
  const [downloadingOrg, setDownloadingOrg] = useState(false);

  async function handleDownloadMeusDados() {
    setDownloadingUser(true);
    try {
      const res = await fetch("/api/export/meus-dados");
      if (!res.ok) { toast.error("Erro ao exportar dados"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Dados exportados com sucesso");
    } catch {
      toast.error("Falha ao exportar dados");
    } finally {
      setDownloadingUser(false);
    }
  }

  async function handleDownloadOrg() {
    setDownloadingOrg(true);
    try {
      const res = await fetch("/api/export/organizacao");
      if (!res.ok) { toast.error("Erro ao exportar dados da organização"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dados-organizacao-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Dados da organização exportados");
    } catch {
      toast.error("Falha ao exportar dados da organização");
    } finally {
      setDownloadingOrg(false);
    }
  }

  async function handleExcluirConta() {
    if (emailConfirmacao.toLowerCase().trim() !== userEmail.toLowerCase()) {
      toast.error("O e-mail digitado não confere com o da sua conta");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/conta/excluir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailConfirmacao }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Erro ao excluir conta"); setDeleting(false); return; }
      toast.success("Conta encerrada. Você será desconectado.");
      setTimeout(() => signOut({ callbackUrl: "/login" }), 1500);
    } catch {
      toast.error("Falha de conexão");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Seus dados */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Seus dados pessoais</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Em conformidade com a LGPD, você pode baixar uma cópia completa dos seus dados a qualquer momento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border bg-muted/30">
            <div>
              <p className="text-sm font-medium">Meus dados</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Perfil, histórico de acessos, aceites legais e preferências de cookies.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1.5 h-8 text-xs"
              onClick={handleDownloadMeusDados}
              disabled={downloadingUser}
            >
              {downloadingUser
                ? <span className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
                : <Download className="h-3.5 w-3.5" />
              }
              Baixar JSON
            </Button>
          </div>

          {isAdmin && (
            <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border bg-muted/30">
              <div>
                <p className="text-sm font-medium">Dados da organização</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Todos os formandos, moradas, formações, presenças e históricos. Somente administradores.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5 h-8 text-xs"
                onClick={handleDownloadOrg}
                disabled={downloadingOrg}
              >
                {downloadingOrg
                  ? <span className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
                  : <FileJson className="h-3.5 w-3.5" />
                }
                Baixar JSON
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Acesse nossa{" "}
            <Link href="/privacidade" target="_blank" className="text-primary hover:underline">
              Política de Privacidade
            </Link>{" "}
            e os{" "}
            <Link href="/termos" target="_blank" className="text-primary hover:underline">
              Termos de Uso
            </Link>{" "}
            para mais informações sobre como tratamos seus dados.
          </p>
        </CardContent>
      </Card>

      <Separator />

      {/* Zona de perigo */}
      <Card className="border-destructive/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <CardTitle className="text-base text-destructive">Zona de perigo</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Ações irreversíveis. Prossiga com cautela.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
            <div>
              <p className="text-sm font-medium">Excluir minha conta</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Seus dados pessoais serão anonimizados imediatamente. Esta ação não pode ser desfeita.
              </p>
            </div>
            <Button
              size="sm"
              variant="destructive"
              className="shrink-0 gap-1.5 h-8 text-xs"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir conta
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmação */}
      <Dialog open={showDeleteDialog} onOpenChange={(o) => { if (!deleting) { setShowDeleteDialog(o); setEmailConfirmacao(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar exclusão de conta
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Esta ação é <strong>permanente e irreversível</strong>. Seus dados pessoais serão anonimizados imediatamente.
            </p>
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-1">
              <p>• Nome alterado para "Usuário Removido"</p>
              <p>• E-mail substituído por hash anônimo</p>
              <p>• Sessão encerrada imediatamente</p>
              <p>• Logs de auditoria mantidos por 12 meses (obrigação legal)</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Digite seu e-mail <strong>{userEmail}</strong> para confirmar:
              </Label>
              <Input
                type="email"
                placeholder={userEmail}
                value={emailConfirmacao}
                onChange={(e) => setEmailConfirmacao(e.target.value)}
                className="h-9 text-sm"
                disabled={deleting}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleExcluirConta}
              disabled={deleting || emailConfirmacao.toLowerCase().trim() !== userEmail.toLowerCase()}
            >
              {deleting
                ? <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Excluindo...
                  </span>
                : "Confirmar exclusão"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
