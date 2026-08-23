"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  useEtapaLabels,
  useTermos,
} from "@/lib/data-store";
import {
  NIVEL_CORES,
  MODALIDADE_LABELS,
  totalRequerido,
  type Formando,
  type GradeFormativa,
  type GrupoFormacao,
  type NivelFormativo,
  type Modalidade,
  type EstadoCivil,
  type ProgressoEtapa,
} from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Camera,
  ChevronDown,
  Filter,
  LayoutGrid,
  Link2,
  List,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";
import { applyPhoneMask, stripPhone, resolveImageSrc, idadeEmAnos } from "@/lib/utils";
import { perfilIncompleto } from "@/lib/perfil-completude";

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

/**
 * Sinal de que a pessoa ainda não assumiu os dados pessoais no portal (Fase 3
 * do cadastro mínimo). Fonte da regra: `perfilIncompleto` (lib/perfil-completude).
 * Mesmo visual na tabela e no grid — o sinal é o mesmo, então parece o mesmo.
 * Mostrado só para formando ATIVO: inativo/desligado não vai completar.
 */
function CadastroPendenteBadge() {
  return (
    <Badge
      variant="outline"
      className="gap-1 text-xs bg-amber-50 text-amber-700 border-amber-200"
      title="A pessoa ainda não completou os dados pessoais no portal"
    >
      <AlertTriangle className="h-3 w-3" />
      Cadastro pendente
    </Badge>
  );
}

const NIVEL_AVATAR_BG: Record<NivelFormativo, string> = {
  "pre-discipulado": "bg-violet-100 text-violet-700",
  discipulado: "bg-blue-100 text-blue-700",
  "primeiras-promessas": "bg-emerald-100 text-emerald-700",
  "formacao-permanente": "bg-amber-100 text-amber-700",
  vocacional: "bg-rose-100 text-rose-700",
};

const ESTADO_CIVIL_LABELS = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
};

type FormState = {
  nome: string;
  dataNascimento: string;
  estadoCivil: EstadoCivil;
  modalidade: Modalidade;
  nivelFormativo: NivelFormativo;
  dataIngresso: string;
  telefone: string;
  email: string;
  grupoFormacaoId: string;
};

const EMPTY_FORM: FormState = {
  nome: "",
  dataNascimento: "",
  estadoCivil: "solteiro",
  modalidade: "presencial",
  nivelFormativo: "pre-discipulado",
  dataIngresso: new Date().toISOString().split("T")[0],
  telefone: "",
  email: "",
  grupoFormacaoId: "",
};

const JSON_HEADERS = { "Content-Type": "application/json" };

interface FormandosClientProps {
  initialFormandos: Formando[];
  initialGruposFormacao: GrupoFormacao[];
  initialGrades: GradeFormativa[];
  role: string;
  grupoFormacaoId: string | null;
  /** Total que casa com os filtros atuais (para a paginação). */
  total: number;
  /** Ativos da organização, sem filtros (cabeçalho). */
  ativosCount: number;
  /** Página atual (1-based), derivada da URL. */
  page: number;
  pageSize: number;
  /** Busca textual atual refletida pelo servidor. */
  query: string;
  /** Filtro de nível atual ("todos" quando ausente). */
  nivel: string;
}

