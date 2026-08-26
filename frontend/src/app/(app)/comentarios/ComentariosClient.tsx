"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  NIVEL_CORES,
  NIVEL_FORMATIVO_LABELS,
  TIPO_COMENTARIO_CORES,
  TIPO_COMENTARIO_LABELS,
  type ComentarioFormando,
  type TipoComentario,
  type Formando,
} from "@/types";
import { useTermos } from "@/lib/data-store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MessageSquare, Plus, Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 10;
const JSON_HEADERS = { "Content-Type": "application/json" };

interface ComentariosClientProps {
  initialComentarios: ComentarioFormando[];
  initialFormandos: Formando[];
}

export default function ComentariosClient({
  initialComentarios,
  initialFormandos,
}: ComentariosClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { formando: termoFormando } = useTermos();
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [page, setPage] = useState(1);

  const [novoFormandoId, setNovoFormandoId] = useState("");
  const [novoTipo, setNovoTipo] = useState<TipoComentario>("observacao");
  const [novoTexto, setNovoTexto] = useState("");

  const tipos: TipoComentario[] = ["adesao", "dificuldade", "progresso", "observacao"];

  const comentariosFiltrados = initialComentarios.filter((c) => {
    const matchBusca =
      !busca ||
      c.formandoNome.toLowerCase().includes(busca.toLowerCase()) ||
      c.texto.toLowerCase().includes(busca.toLowerCase());
    const matchTipo = filtroTipo === "todos" || c.tipo === filtroTipo;
    return matchBusca && matchTipo;
  });

  async function handleSalvar() {
    if (!novoFormandoId || !novoTexto.trim()) return;
    const formando = initialFormandos.find((f) => f.id === novoFormandoId);
    if (!formando) return;

    const userId = (session?.user as { id?: string })?.id ?? "";
    const userName = session?.user?.name ?? "Formador";

    setSaving(true);
    try {
      const res = await fetch("/api/comentarios", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          formandoId: novoFormandoId,
          formandoNome: formando.nome,
          formadorId: userId,
          formadorNome: userName,
          texto: novoTexto.trim(),
          tipo: novoTipo,
        }),
      });
      if (!res.ok) return toast.error("Erro ao registrar comentário.");
      toast.success("Comentário registrado com sucesso!");
      setDialogAberto(false);
      setNovoFormandoId("");
      setNovoTexto("");
      setNovoTipo("observacao");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comentários</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registre observações sobre a adesão dos formandos ao plano formativo
          </p>
        </div>
        <Button onClick={() => setDialogAberto(true)} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Novo Comentário
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Buscar por ${termoFormando.toLowerCase()} ou conteúdo...`}
            className="pl-8"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={filtroTipo} onValueChange={(v) => v && setFiltroTipo(v)} items={{ todos: "Todos os tipos", ...Object.fromEntries(tipos.map((t) => [t, TIPO_COMENTARIO_LABELS[t]])) }}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {tipos.map((t) => (
              <SelectItem key={t} value={t}>{TIPO_COMENTARIO_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {comentariosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum comentário encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">
              Clique em &quot;Novo Comentário&quot; para registrar uma observação
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {comentariosFiltrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((comentario) => {
            const formando = initialFormandos.find((f) => f.id === comentario.formandoId);
            const initials = comentario.formandoNome.split(" ").map((n) => n[0]).slice(0, 2).join("");
            return (
              <Card key={comentario.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                      <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-sm font-semibold">{comentario.formandoNome}</span>
                        {formando && (
                          <Badge className={NIVEL_CORES[formando.nivelFormativo]}>
                            {NIVEL_FORMATIVO_LABELS[formando.nivelFormativo]}
                          </Badge>
                        )}
                        <Badge className={TIPO_COMENTARIO_CORES[comentario.tipo]}>
                          {TIPO_COMENTARIO_LABELS[comentario.tipo]}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {format(parseISO(comentario.criadoEm), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed">{comentario.texto}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <Pagination total={comentariosFiltrados.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} className="pt-2" />
        </div>
      )}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Comentário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{termoFormando}</Label>
              <Select value={novoFormandoId} onValueChange={(v) => setNovoFormandoId(v ?? "")} items={Object.fromEntries(initialFormandos.filter((f) => f.ativo).map((f) => [f.id, f.nome]))}>
                <SelectTrigger>
                  <SelectValue placeholder={`Selecione o ${termoFormando.toLowerCase()}...`} />
                </SelectTrigger>
                <SelectContent>
                  {initialFormandos.filter((f) => f.ativo).map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={novoTipo} onValueChange={(v) => v && setNovoTipo(v as TipoComentario)} items={TIPO_COMENTARIO_LABELS}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tipos.map((t) => (
                    <SelectItem key={t} value={t}>{TIPO_COMENTARIO_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Comentário</Label>
              <Textarea
                placeholder={`Descreva sua observação sobre a adesão do ${termoFormando.toLowerCase()} ao plano formativo...`}
                className="min-h-24 resize-none"
                value={novoTexto}
                onChange={(e) => setNovoTexto(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogAberto(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={!novoFormandoId || !novoTexto.trim() || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
