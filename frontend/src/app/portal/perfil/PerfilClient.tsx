"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Camera, Loader2, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import {
  ESTADO_CIVIL_LABELS,
  NIVEL_FORMATIVO_LABELS,
  NIVEL_FORMATIVO_ICONS,
} from "@/types";
import type { EstadoCivil } from "@/types";
import { applyPhoneMask } from "@/lib/utils";
import type { PublicBranding } from "@/lib/public-branding";
import { portalHomeFor, type PortalAudiencia } from "@/lib/portal-routes";
import type { PortalPerfil } from "@/lib/portal-data";
import { camposFaltantes } from "@/lib/perfil-completude";

const NIVEL_AVATAR_BG: Record<string, string> = {
  "pre-discipulado": "bg-violet-100 text-violet-700",
  discipulado: "bg-blue-100 text-blue-700",
  "primeiras-promessas": "bg-emerald-100 text-emerald-700",
  "formacao-permanente": "bg-amber-100 text-amber-700",
  vocacional: "bg-rose-100 text-rose-700",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function PerfilClient({
  perfil,
  branding,
  audiencia,
}: {
  perfil: PortalPerfil;
  branding: PublicBranding;
  audiencia: PortalAudiencia;
}) {
  const router = useRouter();
  const [savingFoto, startFotoTransition] = useTransition();
  const [fotoDialogOpen, setFotoDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Campos pessoais editáveis — semeados do dado atual.
  const [dataNascimento, setDataNascimento] = useState(perfil.dataNascimento ?? "");
  const [estadoCivil, setEstadoCivil] = useState<EstadoCivil>(perfil.estadoCivil);
  const [telefone, setTelefone] = useState(perfil.telefone ?? "");
  const [nomeSocial, setNomeSocial] = useState(perfil.nomeSocial ?? "");
  const [nacionalidade, setNacionalidade] = useState(perfil.nacionalidade ?? "");
  const [rg, setRg] = useState(perfil.rg ?? "");
  const [orgaoEmissor, setOrgaoEmissor] = useState(perfil.orgaoEmissor ?? "");
  const [cep, setCep] = useState(perfil.cep ?? "");
  const [paroquiaReferencia, setParoquiaReferencia] = useState(perfil.paroquiaReferencia ?? "");
  const [numFilhos, setNumFilhos] = useState(
    perfil.numFilhos != null ? String(perfil.numFilhos) : ""
  );

  const communityName = branding.nomePlataforma ?? branding.nome;
  const portalLabel = audiencia === "vocacional" ? "Portal do Vocacionado" : "Portal do Formando";

  // Completude do cadastro (Fase 3): reflete o estado salvo no servidor (perfil).
  // Após salvar + router.refresh() o aviso se atualiza sozinho.
  const faltantes = camposFaltantes(perfil);

  // A foto salva na hora (PATCH próprio), como no app: o resto do formulário sai
  // no botão "Salvar". Após o upload devolver a key, gravamos e recarregamos para
  // reresolver a URL de preview pelo servidor.
  async function salvarFoto(foto: string | null) {
    const res = await fetch("/api/portal/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foto }),
    });
    if (!res.ok) {
      toast.error("Erro ao salvar a foto.");
      return;
    }
    toast.success(foto ? "Foto atualizada." : "Foto removida.");
    startFotoTransition(() => router.refresh());
  }

  async function handleSalvar() {
    setSaving(true);
    try {
      const res = await fetch("/api/portal/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataNascimento: dataNascimento || null,
          estadoCivil,
          telefone: telefone.trim(),
          nomeSocial: nomeSocial.trim() || null,
          nacionalidade: nacionalidade.trim() || null,
          rg: rg.trim() || null,
          orgaoEmissor: orgaoEmissor.trim() || null,
          cep: cep.trim() || null,
          paroquiaReferencia: paroquiaReferencia.trim() || null,
          numFilhos: numFilhos.trim() === "" ? null : Math.max(0, parseInt(numFilhos, 10) || 0),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "Não foi possível salvar. Tente novamente.");
        return;
      }
      toast.success("Perfil atualizado.");
      router.refresh();
    } catch {
      toast.error("Falha de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header — mesmo padrão do dashboard */}
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={communityName}
                className="h-7 max-w-[120px] object-contain"
              />
            ) : (
              <img src="/brand/formatio-symbol.svg" alt="Formattio" width={28} height={28} />
            )}
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="truncate text-sm font-semibold text-foreground">
                {communityName}
              </span>
              <span className="truncate text-xs text-muted-foreground">{portalLabel}</span>
            </div>
          </div>
          <Link
            href="/portal/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Meu perfil</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mantenha seus dados pessoais atualizados. Quem cuida da sua etapa formativa é o seu
            formador.
          </p>
        </div>

        {/* Aviso de completude — orienta exatamente o que ainda falta. */}
        {faltantes.length > 0 ? (
          <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 text-sm">
              <p className="font-medium text-foreground">
                {faltantes.length === 1
                  ? "Falta 1 dado para completar seu cadastro"
                  : `Faltam ${faltantes.length} dados para completar seu cadastro`}
              </p>
              <p className="mt-0.5 text-muted-foreground">{faltantes.join(", ")}.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-800">
              Seu cadastro está completo. Obrigado!
            </p>
          </div>
        )}

        {/* Foto + identidade (nome/etapa são definidos pelo formador — só leitura) */}
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <button
              type="button"
              onClick={() => setFotoDialogOpen(true)}
              className="relative h-16 w-16 shrink-0 rounded-full group/foto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Alterar foto"
            >
              <Avatar className="h-16 w-16">
                {perfil.fotoUrl && <AvatarImage src={perfil.fotoUrl} alt={perfil.nome} />}
                <AvatarFallback
                  className={`font-semibold ${NIVEL_AVATAR_BG[perfil.nivelFormativo] ?? "bg-muted"}`}
                >
                  {getInitials(perfil.nome)}
                </AvatarFallback>
              </Avatar>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover/foto:opacity-100">
                <Camera className="h-4 w-4 text-white" />
              </span>
              {savingFoto && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </span>
              )}
            </button>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">{perfil.nome}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                <span className="mr-1">{NIVEL_FORMATIVO_ICONS[perfil.nivelFormativo]}</span>
                {NIVEL_FORMATIVO_LABELS[perfil.nivelFormativo]}
                {perfil.grupoNome && <> · {perfil.grupoNome}</>}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Dados pessoais */}
        <Card>
          <CardHeader>
            <CardTitle>Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="nomeSocial">Nome social</Label>
              <Input
                id="nomeSocial"
                value={nomeSocial}
                onChange={(e) => setNomeSocial(e.target.value)}
                maxLength={255}
                placeholder="Como você prefere ser chamado(a)"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="dataNascimento">Data de nascimento</Label>
                <Input
                  id="dataNascimento"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Estado civil</Label>
                <Select value={estadoCivil} onValueChange={(v) => v && setEstadoCivil(v as EstadoCivil)}>
                  <SelectTrigger>
                    <SelectValue>{ESTADO_CIVIL_LABELS[estadoCivil]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ESTADO_CIVIL_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  type="tel"
                  inputMode="numeric"
                  value={telefone}
                  onChange={(e) => setTelefone(applyPhoneMask(e.target.value))}
                  placeholder="(xx) xxxxx-xxxx"
                  maxLength={15}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="nacionalidade">Nacionalidade</Label>
                <Input
                  id="nacionalidade"
                  value={nacionalidade}
                  onChange={(e) => setNacionalidade(e.target.value)}
                  maxLength={100}
                  placeholder="Brasileira"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="rg">RG</Label>
                <Input id="rg" value={rg} onChange={(e) => setRg(e.target.value)} maxLength={30} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="orgaoEmissor">Órgão emissor</Label>
                <Input
                  id="orgaoEmissor"
                  value={orgaoEmissor}
                  onChange={(e) => setOrgaoEmissor(e.target.value)}
                  maxLength={50}
                  placeholder="SSP/UF"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  inputMode="numeric"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  maxLength={10}
                  placeholder="00000-000"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="numFilhos">Número de filhos</Label>
                <Input
                  id="numFilhos"
                  type="number"
                  min={0}
                  value={numFilhos}
                  onChange={(e) => setNumFilhos(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="paroquiaReferencia">Paróquia de referência</Label>
              <Input
                id="paroquiaReferencia"
                value={paroquiaReferencia}
                onChange={(e) => setParoquiaReferencia(e.target.value)}
                maxLength={255}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSalvar} disabled={saving}>
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Salvar alterações
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="pt-2 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {communityName}
        </p>
      </main>

      <ImageCropDialog
        open={fotoDialogOpen}
        onOpenChange={setFotoDialogOpen}
        title="Sua foto"
        hasImage={!!perfil.foto}
        onSave={(key) => salvarFoto(key)}
        onRemove={() => salvarFoto(null)}
        uploadEndpoint="/api/portal/imagens"
      />
    </div>
  );
}