export default function FormandosClient({
  initialFormandos,
  initialGruposFormacao,
  initialGrades,
  role,
  grupoFormacaoId: userGrupoFormacaoId,
  total,
  ativosCount,
  page,
  pageSize,
  query,
  nivel,
}: FormandosClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isFC = role === "formador_comunitario";

  const etapaLabels = useEtapaLabels();
  const { formando: termoFormando, grupoFormacao: termoGrupoFormacao } = useTermos();

  const [search, setSearch] = useState(query);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Formando | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showOptional, setShowOptional] = useState(false);
  const [saving, setSaving] = useState(false);
  const [linkGradeState, setLinkGradeState] = useState<{ grupoFormacaoId: string; nivelFormativo: NivelFormativo } | null>(null);
  const [selectedGradeId, setSelectedGradeId] = useState("");
  const [linkGradeSaving, setLinkGradeSaving] = useState(false);

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Busca, filtro e paginação são server-side: o estado vive na URL
  // (?q=&nivel=&page=) e cada mudança navega, refazendo a query paginada no
  // servidor. Evita carregar a organização inteira no cliente.
  const pushParams = useCallback(
    (next: { q?: string; nivel?: string; page?: number }) => {
      const q = next.q ?? query;
      const nv = next.nivel ?? nivel;
      const pg = next.page ?? page;
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (nv && nv !== "todos") params.set("nivel", nv);
      if (pg > 1) params.set("page", String(pg));
      const qs = params.toString();
      startTransition(() => router.push(qs ? `/formandos?${qs}` : "/formandos"));
    },
    [query, nivel, page, router]
  );

  // Debounce da busca textual → URL (350ms). Só navega quando o texto diverge
  // do que o servidor já refletiu — evita push no mount e loops de navegação.
  useEffect(() => {
    if (search === query) return;
    const t = setTimeout(() => pushParams({ q: search, page: 1 }), 350);
    return () => clearTimeout(t);
  }, [search, query, pushParams]);

  const semFiltros = !query && nivel === "todos";

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, grupoFormacaoId: "" });
    setShowOptional(false);
    setDialogOpen(true);
  }

  function openEdit(f: Formando, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setEditing(f);
    setForm({
      nome: f.nome,
      dataNascimento: f.dataNascimento ?? "",
      estadoCivil: f.estadoCivil,
      modalidade: f.modalidade,
      nivelFormativo: f.nivelFormativo,
      dataIngresso: f.dataIngresso,
      telefone: applyPhoneMask(f.telefone),
      email: f.email,
      grupoFormacaoId: f.grupoFormacaoId ?? "",
    });
    setShowOptional(true);
    setDialogOpen(true);
  }

  function openDelete(f: Formando, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setEditing(f);
    setDeleteOpen(true);
  }

  async function handleSave() {
    if (!form.nome.trim()) return toast.error("Nome é obrigatório.");
    if (!form.email.trim()) return toast.error("E-mail é obrigatório.");
    if (!form.grupoFormacaoId) return toast.error(`${termoGrupoFormacao} é obrigatória.`);
    if (!form.modalidade) return toast.error("Modalidade é obrigatória.");

    const grupoFormacao = initialGruposFormacao.find((m) => m.id === form.grupoFormacaoId);
    const nivelFormativo = grupoFormacao?.nivelFormativo ?? form.nivelFormativo;
    const dataIngresso = form.dataIngresso || new Date().toISOString().split("T")[0];

    const progressoEtapas: ProgressoEtapa[] = editing?.progressoEtapas ?? [
      {
        nivel: nivelFormativo,
        formacoesComunitariasRealizadas: 0,
        retirosComunitariosRealizados: 0,
        retirosPessoaisRealizados: 0,
        iniciouEm: dataIngresso,
      },
    ];

    const payload = {
      nome: form.nome.trim(),
      dataNascimento: form.dataNascimento || undefined,
      estadoCivil: form.estadoCivil,
      modalidade: form.modalidade,
      nivelFormativo,
      dataIngresso,
      telefone: stripPhone(form.telefone),
      email: form.email.trim(),
      ativo: editing?.ativo ?? true,
      foto: editing?.foto,
      grupoFormacaoId: form.grupoFormacaoId || undefined,
      totalFormacoes: editing?.totalFormacoes ?? totalRequerido(nivelFormativo),
      formacoesRealizadas: editing?.formacoesRealizadas ?? 0,
      progressoEtapas,
    };

    setSaving(true);
    try {
      const res = editing
        ? await fetch(`/api/formandos/${editing.id}`, {
            method: "PUT",
            headers: JSON_HEADERS,
            body: JSON.stringify(payload),
          })
        : await fetch("/api/formandos", {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return toast.error((err as { error?: string }).error ?? "Erro ao salvar formando.");
      }

      toast.success(editing ? `${termoFormando} atualizado com sucesso!` : `${termoFormando} criado com sucesso!`);
      setDialogOpen(false);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/formandos/${editing.id}`, { method: "DELETE" });
      if (!res.ok) return toast.error("Erro ao excluir formando.");
      toast.success(`${termoFormando} excluído.`);
      setDeleteOpen(false);
      setEditing(null);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleVincularGrade() {
    if (!linkGradeState || !selectedGradeId) return;
    setLinkGradeSaving(true);
    try {
      const grupoFormacao = initialGruposFormacao.find((m) => m.id === linkGradeState.grupoFormacaoId);
      if (!grupoFormacao) return;
      const res = await fetch(`/api/grupos-formacao/${linkGradeState.grupoFormacaoId}`, {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify({ ...grupoFormacao, gradeId: selectedGradeId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Grade vinculada com sucesso!");
      setLinkGradeState(null);
      setSelectedGradeId("");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Falha ao vincular grade.");
    } finally {
      setLinkGradeSaving(false);
    }
  }

  const selectedGrupoFormacao = initialGruposFormacao.find((m) => m.id === form.grupoFormacaoId);

  return (
    <div className="space-y-5 animate-in-fast">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{termoFormando}s</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {ativosCount} {termoFormando.toLowerCase()}s ativos
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Novo {termoFormando}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={nivel} onValueChange={(v) => pushParams({ nivel: v ?? "todos", page: 1 })} items={{ todos: "Todos os níveis", ...etapaLabels }}>
          <SelectTrigger className="h-9 w-full sm:w-52 text-sm">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Etapa formativa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os níveis</SelectItem>
            {(Object.entries(etapaLabels) as [NivelFormativo, string][]).map(([nivel, label]) => (
              <SelectItem key={nivel} value={nivel}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex rounded-md border border-border overflow-hidden h-9">
          <button
            onClick={() => setView("grid")}
            className={`px-2.5 flex items-center transition-colors ${view === "grid" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-2.5 flex items-center border-l border-border transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Atualizando...
        </div>
      )}

      {initialFormandos.length === 0 && !isPending && (
        semFiltros ? (
          <EmptyState
            icon={Users}
            title={`Nenhum ${termoFormando.toLowerCase()} cadastrado`}
            description={`Comece cadastrando o primeiro ${termoFormando.toLowerCase()} para acompanhar sua jornada formativa.`}
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1.5" />
                Cadastrar {termoFormando.toLowerCase()}
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Search}
            title="Nenhum resultado"
            description="Nenhum registro corresponde à busca ou aos filtros atuais."
            secondaryAction={
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearch("");
                  pushParams({ q: "", nivel: "todos", page: 1 });
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        )
      )}

      {view === "grid" && initialFormandos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {initialFormandos.map((formando) => {
            const grupoFormacao = formando.grupoFormacaoId ? initialGruposFormacao.find((m) => m.id === formando.grupoFormacaoId) : null;
            const semGrade = !!formando.grupoFormacaoId && !grupoFormacao?.gradeId;
            return (
              <FormandoCard
                key={formando.id}
                formando={formando}
                semGrade={semGrade}
                onEdit={openEdit}
                onDelete={openDelete}
                onVincularGrade={!isFC ? (mId, nivel) => {
                  setSelectedGradeId("");
                  setLinkGradeState({ grupoFormacaoId: mId, nivelFormativo: nivel });
                } : undefined}
              />
            );
          })}
          <div className="col-span-full">
            <Pagination total={total} page={page} pageSize={pageSize} onPageChange={(p) => pushParams({ page: p })} />
          </div>
        </div>
      )}

      {view === "list" && initialFormandos.length > 0 && (
        <Card className="border-0 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold text-muted-foreground">{termoFormando}</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">Nível</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden lg:table-cell">Ingresso</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">Progresso</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialFormandos.map((formando) => {
                const progresso = Math.round(
                  (formando.formacoesRealizadas / formando.totalFormacoes) * 100
                );
                const listGrupo = formando.grupoFormacaoId
                  ? initialGruposFormacao.find((m) => m.id === formando.grupoFormacaoId)
                  : null;
                const listSemGrade = !!formando.grupoFormacaoId && !listGrupo?.gradeId;
                return (
                  <TableRow key={formando.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell>
                      <Link href={`/formandos/${formando.id}`} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className={`text-xs font-semibold ${NIVEL_AVATAR_BG[formando.nivelFormativo]}`}>
                            {getInitials(formando.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground leading-tight hover:text-primary transition-colors">
                            {formando.nome}
                          </p>
                          <p className="text-xs text-muted-foreground">{formando.email}</p>
                          {formando.ativo && perfilIncompleto(formando) && (
                            <div className="mt-1">
                              <CadastroPendenteBadge />
                            </div>
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className={`text-xs ${NIVEL_CORES[formando.nivelFormativo]}`}>
                        {etapaLabels[formando.nivelFormativo]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {format(parseISO(formando.dataIngresso), "MMM yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <Progress value={progresso} className="h-1.5 w-20" />
                        <span className="text-xs text-muted-foreground">
                          {formando.formacoesRealizadas}/{formando.totalFormacoes}
                        </span>
                        {listSemGrade && (
                          <span title={`${termoGrupoFormacao} sem grade vinculada`}>
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${formando.ativo ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500"}`}
                      >
                        {formando.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => openEdit(formando, e)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={(e) => openDelete(formando, e)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="p-3">
            <Pagination total={total} page={page} pageSize={pageSize} onPageChange={(p) => pushParams({ page: p })} />
          </div>
        </Card>
      )}

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${termoFormando}` : `Novo ${termoFormando}`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Nome completo <span className="text-destructive">*</span></Label>
              <Input value={form.nome} onChange={(e) => set("nome")(e.target.value)} placeholder="Nome Sobrenome" />
            </div>
            <div className="grid gap-1.5">
              <Label>E-mail <span className="text-destructive">*</span></Label>
              <Input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} placeholder="email@exemplo.com" />
              {!editing && (
                <p className="text-xs text-muted-foreground">
                  Usado para enviar o convite de primeiro acesso ao portal.
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label>{termoGrupoFormacao} <span className="text-destructive">*</span></Label>
              <Select
                value={form.grupoFormacaoId}
                onValueChange={(v) => {
                  set("grupoFormacaoId")(v ?? "");
                  const m = initialGruposFormacao.find((m) => m.id === v);
                  if (m?.nivelFormativo) set("nivelFormativo")(m.nivelFormativo);
                }}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(() => {
                      if (!form.grupoFormacaoId) return `Selecione a ${termoGrupoFormacao.toLowerCase()}...`;
                      const m = initialGruposFormacao.find((x) => x.id === form.grupoFormacaoId);
                      return m ? `${m.nome}${m.nivelFormativo ? ` — ${etapaLabels[m.nivelFormativo]}` : ""}` : `Selecione a ${termoGrupoFormacao.toLowerCase()}...`;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {initialGruposFormacao.filter((m) => m.ativo).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome}{m.nivelFormativo ? ` — ${etapaLabels[m.nivelFormativo]}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Etapa Formativa <span className="text-destructive">*</span></Label>
              <Select
                value={selectedGrupoFormacao ? selectedGrupoFormacao.nivelFormativo : form.nivelFormativo}
                onValueChange={(v) => !selectedGrupoFormacao && v && set("nivelFormativo")(v)}
                disabled={!!selectedGrupoFormacao}
              >
                <SelectTrigger>
                  <SelectValue>
                    {etapaLabels[selectedGrupoFormacao?.nivelFormativo ?? form.nivelFormativo]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(["pre-discipulado", "discipulado", "primeiras-promessas", "formacao-permanente"] as NivelFormativo[]).map((n) => (
                    <SelectItem key={n} value={n}>{etapaLabels[n]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedGrupoFormacao && (
                <p className="text-xs text-muted-foreground">
                  Definido automaticamente pela morada selecionada.
                </p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label>Modalidade <span className="text-destructive">*</span></Label>
              <Select value={form.modalidade} onValueChange={(v) => v && set("modalidade")(v)}>
                <SelectTrigger>
                  <SelectValue>{MODALIDADE_LABELS[form.modalidade]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="hibrida">Híbrida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showOptional ? (
              <div className="grid gap-4 border-t border-border/60 pt-4">
                {!editing && (
                  <p className="text-xs text-muted-foreground -mt-1">
                    Dados pessoais. Você pode deixar em branco — o próprio {termoFormando.toLowerCase()} completa no portal.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Data de nascimento</Label>
                    <Input type="date" value={form.dataNascimento} onChange={(e) => set("dataNascimento")(e.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Estado civil</Label>
                    <Select value={form.estadoCivil} onValueChange={(v) => v && set("estadoCivil")(v)}>
                      <SelectTrigger>
                        <SelectValue>{ESTADO_CIVIL_LABELS[form.estadoCivil]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ESTADO_CIVIL_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Telefone</Label>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    value={form.telefone}
                    onChange={(e) => set("telefone")(applyPhoneMask(e.target.value))}
                    placeholder="(xx) xxxxx-xxxx"
                    maxLength={15}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Data de ingresso</Label>
                  <Input type="date" value={form.dataIngresso} onChange={(e) => set("dataIngresso")(e.target.value)} />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowOptional(true)}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline w-fit"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                Completar agora (opcional)
              </button>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {editing ? "Salvar alterações" : `Criar ${termoFormando.toLowerCase()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir {termoFormando.toLowerCase()}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir{" "}
            <span className="font-medium text-foreground">{editing?.nome}</span>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={saving}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Grade Dialog */}
      <Dialog open={!!linkGradeState} onOpenChange={(open) => { if (!open) { setLinkGradeState(null); setSelectedGradeId(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular grade formativa</DialogTitle>
            {linkGradeState && (
              <p className="text-sm text-muted-foreground">
                Escolha a grade da etapa{" "}
                <span className="font-medium text-foreground">{etapaLabels[linkGradeState.nivelFormativo]}</span>{" "}
                para esta {termoGrupoFormacao.toLowerCase()}.
              </p>
            )}
          </DialogHeader>
          {linkGradeState && (() => {
            const gradesFiltradas = initialGrades.filter(
              (g) => g.nivelFormativo === linkGradeState.nivelFormativo && g.ativo
            );
            return (
              <div className="py-1">
                {gradesFiltradas.length === 0 ? (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5">
                    Nenhuma grade ativa encontrada para esta etapa. Crie ou ative uma grade em Grades Formativas.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    <Label>Grade formativa</Label>
                    <Select value={selectedGradeId} onValueChange={(v) => v && setSelectedGradeId(v)} items={Object.fromEntries(gradesFiltradas.map((g) => [g.id, g.nome || g.planoNome]))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione a grade..." />
                      </SelectTrigger>
                      <SelectContent>
                        {gradesFiltradas.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            <span>{g.nome || g.planoNome}</span>
                            {g.totalFormacoes > 0 && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                · {g.totalFormacoes} formações
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setLinkGradeState(null); setSelectedGradeId(""); }}>Cancelar</Button>
            <Button onClick={handleVincularGrade} disabled={!selectedGradeId || linkGradeSaving}>
              {linkGradeSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormandoCard({
  formando,
  semGrade,
  onEdit,
  onDelete,
  onVincularGrade,
}: {
  formando: Formando;
  semGrade: boolean;
  onEdit: (f: Formando, e: React.MouseEvent) => void;
  onDelete: (f: Formando, e: React.MouseEvent) => void;
  onVincularGrade?: (grupoFormacaoId: string, nivelFormativo: NivelFormativo) => void;
}) {
  const router = useRouter();
  const [isPendingFoto, startFotoTransition] = useTransition();
  const etapaLabels = useEtapaLabels();
  const { grupoFormacao: termoGrupoFormacaoCard } = useTermos();
  const [fotoDialogOpen, setFotoDialogOpen] = useState(false);

  const progresso = Math.round(
    (formando.formacoesRealizadas / formando.totalFormacoes) * 100
  );
  const idade = idadeEmAnos(formando.dataNascimento);

  async function handleFotoSave(imageData: string) {
    const res = await fetch(`/api/formandos/${formando.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foto: imageData }),
    });
    if (!res.ok) { toast.error("Erro ao salvar foto."); return; }
    toast.success("Foto atualizada.");
    startFotoTransition(() => router.refresh());
  }

  async function handleFotoRemove() {
    const res = await fetch(`/api/formandos/${formando.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foto: null }),
    });
    if (!res.ok) { toast.error("Erro ao remover foto."); return; }
    toast.success("Foto removida.");
    startFotoTransition(() => router.refresh());
  }

  return (
    <Card className="border-0 shadow-sm bg-card hover:shadow-md transition-all duration-200 group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setFotoDialogOpen(true)}
              className="relative h-10 w-10 shrink-0 group/foto rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Alterar foto"
            >
              <Avatar className="h-10 w-10">
                {resolveImageSrc(formando.foto) && <AvatarImage src={resolveImageSrc(formando.foto)!} alt={formando.nome} />}
                <AvatarFallback className={`font-semibold text-sm ${NIVEL_AVATAR_BG[formando.nivelFormativo]}`}>
                  {getInitials(formando.nome)}
                </AvatarFallback>
              </Avatar>
              <span className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover/foto:opacity-100 transition-opacity">
                <Camera className="h-3.5 w-3.5 text-white" />
              </span>
            </button>
            <div className="flex-1 min-w-0">
              <Link href={`/formandos/${formando.id}`}>
                <p className="font-semibold text-sm text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                  {formando.nome}
                </p>
              </Link>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {idade !== null ? `${idade} anos · ` : ""}{MODALIDADE_LABELS[formando.modalidade]}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex h-7 w-7 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted shrink-0"
              onClick={(e) => e.preventDefault()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => onEdit(formando, e)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={(e) => onDelete(formando, e)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={`text-xs ${NIVEL_CORES[formando.nivelFormativo]}`}>
            {etapaLabels[formando.nivelFormativo]}
          </Badge>
          {formando.ativo && perfilIncompleto(formando) && <CadastroPendenteBadge />}
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium text-foreground">
              {formando.formacoesRealizadas}/{formando.totalFormacoes} formações
            </span>
          </div>
          <Progress value={progresso} className="h-1.5" />
          {semGrade && (
            <div className="flex items-center justify-between gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-xs text-amber-700 mt-1">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>{termoGrupoFormacaoCard} sem grade vinculada</span>
              </div>
              {onVincularGrade && formando.grupoFormacaoId && (
                <button
                  onClick={(e) => { e.preventDefault(); onVincularGrade(formando.grupoFormacaoId!, formando.nivelFormativo); }}
                  className="flex items-center gap-1 font-medium underline underline-offset-2 hover:text-amber-900 transition-colors whitespace-nowrap"
                >
                  <Link2 className="h-3 w-3" />
                  Vincular
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
          <span className="text-xs text-muted-foreground">
            Desde {format(parseISO(formando.dataIngresso), "MMM yyyy", { locale: ptBR })}
          </span>
          <Badge
            variant="outline"
            className={`text-xs ${formando.ativo ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500"}`}
          >
            {formando.ativo ? "Ativo" : "Inativo"}
          </Badge>
        </div>
      </CardContent>

      <ImageCropDialog
        open={fotoDialogOpen}
        onOpenChange={setFotoDialogOpen}
        title={`Foto de ${formando.nome}`}
        hasImage={!!formando.foto}
        onSave={handleFotoSave}
        onRemove={handleFotoRemove}
        uploadEndpoint="/api/imagens"
      />
    </Card>
  );
}
