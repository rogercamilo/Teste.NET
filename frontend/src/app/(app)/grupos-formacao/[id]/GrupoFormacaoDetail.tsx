"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { useComunidade, useEtapaLabels } from "@/lib/data-store";
import {
  NIVEL_CORES,
  MODALIDADE_LABELS,
  STATUS_FORMACAO_LABELS,
  TIPO_COMENTARIO_CORES,
  TIPO_COMENTARIO_LABELS,
  podeAvancarEtapa,
  type GrupoFormacao,
  type Formando,
  type EstadoCivil,
  type Modalidade,
  type NivelFormativo,
  type PresencaFormacao,
  type ComentarioFormando,
  type TipoComentario,
  type RelatorioEtapa,
  type PlanoFormativo,
  type GradeFormativa,
  type Usuario,
  type Agendamento,
  NIVEL_FORMATIVO_LABELS,
  STATUS_FORMACAO_STYLES,
  ESTADO_CIVIL_LABELS,
  STATUS_RELATORIO_CORES,
  NOTA_ADESAO_LABELS,
  NOTA_ADESAO_CORES,
  PERSPECTIVA_LABELS,
  RECOMENDACAO_LABELS,
  RECOMENDACAO_CORES,
} from "@/types";
import { NivelFormativoIcon } from "@/components/nivel-formativo-icon";
import { RelatorioDialog } from "./RelatorioDialog";
import { LeiturasManager, type Leitura } from "@/components/leituras/LeiturasManager";
import { EmptyState } from "@/components/ui/empty-state";
import {
  progressoNaEtapa,
  funilPorEtapa,
  taxaPresenca90d,
  mesesEntre,
  pctEsperadoNoRitmo,
  estaAtrasadoNoRitmo,
  duracaoAnosEtapa,
} from "@/lib/jornada-progresso";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowLeft,
  BookOpen,
  Calendar,
  Camera,
  CheckCircle2,
  ClipboardList,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  FileText,
  Flag,
  GitBranch,
  Home,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { cn, resolveImageSrc, idadeEmAnos } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface GrupoFormacaoDetailProps {
  id: string;
  userRole: string;
  userId: string;
  initialGrupoFormacao: GrupoFormacao;
  initialFormandos: Formando[];
  initialAgendamentos: Agendamento[];
  initialPresencas: PresencaFormacao[];
  initialComentarios: ComentarioFormando[];
  initialPlanos: PlanoFormativo[];
  initialGrades: GradeFormativa[];
  initialUsuarios: Usuario[];
  initialRelatorios: RelatorioEtapa[];
  initialLeituras: Leitura[];
}


const NIVEL_SEQUENCE: NivelFormativo[] = [
  "pre-discipulado",
  "discipulado",
  "primeiras-promessas",
  "formacao-permanente",
];

// Cores sólidas por etapa para as barras do funil da Jornada (item 3.1).
const NIVEL_BAR_COLORS: Record<NivelFormativo, string> = {
  "pre-discipulado": "bg-violet-500",
  discipulado: "bg-blue-500",
  "primeiras-promessas": "bg-emerald-500",
  "formacao-permanente": "bg-amber-500",
  vocacional: "bg-rose-500",
};

type FormandoFormState = {
  nome: string;
  dataNascimento: string;
  estadoCivil: EstadoCivil;
  modalidade: Modalidade;
  dataIngresso: string;
  telefone: string;
  email: string;
};

const EMPTY_FORMANDO_FORM: FormandoFormState = {
  nome: "",
  dataNascimento: "",
  estadoCivil: "solteiro",
  modalidade: "presencial",
  dataIngresso: new Date().toISOString().split("T")[0],
  telefone: "",
  email: "",
};

export default function GrupoFormacaoDetail({
  id,
  userRole,
  userId,
  initialGrupoFormacao,
  initialFormandos,
  initialAgendamentos,
  initialPresencas,
  initialComentarios,
  initialPlanos,
  initialGrades,
  initialUsuarios,
  initialRelatorios,
  initialLeituras,
}: GrupoFormacaoDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isAdmin = userRole === "administrador";
  const isFormadorGeral = userRole === "formador_geral";
  const isFC = userRole === "formador_comunitario";
  // Gestão (admin/formador geral) ou o FC responsável — que só alcança esta tela
  // para o próprio grupo (guard em page.tsx) — pode gerir a lista de leituras.
  const podeGerirLeituras = isAdmin || isFormadorGeral || isFC;

  const [grupoFormacao, setGrupoFormacao] = useState<GrupoFormacao>(initialGrupoFormacao);
  const [allFormandos, setAllFormandos] = useState<Formando[]>(initialFormandos);
  const [presencas, setPresencas] = useState<PresencaFormacao[]>(initialPresencas);
  const [comentarios, setComentarios] = useState<ComentarioFormando[]>(initialComentarios);
  const [relatorios, setRelatorios] = useState<RelatorioEtapa[]>(initialRelatorios);

  const [comunidade] = useComunidade();
  const termoFormando = comunidade.termoFormando?.trim() || "Formando";
  const termoGrupoFormacao = comunidade.termoGrupoFormacao?.trim() || "Grupo de Formação";
  const etapaLabels = useEtapaLabels();

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ nome: "", localReuniao: "" });

  const [agendamentoId, setAgendamentoId] = useState<string>("");
  const [comentarioOpen, setComentarioOpen] = useState(false);
  const [novoFormandoId, setNovoFormandoId] = useState("");
  const [novoTipo, setNovoTipo] = useState<TipoComentario>("observacao");
  const [novoTexto, setNovoTexto] = useState("");

  // Relatórios state
  const [relatorioDialogOpen, setRelatorioDialogOpen] = useState(false);
  const [relatorioFormando, setRelatorioFormando] = useState<Formando | null>(null);
  const [relatorioSelecionado, setRelatorioSelecionado] = useState<RelatorioEtapa | null>(null);
  const [expandedRelatorioId, setExpandedRelatorioId] = useState<string | null>(null);

  function abrirRelatorio(formando: Formando) {
    const rel = relatorios.find(
      (r) => r.formandoId === formando.id && r.nivelFormativo === formando.nivelFormativo
    ) ?? null;
    setRelatorioFormando(formando);
    setRelatorioSelecionado(rel);
    setRelatorioDialogOpen(true);
  }

  function onRelatorioSaved(r: RelatorioEtapa) {
    setRelatorios((prev) => {
      const idx = prev.findIndex((x) => x.id === r.id);
      return idx >= 0 ? prev.map((x) => (x.id === r.id ? r : x)) : [...prev, r];
    });
  }

  // Formandos tab CRUD state
  const [formSearch, setFormSearch] = useState("");
  const [formNivelFilter, setFormNivelFilter] = useState("todos");
  const [formandoView, setFormandoView] = useState<"cards" | "lista">("cards");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteFormandoOpen, setDeleteFormandoOpen] = useState(false);
  const [editingFormando, setEditingFormando] = useState<Formando | null>(null);
  const [formandoForm, setFormandoForm] = useState<FormandoFormState>(EMPTY_FORMANDO_FORM);

  // Nova Etapa Formativa state
  const [novaEtapaOpen, setNovaEtapaOpen] = useState(false);
  const [novaEtapaForm, setNovaEtapaForm] = useState({ vigenciaInicio: "", dataMissaCompromisso: "" });

  const [savingFormando, setSavingFormando] = useState(false);

  // Encerrar Etapa Formativa state
  const [encerrarOpen, setEncerrarOpen] = useState(false);
  const [encerrarForm, setEncerrarForm] = useState({ encerradoEm: "" });
  const [encerrarLoading, setEncerrarLoading] = useState(false);
  const [novaEtapaLoading, setNovaEtapaLoading] = useState(false);

  // Datas da Etapa Atual state
  const [datasEtapaOpen, setDatasEtapaOpen] = useState(false);
  const [datasEtapaForm, setDatasEtapaForm] = useState({ dataMissaCompromisso: "", iniciouEm: "" });
  const [datasEtapaLoading, setDatasEtapaLoading] = useState(false);

  // Imagem do grupo de formação
  const [imagemDialogOpen, setImagemDialogOpen] = useState(false);
  const [imagemLoading, setImagemLoading] = useState(false);

  const formador = initialUsuarios.find((u) => u.id === grupoFormacao.formadorId);
  const plano = initialPlanos.find((p) => p.id === grupoFormacao.planoId);
  const grade = initialGrades.find((g) => g.id === grupoFormacao.gradeId);
  const formandosDaMorada = allFormandos.filter((f) => f.grupoFormacaoId === grupoFormacao.id);
  // Eventos coletivos que alcançam esta morada: amarrados a ela (campo legado),
  // via junção multi-grupo (item 1.7) OU org-wide ("todos os grupos"). Nos
  // org-wide, Convocação Geral e Reunião/Assembleia Geral valem para TODA a org
  // (qualquer nível); formação/retiro/outro sem grupo valem só p/ o mesmo nível.
  // Espelha o filtro do server em page.tsx.
  const agendamentosDaMorada = initialAgendamentos.filter((a) => {
    if (a.grupoFormacaoId === grupoFormacao.id) return true;
    if (a.grupoFormacaoIds?.includes(grupoFormacao.id)) return true;
    const isOrgWide = !a.grupoFormacaoId && (a.grupoFormacaoIds?.length ?? 0) === 0;
    if (!isOrgWide) return false;
    if (a.tipoEvento === "convocacao" || a.tipoEvento === "reuniao") return true;
    return (
      a.tipoEvento !== "acompanhamento_comunitario" &&
      !!grupoFormacao.nivelFormativo &&
      a.nivelFormativo === grupoFormacao.nivelFormativo
    );
  });
  // Concluídas — para a taxa de adesão e o card "Realizadas" (eventos que já ocorreram).
  const realizadas = agendamentosDaMorada.filter(
    (a) => a.status === "realizada" || a.status === "confirmada"
  );
  // Disponíveis para marcar/confirmar presença: tudo que não foi cancelado,
  // incluindo as ainda "agendada" — o FC indica presença e o formando confirma
  // pelo portal / web push antes do encontro.
  const agendamentosPresenca = agendamentosDaMorada.filter(
    (a) => a.status !== "cancelada"
  );
  const comentariosDaMorada = comentarios.filter((c) =>
    formandosDaMorada.some((f) => f.id === c.formandoId)
  );

  const agendamento = agendamentosDaMorada.find((a) => a.id === agendamentoId);

  // ── Painel "Jornada" (item 3.1): funil, progresso e "quem parou" ──
  // Sem useMemo manual: o React Compiler memoiza automaticamente.
  const jornadaAtivos = formandosDaMorada.filter((f) => f.ativo);
  const jornadaMembros = jornadaAtivos.map((f) => {
    const { done, total, pct } = progressoNaEtapa(f.nivelFormativo, f.progressoEtapas);
    const podeAvancar = podeAvancarEtapa(f);
    // Motivos de atenção (ritmo atrasado e/ou presença baixa)
    const prog = (f.progressoEtapas ?? []).find((p) => p.nivel === f.nivelFormativo);
    const meses = mesesEntre(prog?.iniciouEm);
    const motivos: string[] = [];
    if (!podeAvancar && meses !== null) {
      const esperado = pctEsperadoNoRitmo(meses, duracaoAnosEtapa(f.nivelFormativo));
      if (estaAtrasadoNoRitmo(pct, esperado, meses)) {
        motivos.push(`${pct}% em ${Math.round(meses)} ${Math.round(meses) === 1 ? "mês" : "meses"} de etapa`);
      }
    }
    const presenca = taxaPresenca90d(presencas, f.id);
    if (presenca !== null && presenca < 50) motivos.push(`presença ${presenca}%`);
    return { id: f.id, nome: f.nome, nivelFormativo: f.nivelFormativo, done, total, pct, podeAvancar, motivos };
  });
  const jornada = {
    totalAtivos: jornadaAtivos.length,
    funil: funilPorEtapa(jornadaAtivos),
    membros: [...jornadaMembros].sort((a, b) => b.pct - a.pct),
    progressoMedio: jornadaMembros.length
      ? Math.round(jornadaMembros.reduce((s, m) => s + m.pct, 0) / jornadaMembros.length)
      : 0,
    atencao: jornadaMembros.filter((m) => m.motivos.length > 0).sort((a, b) => a.pct - b.pct),
  };

  const filteredFormandos = formandosDaMorada.filter((f) => {
    const matchSearch =
      !formSearch ||
      f.nome.toLowerCase().includes(formSearch.toLowerCase()) ||
      f.email.toLowerCase().includes(formSearch.toLowerCase());
    const matchNivel = formNivelFilter === "todos" || f.nivelFormativo === formNivelFilter;
    return matchSearch && matchNivel;
  });

  // Compute next etapa options (must follow sequence)
  const currentNivelIdx = grupoFormacao.nivelFormativo
    ? NIVEL_SEQUENCE.indexOf(grupoFormacao.nivelFormativo)
    : -1;
  const nextEtapaOptions: NivelFormativo[] =
    currentNivelIdx >= 0 && currentNivelIdx < NIVEL_SEQUENCE.length - 1
      ? [NIVEL_SEQUENCE[currentNivelIdx + 1]]
      : ["formacao-permanente"];

  function getPresenca(formandoId: string): boolean {
    return (
      presencas.find((p) => p.agendamentoId === agendamentoId && p.formandoId === formandoId)
        ?.presente ?? false
    );
  }

  function togglePresenca(formandoId: string, formandoNome: string) {
    const newPresente = !getPresenca(formandoId);
    const snapshot = presencas;
    // Optimistic local update for instant feedback
    setPresencas((prev) => {
      const existente = prev.find(
        (p) => p.agendamentoId === agendamentoId && p.formandoId === formandoId
      );
      if (existente) {
        return prev.map((p) =>
          p.agendamentoId === agendamentoId && p.formandoId === formandoId
            ? { ...p, presente: newPresente }
            : p
        );
      }
      const formando = allFormandos.find((f) => f.id === formandoId);
      return [
        ...prev,
        {
          id: `pr-${Date.now()}`,
          agendamentoId,
          formacaoTema: agendamento?.formacaoTema ?? "",
          data: agendamento?.dataInicio.split("T")[0] ?? "",
          formandoId,
          formandoNome,
          nivelFormativo: formando?.nivelFormativo ?? "pre-discipulado",
          presente: newPresente,
        },
      ];
    });
    // Persist to server (upsert); rollback optimistic update on failure
    fetch("/api/presencas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agendamentoId,
        formandoId,
        presente: newPresente,
        formacaoTema: agendamento?.formacaoTema ?? "",
        data: agendamento?.dataInicio.split("T")[0] ?? "",
      }),
    }).catch(() => {
      setPresencas(snapshot);
      toast.error("Erro ao salvar presença. Tente novamente.");
    });
  }

  function calcPresencaFormando(formandoId: string) {
    const total = realizadas.length;
    const presentes = realizadas.filter((ag) =>
      presencas.find((p) => p.agendamentoId === ag.id && p.formandoId === formandoId && p.presente)
    ).length;
    return { total, presentes, pct: total > 0 ? Math.round((presentes / total) * 100) : 0 };
  }

  function openEdit() {
    if (!grupoFormacao) return;
    setEditForm({ nome: grupoFormacao.nome, localReuniao: grupoFormacao.localReuniao ?? "" });
    setEditOpen(true);
  }

  async function handleEditSave() {
    if (!editForm.nome.trim()) return toast.error("Nome é obrigatório.");
    const res = await fetch(`/api/grupos-formacao/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: editForm.nome.trim(), localReuniao: editForm.localReuniao.trim() || null }),
    });
    if (!res.ok) return toast.error("Erro ao salvar. Tente novamente.");
    const updated = await res.json();
    setGrupoFormacao(updated);
    setEditOpen(false);
    toast.success(`${termoGrupoFormacao} atualizado!`);
    startTransition(() => router.refresh());
  }

  async function handleSalvarComentario() {
    if (!novoFormandoId || !novoTexto.trim()) return;
    const formando = allFormandos.find((f) => f.id === novoFormandoId);
    if (!formando) return;
    const res = await fetch("/api/comentarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formandoId: novoFormandoId, texto: novoTexto.trim(), tipo: novoTipo }),
    });
    if (!res.ok) { toast.error("Erro ao registrar comentário."); return; }
    const created = await res.json() as ComentarioFormando;
    setComentarios((prev) => [created, ...prev]);
    setComentarioOpen(false);
    setNovoFormandoId("");
    setNovoTexto("");
    setNovoTipo("observacao");
    toast.success("Comentário registrado com sucesso!");
  }

  // Formandos CRUD
  function openCreateFormando() {
    setEditingFormando(null);
    setFormandoForm(EMPTY_FORMANDO_FORM);
    setFormDialogOpen(true);
  }

  function openEditFormando(f: Formando, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setEditingFormando(f);
    setFormandoForm({
      nome: f.nome,
      dataNascimento: f.dataNascimento ?? "",
      estadoCivil: f.estadoCivil,
      modalidade: f.modalidade,
      dataIngresso: f.dataIngresso,
      telefone: f.telefone,
      email: f.email,
    });
    setFormDialogOpen(true);
  }

  function openDeleteFormandoDialog(f: Formando, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setEditingFormando(f);
    setDeleteFormandoOpen(true);
  }

  async function handleSaveFormando() {
    if (!formandoForm.nome.trim()) return toast.error("Nome é obrigatório.");
    if (!formandoForm.email.trim()) return toast.error("E-mail é obrigatório.");

    const nivelFormativo: NivelFormativo = grupoFormacao.nivelFormativo ?? "pre-discipulado";
    const dataIngresso = formandoForm.dataIngresso || new Date().toISOString().split("T")[0];
    const payload = {
      nome: formandoForm.nome.trim(),
      dataNascimento: formandoForm.dataNascimento || undefined,
      estadoCivil: formandoForm.estadoCivil,
      modalidade: formandoForm.modalidade,
      nivelFormativo,
      dataIngresso,
      telefone: formandoForm.telefone.trim(),
      email: formandoForm.email.trim(),
      grupoFormacaoId: grupoFormacao.id,
      progressoEtapas: editingFormando?.progressoEtapas ?? [
        {
          nivel: nivelFormativo,
          formacoesComunitariasRealizadas: 0,
          retirosComunitariosRealizados: 0,
          retirosPessoaisRealizados: 0,
          iniciouEm: dataIngresso,
        },
      ],
    };

    const url = editingFormando ? `/api/formandos/${editingFormando.id}` : "/api/formandos";
    const method = editingFormando ? "PUT" : "POST";

    setSavingFormando(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        return toast.error(err.error ?? "Erro ao salvar formando.");
      }
      // Atualiza a grade imediatamente com o registro retornado — o formando novo
      // aparece na hora, sem depender do refresh do server component (que não
      // reidrata este useState). O refresh segue para reconciliar dados derivados.
      const saved = await res.json().catch(() => null) as Formando | null;
      if (saved?.id) {
        setAllFormandos((prev) =>
          editingFormando
            ? prev.map((f) => (f.id === saved.id ? saved : f))
            : [...prev, saved]
        );
      }
      toast.success(editingFormando ? `${termoFormando} atualizado!` : `${termoFormando} criado!`);
      setFormDialogOpen(false);
      startTransition(() => router.refresh());
    } finally {
      setSavingFormando(false);
    }
  }

  async function handleDeleteFormando() {
    if (!editingFormando) return;
    const res = await fetch(`/api/formandos/${editingFormando.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Erro ao excluir formando."); return; }
    const removedId = editingFormando.id;
    setAllFormandos((prev) => prev.filter((f) => f.id !== removedId));
    setDeleteFormandoOpen(false);
    setEditingFormando(null);
    toast.success(`${termoFormando} excluído.`);
    startTransition(() => router.refresh());
  }

  // Encerrar Etapa Formativa
  async function handleEncerrarEtapa() {
    setEncerrarLoading(true);
    const body: Record<string, string> = {};
    if (encerrarForm.encerradoEm) body.encerradoEm = encerrarForm.encerradoEm;
    const res = await fetch(`/api/grupos-formacao/${id}/encerrar-etapa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setEncerrarLoading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      return toast.error(err.error ?? "Erro ao encerrar etapa.");
    }
    const updated = await res.json();
    setGrupoFormacao(updated);
    setEncerrarOpen(false);
    toast.success("Etapa encerrada com sucesso!");
    startTransition(() => router.refresh());
  }

  // Nova Etapa Formativa
  function openNovaEtapa() {
    setNovaEtapaForm({ vigenciaInicio: "", dataMissaCompromisso: "" });
    setNovaEtapaOpen(true);
  }

  async function handleSaveNovaEtapa() {
    if (!novaEtapaForm.vigenciaInicio) return toast.error("Data de início é obrigatória.");
    if (!novaEtapaForm.dataMissaCompromisso) return toast.error("Data da missa de compromisso é obrigatória.");
    setNovaEtapaLoading(true);
    const res = await fetch(`/api/grupos-formacao/${id}/nova-etapa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vigenciaInicio: novaEtapaForm.vigenciaInicio,
        dataMissaCompromisso: novaEtapaForm.dataMissaCompromisso,
      }),
    });
    setNovaEtapaLoading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      return toast.error(err.error ?? "Erro ao iniciar nova etapa.");
    }
    const updated = await res.json();
    setGrupoFormacao(updated);
    setNovaEtapaOpen(false);
    toast.success("Nova etapa formativa iniciada!");
    startTransition(() => router.refresh());
  }

  // Datas da Etapa Atual
  function openDatasEtapa() {
    setDatasEtapaForm({ dataMissaCompromisso: "", iniciouEm: grupoFormacao?.vigenciaInicio?.split("T")[0] ?? "" });
    setDatasEtapaOpen(true);
  }

  async function handleSaveDatasEtapa() {
    if (!datasEtapaForm.dataMissaCompromisso) return toast.error("Data da missa de compromisso é obrigatória.");
    if (!datasEtapaForm.iniciouEm) return toast.error("Data de início das atividades é obrigatória.");
    setDatasEtapaLoading(true);
    const res = await fetch(`/api/grupos-formacao/${id}/datas-etapa`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataMissaCompromisso: datasEtapaForm.dataMissaCompromisso,
        iniciouEm: datasEtapaForm.iniciouEm,
      }),
    });
    setDatasEtapaLoading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      return toast.error(err.error ?? "Erro ao salvar datas.");
    }
    setDatasEtapaOpen(false);
    toast.success("Datas da etapa registradas para todos os formandos.");
    startTransition(() => router.refresh());
  }

  async function salvarImagem(imagemUrl: string | null) {
    setImagemLoading(true);
    const res = await fetch(`/api/grupos-formacao/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagemUrl }),
    });
    setImagemLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      toast.error(body.error ?? "Erro ao salvar imagem.");
      return;
    }
    const updated = await res.json();
    setGrupoFormacao(updated);
    toast.success(imagemUrl ? "Imagem atualizada!" : "Imagem removida.");
    startTransition(() => router.refresh());
  }

  const presentes = formandosDaMorada.filter((f) => getPresenca(f.id)).length;
  const ausentes = formandosDaMorada.length - presentes;

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/grupos-formacao"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-3 -ml-1 text-muted-foreground")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {termoGrupoFormacao}s
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="relative shrink-0 group/imagem">
            <div
              className={cn(
                "h-14 w-14 rounded-xl overflow-hidden flex items-center justify-center text-primary",
                grupoFormacao.imagemUrl ? "bg-muted" : "bg-primary/10",
                (isFC || isAdmin) && "cursor-pointer"
              )}
              onClick={() => (isFC || isAdmin) && setImagemDialogOpen(true)}
              title={(isFC || isAdmin) ? "Clique para alterar a imagem" : undefined}
            >
              {resolveImageSrc(grupoFormacao.imagemUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveImageSrc(grupoFormacao.imagemUrl)!} alt={grupoFormacao.nome} className="h-full w-full object-cover" />
              ) : (
                <NivelFormativoIcon nivel={grupoFormacao.nivelFormativo} className="size-7" />
              )}
              {(isFC || isAdmin) && (
                <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover/imagem:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground">{grupoFormacao.nome}</h1>
              {grupoFormacao.nivelFormativo ? (
                <Badge variant="outline" className={NIVEL_CORES[grupoFormacao.nivelFormativo]}>
                  {etapaLabels[grupoFormacao.nivelFormativo]}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
                  Grupo Livre
                </Badge>
              )}
              <Badge
                variant="outline"
                className={grupoFormacao.ativo ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500"}
              >
                {grupoFormacao.ativo ? "Ativa" : "Inativa"}
              </Badge>
            </div>
            {grupoFormacao.localReuniao && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {grupoFormacao.localReuniao}
              </p>
            )}
            {(grupoFormacao.vigenciaInicio || grupoFormacao.vigenciaFim) && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {grupoFormacao.vigenciaInicio
                  ? format(parseISO(grupoFormacao.vigenciaInicio), "dd/MM/yyyy", { locale: ptBR })
                  : "—"}{" "}
                até{" "}
                {grupoFormacao.vigenciaFim
                  ? format(parseISO(grupoFormacao.vigenciaFim), "dd/MM/yyyy", { locale: ptBR })
                  : "—"}
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            {(isFC || isAdmin || isFormadorGeral) && grupoFormacao.tipo === "estruturado" && !grupoFormacao.vigenciaFim && (
              <Button variant="outline" size="sm" onClick={openDatasEtapa} className="gap-1.5 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Datas da Etapa
              </Button>
            )}
            {(isFC || isAdmin || isFormadorGeral) && grupoFormacao.tipo === "estruturado" && !grupoFormacao.vigenciaFim && currentNivelIdx < NIVEL_SEQUENCE.length - 1 && (
              <Button variant="outline" size="sm" onClick={() => { setEncerrarForm({ encerradoEm: "" }); setEncerrarOpen(true); }} className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50">
                <Flag className="h-4 w-4" />
                Encerrar Etapa
              </Button>
            )}
            {(isFC || isAdmin || isFormadorGeral) && grupoFormacao.tipo === "estruturado" && currentNivelIdx < NIVEL_SEQUENCE.length - 1 && (
              <Button
                variant="outline" size="sm"
                onClick={openNovaEtapa}
                disabled={!grupoFormacao.vigenciaFim}
                className="gap-1.5"
                title={!grupoFormacao.vigenciaFim ? "Encerre a etapa atual antes de avançar" : undefined}
              >
                <TrendingUp className="h-4 w-4" />
                Nova Etapa
              </Button>
            )}
            {(isFC || isAdmin || isFormadorGeral) && (
              <Button variant="outline" size="sm" onClick={openEdit}>
                <Pencil className="h-4 w-4 mr-1.5" />
                Editar
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{formandosDaMorada.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{termoFormando}s</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{agendamentosDaMorada.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Agendamentos</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{realizadas.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Realizadas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="resumo">
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TabsList className="bg-muted/50 h-9 min-w-max">
          <TabsTrigger value="resumo" className="text-xs h-7 gap-1.5">
            <Home className="h-3.5 w-3.5" />
            Resumo
          </TabsTrigger>
          <TabsTrigger value="formandos" className="text-xs h-7 gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {termoFormando}s
          </TabsTrigger>
          <TabsTrigger value="presenca" className="text-xs h-7 gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            Presença
          </TabsTrigger>
          <TabsTrigger value="jornada" className="text-xs h-7 gap-1.5">
            <GitBranch className="h-3.5 w-3.5" />
            Jornada
          </TabsTrigger>
          <TabsTrigger value="comentarios" className="text-xs h-7 gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Comentários
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="text-xs h-7 gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Relatórios
          </TabsTrigger>
          <TabsTrigger value="leituras" className="text-xs h-7 gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Leituras
          </TabsTrigger>
        </TabsList>
        </div>

        {/* TAB RESUMO */}
        <TabsContent value="resumo" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Formador Responsável</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {formador ? (
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                      {resolveImageSrc(formador.foto) && <AvatarImage src={resolveImageSrc(formador.foto)!} alt={formador.nome} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {formador.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{formador.nome}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {formador.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-amber-600">Nenhum formador responsável indicado</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Período Formativo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <NivelFormativoIcon nivel={grupoFormacao.nivelFormativo} className="size-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {grupoFormacao.nivelFormativo ? etapaLabels[grupoFormacao.nivelFormativo] : "Grupo Livre"}
                    </p>
                    {grupoFormacao.vigenciaInicio && grupoFormacao.vigenciaFim ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(grupoFormacao.vigenciaInicio), "dd/MM/yyyy", { locale: ptBR })}
                        {" — "}
                        {format(parseISO(grupoFormacao.vigenciaFim), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">Vigência não definida</p>
                    )}
                  </div>
                </div>
                {currentNivelIdx < NIVEL_SEQUENCE.length - 1 && (
                  <p className="text-xs text-muted-foreground">
                    Próxima etapa: <span className="font-medium text-foreground">{etapaLabels[NIVEL_SEQUENCE[currentNivelIdx + 1]]}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Plano & Grade Formativos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {plano ? (
                <div className="flex items-start gap-2">
                  <BookOpen className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground">{plano.nome}</p>
                    {plano.vigenciaInicio && plano.vigenciaFim && (
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(plano.vigenciaInicio), "dd/MM/yyyy")} —{" "}
                        {format(parseISO(plano.vigenciaFim), "dd/MM/yyyy")}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum plano vinculado</p>
              )}
              {grade ? (
                <div className="flex items-start gap-2 mt-2">
                  <BookOpen className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground">{grade.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      v{grade.versao} · {grade.eixos.length} eixos · {grade.totalFormacoes} formações
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">Nenhuma grade vinculada</p>
              )}
            </CardContent>
          </Card>

          {grade && grade.eixos.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Eixos Pedagógicos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {grade.eixos.map((eixo) => (
                    <div
                      key={eixo.id}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent text-accent-foreground text-xs font-medium"
                    >
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: eixo.cor ?? "#3B82F6" }} />
                      {eixo.nome}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {agendamentosDaMorada.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Próximos Agendamentos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {agendamentosDaMorada.slice(0, 4).map((ag) => (
                  <div key={ag.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{ag.formacaoTema}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(ag.dataInicio), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        {ag.local && ` · ${ag.local}`}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_FORMACAO_STYLES[ag.status]}`}>
                      {STATUS_FORMACAO_LABELS[ag.status]}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB FORMANDOS */}
        <TabsContent value="formandos" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={`Buscar ${termoFormando.toLowerCase()}...`}
                value={formSearch}
                onChange={(e) => setFormSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select
              value={formNivelFilter}
              onValueChange={(v) => setFormNivelFilter(v ?? "todos")}
              items={{ todos: "Todos os níveis", ...etapaLabels }}
            >
              <SelectTrigger className="h-9 w-full sm:w-48 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os níveis</SelectItem>
                {NIVEL_SEQUENCE.map((nivel) => (
                  <SelectItem key={nivel} value={nivel}>{etapaLabels[nivel]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="inline-flex h-9 items-center rounded-md border border-border bg-background p-0.5">
              <button
                type="button"
                aria-label="Visualização em cards"
                aria-pressed={formandoView === "cards"}
                onClick={() => setFormandoView("cards")}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-[5px] transition-colors",
                  formandoView === "cards" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Visualização em lista"
                aria-pressed={formandoView === "lista"}
                onClick={() => setFormandoView("lista")}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-[5px] transition-colors",
                  formandoView === "lista" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Button size="sm" onClick={openCreateFormando} className="shrink-0 gap-1.5">
              <Plus className="h-4 w-4" />
              Novo {termoFormando}
            </Button>
          </div>

          {filteredFormandos.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  {formandosDaMorada.length === 0
                    ? `Nenhum ${termoFormando.toLowerCase()} nesta ${termoGrupoFormacao.toLowerCase()}`
                    : "Nenhum resultado encontrado"}
                </p>
                {formandosDaMorada.length === 0 && (
                  <Button size="sm" variant="outline" onClick={openCreateFormando} className="mt-3 gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar {termoFormando}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : formandoView === "cards" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFormandos.map((formando) => {
                const progresso = formando.totalFormacoes > 0 ? Math.round((formando.formacoesRealizadas / formando.totalFormacoes) * 100) : 0;
                const { total, presentes: pres, pct } = calcPresencaFormando(formando.id);
                const initials = formando.nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
                const idade = idadeEmAnos(formando.dataNascimento);

                return (
                  <Card key={formando.id} className="border-0 shadow-sm hover:shadow-md transition-all group">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className={`text-sm font-semibold ${NIVEL_CORES[formando.nivelFormativo]}`}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/formandos/${formando.id}`}
                              className="text-sm font-semibold hover:text-primary transition-colors truncate"
                            >
                              {formando.nome}
                            </Link>
                            <DropdownMenu>
                              <DropdownMenuTrigger className="inline-flex h-6 w-6 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted shrink-0">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => openEditFormando(formando, e)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={(e) => openDeleteFormandoDialog(formando, e)}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {idade !== null ? `${idade} anos · ` : ""}{MODALIDADE_LABELS[formando.modalidade]}
                            {total > 0 && ` · ${pres}/${total} presenças`}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-xs mb-3 ${NIVEL_CORES[formando.nivelFormativo]}`}>
                        {etapaLabels[formando.nivelFormativo]}
                      </Badge>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="font-medium">{formando.formacoesRealizadas}/{formando.totalFormacoes}</span>
                        </div>
                        <Progress value={progresso} className="h-1.5" />
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
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="divide-y divide-border/60">
                {filteredFormandos.map((formando) => {
                  const progresso = formando.totalFormacoes > 0 ? Math.round((formando.formacoesRealizadas / formando.totalFormacoes) * 100) : 0;
                  const initials = formando.nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
                  return (
                    <div key={formando.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className={`text-xs font-semibold ${NIVEL_CORES[formando.nivelFormativo]}`}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/formandos/${formando.id}`}
                          className="text-sm font-semibold hover:text-primary transition-colors truncate block"
                        >
                          {formando.nome}
                        </Link>
                        <p className="text-xs text-muted-foreground truncate">
                          {MODALIDADE_LABELS[formando.modalidade]}
                          {" · Desde "}
                          {format(parseISO(formando.dataIngresso), "MMM yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <Badge variant="outline" className={`hidden sm:inline-flex text-xs shrink-0 ${NIVEL_CORES[formando.nivelFormativo]}`}>
                        {etapaLabels[formando.nivelFormativo]}
                      </Badge>
                      <div className="hidden md:flex items-center gap-2 w-32 shrink-0">
                        <Progress value={progresso} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                          {formando.formacoesRealizadas}/{formando.totalFormacoes}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs shrink-0 ${formando.ativo ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500"}`}
                      >
                        {formando.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => openEditFormando(formando, e)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={(e) => openDeleteFormandoDialog(formando, e)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* TAB PRESENÇA */}
        <TabsContent value="presenca" className="mt-4 space-y-4">
          {formandosDaMorada.length > 0 && realizadas.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Adesão por {termoFormando}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {formandosDaMorada.map((f) => {
                    const { total, presentes: pres, pct } = calcPresencaFormando(f.id);
                    if (total === 0) return null;
                    return (
                      <div key={f.id} className="flex items-center gap-3">
                        <p className="text-xs font-medium w-32 truncate shrink-0">{f.nome.split(" ")[0]}</p>
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                          {pres}/{total} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {agendamentosPresenca.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <EmptyState
                  icon={Calendar}
                  title="Nenhuma formação agendada para esta morada"
                  description="A presença é registrada em formações agendadas, não na grade. Agende uma formação desta morada na Agenda para começar a marcar presença."
                  action={
                    <Button onClick={() => router.push("/agenda")}>
                      <Calendar className="h-4 w-4" />
                      Ir para a Agenda
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-5">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground mb-1.5">Selecionar Formação</p>
                    <Select value={agendamentoId} onValueChange={(v) => v && setAgendamentoId(v)} items={Object.fromEntries(agendamentosPresenca.map((a) => [a.id, `${a.formacaoTema} — ${format(parseISO(a.dataInicio), "dd/MM/yyyy", { locale: ptBR })}`]))}>
                      <SelectTrigger className="w-full sm:w-96">
                        <SelectValue placeholder="Escolha uma formação..." />
                      </SelectTrigger>
                      <SelectContent>
                        {agendamentosPresenca.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.formacaoTema} —{" "}
                            {format(parseISO(a.dataInicio), "dd/MM/yyyy", { locale: ptBR })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {agendamento && (
                    <div className="flex gap-3 text-sm">
                      <span className="flex items-center gap-1.5 text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-semibold">{presentes}</span>
                        <span className="text-muted-foreground">presentes</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-red-500">
                        <XCircle className="h-4 w-4" />
                        <span className="font-semibold">{ausentes}</span>
                        <span className="text-muted-foreground">ausentes</span>
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {agendamentosPresenca.length === 0 ? null : agendamento ? (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-sm">{agendamento.formacaoTema}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(parseISO(agendamento.dataInicio), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      {agendamento.local && ` · ${agendamento.local}`}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">Salvo automaticamente</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {formandosDaMorada.map((formando) => {
                    const presente = getPresenca(formando.id);
                    return (
                      <div
                        key={formando.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer select-none",
                          presente
                            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                            : "border-border bg-card hover:bg-muted/40"
                        )}
                        onClick={() => togglePresenca(formando.id, formando.nome)}
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                            {formando.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{formando.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {etapaLabels[formando.nivelFormativo]}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs font-medium", presente ? "text-emerald-600" : "text-muted-foreground")}>
                            {presente ? "Presente" : "Ausente"}
                          </span>
                          {presente ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <ClipboardList className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  Selecione uma formação para registrar a presença
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB JORNADA (item 3.1) */}
        <TabsContent value="jornada" className="mt-4 space-y-4">
          {jornada.totalAtivos === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <EmptyState
                  icon={GitBranch}
                  title={`Sem ${termoFormando.toLowerCase()}s ativos`}
                  description={`Cadastre ou ative ${termoFormando.toLowerCase()}s nesta ${termoGrupoFormacao.toLowerCase()} para acompanhar a jornada formativa.`}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Export do relatório do grupo (item 3.2) */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Panorama da jornada</p>
                <DropdownMenu>
                  <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs gap-1.5")}>
                    <Download className="h-3.5 w-3.5" /> Exportar
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => window.open(`/api/grupos-formacao/${grupoFormacao.id}/relatorio?formato=pdf`, "_blank")}>
                      <FileText className="h-4 w-4 mr-2" /> Relatório PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.open(`/api/grupos-formacao/${grupoFormacao.id}/relatorio?formato=csv`, "_blank")}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" /> Planilha CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Funil de etapas */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-primary" /> Distribuição por etapa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {jornada.funil.map((f) => {
                    const atual = grupoFormacao.nivelFormativo === f.nivel;
                    return (
                      <div key={f.nivel} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className={cn("font-medium", atual ? "text-primary" : "text-foreground")}>
                            {etapaLabels[f.nivel]}{atual ? " · atual" : ""}
                          </span>
                          <span className="text-muted-foreground">{f.quantidade} · {f.percentual}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all duration-500", NIVEL_BAR_COLORS[f.nivel])} style={{ width: `${f.percentual}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Progresso na etapa */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" /> Progresso na etapa
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">média {jornada.progressoMedio}%</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <Progress value={jornada.progressoMedio} className="h-1.5" />
                  <div className="space-y-1 pt-1">
                    {jornada.membros.map((m) => (
                      <Link
                        key={m.id}
                        href={`/formandos/${m.id}`}
                        className="flex items-center gap-3 rounded-lg p-1.5 -mx-1.5 transition-colors hover:bg-muted/60"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">{m.nome}</span>
                        {m.podeAvancar && (
                          <Badge variant="outline" className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]">
                            pode avançar
                          </Badge>
                        )}
                        <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary/70" style={{ width: `${m.pct}%` }} />
                        </div>
                        <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{m.done}/{m.total}</span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Precisam de atenção ("quem parou") */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" /> Precisam de atenção
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {jornada.atencao.length === 0 ? (
                    <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Ninguém em risco no momento.
                    </p>
                  ) : (
                    jornada.atencao.map((m) => (
                      <Link
                        key={m.id}
                        href={`/formandos/${m.id}`}
                        className="flex items-center gap-2.5 rounded-lg p-2 -mx-2 transition-colors hover:bg-muted/60"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">{m.nome}</span>
                        <span className="flex shrink-0 flex-wrap justify-end gap-1">
                          {m.motivos.map((mot, i) => (
                            <Badge key={i} variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[10px]">
                              {mot}
                            </Badge>
                          ))}
                        </span>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* TAB COMENTÁRIOS */}
        <TabsContent value="comentarios" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setComentarioOpen(true)} className="gap-1.5">
              <MessageSquare className="h-4 w-4" />
              Novo Comentário
            </Button>
          </div>

          {comentariosDaMorada.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum comentário registrado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {comentariosDaMorada.map((comentario) => {
                const formando = allFormandos.find((f) => f.id === comentario.formandoId);
                const initials = comentario.formandoNome.split(" ").map((n) => n[0]).slice(0, 2).join("");
                return (
                  <Card key={comentario.id} className="border-0 shadow-sm">
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
                                {etapaLabels[formando.nivelFormativo]}
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
            </div>
          )}
        </TabsContent>

        {/* TAB RELATÓRIOS */}
        <TabsContent value="relatorios" className="mt-4 space-y-3">
          {formandosDaMorada.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum {termoFormando.toLowerCase()} nesta {termoGrupoFormacao.toLowerCase()}.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {formandosDaMorada.filter((f) => f.ativo).map((formando) => {
                const rel = relatorios.find(
                  (r) => r.formandoId === formando.id && r.nivelFormativo === formando.nivelFormativo
                );
                const initials = formando.nome.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();
                const isExpanded = expandedRelatorioId === formando.id;
                return (
                  <Card key={formando.id} className="border-0 shadow-sm overflow-hidden">
                    <CardContent className="p-3">
                      {/* Linha do formando */}
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0">
                          {resolveImageSrc(formando.foto) && <AvatarImage src={resolveImageSrc(formando.foto)!} alt={formando.nome} />}
                          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{formando.nome}</p>
                          <p className="text-xs text-muted-foreground">{NIVEL_FORMATIVO_LABELS[formando.nivelFormativo]}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {rel ? (
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border",
                              STATUS_RELATORIO_CORES[rel.status]
                            )}>
                              {rel.status === "rascunho" ? "Rascunho" : "Finalizado"}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Não iniciado</span>
                          )}
                          <Button
                            size="sm"
                            variant={rel?.status === "finalizado" ? "outline" : rel ? "secondary" : "default"}
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              if (rel?.status === "finalizado") {
                                setExpandedRelatorioId(isExpanded ? null : formando.id);
                              } else {
                                abrirRelatorio(formando);
                              }
                            }}
                          >
                            {rel?.status === "finalizado" ? (
                              <>
                                Ver
                                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </>
                            ) : rel ? "Editar" : "Iniciar"}
                          </Button>
                        </div>
                      </div>

                      {/* Conteúdo sanfona — só para relatórios finalizados */}
                      {rel?.status === "finalizado" && isExpanded && (
                        <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
                          {/* Avaliação por perspectiva */}
                          {(rel.avaliacaoHumana || rel.avaliacaoEspiritual || rel.avaliacaoComunitaria) && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avaliação por Perspectiva</p>
                              <div className="flex flex-wrap gap-2">
                                {(["humana", "espiritual", "comunitaria"] as const).map((p) => {
                                  const nota = p === "humana" ? rel.avaliacaoHumana
                                    : p === "espiritual" ? rel.avaliacaoEspiritual
                                    : rel.avaliacaoComunitaria;
                                  if (!nota) return null;
                                  return (
                                    <div key={p} className="flex items-center gap-1.5">
                                      <span className="text-xs text-muted-foreground">{PERSPECTIVA_LABELS[p]}:</span>
                                      <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", NOTA_ADESAO_CORES[nota])}>
                                        {NOTA_ADESAO_LABELS[nota]}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Narrativa */}
                          {rel.textoNarrativo && (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Narrativa</p>
                              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{rel.textoNarrativo}</p>
                            </div>
                          )}

                          {/* Pontos + Desafios */}
                          {(rel.pontosForteza || rel.desafios) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {rel.pontosForteza && (
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pontos de Fortaleza</p>
                                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{rel.pontosForteza}</p>
                                </div>
                              )}
                              {rel.desafios && (
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Desafios a Trabalhar</p>
                                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{rel.desafios}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Recomendação */}
                          {rel.recomendacao && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recomendação</p>
                              <div className="flex flex-wrap items-start gap-2">
                                <span className={cn("inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium", RECOMENDACAO_CORES[rel.recomendacao])}>
                                  {RECOMENDACAO_LABELS[rel.recomendacao]}
                                </span>
                                {rel.textoRecomendacao && (
                                  <p className="text-sm text-muted-foreground leading-relaxed">{rel.textoRecomendacao}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB LEITURAS — livros indicados ao grupo (jornada de leitura do formando) */}
        <TabsContent value="leituras" className="mt-4 space-y-4">
          <LeiturasManager
            apiBase={`/api/grupos-formacao/${id}/leituras`}
            leituras={initialLeituras}
            podeGerir={podeGerirLeituras}
            contexto="formativo"
          />
        </TabsContent>
      </Tabs>

      {/* Edit Morada Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar {termoGrupoFormacao}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input
                value={editForm.nome}
                onChange={(e) => setEditForm((p) => ({ ...p, nome: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Local de reunião</Label>
              <Input
                value={editForm.localReuniao}
                onChange={(e) => setEditForm((p) => ({ ...p, localReuniao: e.target.value }))}
                placeholder="Ex: Paróquia São João, Salão 2"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Encerrar Etapa Formativa Dialog */}
      <Dialog open={encerrarOpen} onOpenChange={setEncerrarOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Encerrar Etapa Formativa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <p className="font-medium mb-1">Etapa a encerrar:</p>
              <p>
                <NivelFormativoIcon nivel={grupoFormacao.nivelFormativo} className="mr-1 inline size-4 align-text-bottom" />
                {grupoFormacao.nivelFormativo ? etapaLabels[grupoFormacao.nivelFormativo] : "Grupo Livre"}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Esta ação registará a data de encerramento da etapa atual na {termoGrupoFormacao.toLowerCase()} e em todos os {termoFormando.toLowerCase()}s associados. Após o encerramento, o botão <span className="font-medium text-foreground">Nova Etapa</span> ficará disponível.
            </p>
            <div className="grid gap-1.5">
              <Label>Data de encerramento <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={encerrarForm.encerradoEm}
                onChange={(e) => setEncerrarForm({ encerradoEm: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Data da última atividade formativa da etapa.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEncerrarOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleEncerrarEtapa}
              disabled={encerrarLoading || !encerrarForm.encerradoEm}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Flag className="h-4 w-4" />
              {encerrarLoading ? "Encerrando..." : "Confirmar Encerramento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nova Etapa Formativa Dialog */}
      <Dialog open={novaEtapaOpen} onOpenChange={setNovaEtapaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar Nova Etapa Formativa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <p>Etapa atual encerrada: <span className="font-medium text-foreground"><NivelFormativoIcon nivel={grupoFormacao.nivelFormativo} className="mr-1 inline size-4 align-text-bottom" />{grupoFormacao.nivelFormativo ? etapaLabels[grupoFormacao.nivelFormativo] : "Grupo Livre"}</span></p>
              <p className="mt-1">Próxima etapa: <span className="font-medium text-foreground">{nextEtapaOptions[0] && <NivelFormativoIcon nivel={nextEtapaOptions[0]} className="mr-1 inline size-4 align-text-bottom" />}{etapaLabels[nextEtapaOptions[0]]}</span></p>
            </div>
            <p className="text-sm text-muted-foreground">
              Ao confirmar, declaro que não há pendências administrativas, formativas ou documentais neste grupo formativo e que estamos prontos para avançar.
            </p>
            <div className="grid gap-1.5">
              <Label>Data da Missa de Compromisso <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={novaEtapaForm.dataMissaCompromisso}
                onChange={(e) => setNovaEtapaForm((p) => ({ ...p, dataMissaCompromisso: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Data do compromisso formal de entrada na nova etapa.</p>
            </div>
            <div className="grid gap-1.5">
              <Label>Data de início das atividades <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={novaEtapaForm.vigenciaInicio}
                onChange={(e) => setNovaEtapaForm((p) => ({ ...p, vigenciaInicio: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Data de início das atividades formativas do grupo.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNovaEtapaOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveNovaEtapa} disabled={novaEtapaLoading} className="gap-1.5">
              <TrendingUp className="h-4 w-4" />
              {novaEtapaLoading ? "Iniciando..." : "Confirmar e Avançar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Datas da Etapa Atual Dialog */}
      <Dialog open={datasEtapaOpen} onOpenChange={setDatasEtapaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Datas da Etapa Atual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              As datas serão registradas para todos os {termoFormando.toLowerCase()}s da {termoGrupoFormacao.toLowerCase()}.
            </p>
            <div className="grid gap-1.5">
              <Label>Data da Missa de Compromisso <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={datasEtapaForm.dataMissaCompromisso}
                onChange={(e) => setDatasEtapaForm((p) => ({ ...p, dataMissaCompromisso: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Data de início das atividades <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={datasEtapaForm.iniciouEm}
                onChange={(e) => setDatasEtapaForm((p) => ({ ...p, iniciouEm: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDatasEtapaOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveDatasEtapa} disabled={datasEtapaLoading}>
              {datasEtapaLoading ? "Salvando..." : "Salvar Datas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comentário Dialog */}
      <Dialog open={comentarioOpen} onOpenChange={setComentarioOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Comentário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{termoFormando}</Label>
              <Select value={novoFormandoId} onValueChange={(v) => setNovoFormandoId(v ?? "")} items={Object.fromEntries(formandosDaMorada.filter((f) => f.ativo).map((f) => [f.id, f.nome]))}>
                <SelectTrigger>
                  <SelectValue placeholder={`Selecione o ${termoFormando.toLowerCase()}...`} />
                </SelectTrigger>
                <SelectContent>
                  {formandosDaMorada.filter((f) => f.ativo).map((f) => (
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
                  {(["adesao", "dificuldade", "progresso", "observacao"] as TipoComentario[]).map((t) => (
                    <SelectItem key={t} value={t}>{TIPO_COMENTARIO_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Comentário</Label>
              <Textarea
                placeholder="Descreva sua observação..."
                className="min-h-24 resize-none"
                value={novoTexto}
                onChange={(e) => setNovoTexto(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setComentarioOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvarComentario} disabled={!novoFormandoId || !novoTexto.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Formando Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFormando ? `Editar ${termoFormando}` : `Novo ${termoFormando}`}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Nome completo <span className="text-destructive">*</span></Label>
              <Input
                value={formandoForm.nome}
                onChange={(e) => setFormandoForm((p) => ({ ...p, nome: e.target.value }))}
                placeholder="Nome Sobrenome"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Data de nascimento</Label>
                <Input
                  type="date"
                  value={formandoForm.dataNascimento}
                  onChange={(e) => setFormandoForm((p) => ({ ...p, dataNascimento: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Estado civil</Label>
                <Select
                  value={formandoForm.estadoCivil}
                  onValueChange={(v) => v && setFormandoForm((p) => ({ ...p, estadoCivil: v as typeof p.estadoCivil }))}
                  items={ESTADO_CIVIL_LABELS}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ESTADO_CIVIL_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>E-mail <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  value={formandoForm.email}
                  onChange={(e) => setFormandoForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Telefone</Label>
                <Input
                  value={formandoForm.telefone}
                  onChange={(e) => setFormandoForm((p) => ({ ...p, telefone: e.target.value }))}
                  placeholder="(85) 99999-0000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Modalidade</Label>
                <Select
                  value={formandoForm.modalidade}
                  onValueChange={(v) => v && setFormandoForm((p) => ({ ...p, modalidade: v as Modalidade }))}
                  items={MODALIDADE_LABELS}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="hibrida">Híbrida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Data de ingresso</Label>
                <Input
                  type="date"
                  value={formandoForm.dataIngresso}
                  onChange={(e) => setFormandoForm((p) => ({ ...p, dataIngresso: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Etapa Formativa</Label>
              <Input value={grupoFormacao.nivelFormativo ? etapaLabels[grupoFormacao.nivelFormativo] : "Grupo Livre"} disabled className="bg-muted/50" />
              <p className="text-xs text-muted-foreground">Definida automaticamente pela {termoGrupoFormacao.toLowerCase()}.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFormDialogOpen(false)} disabled={savingFormando}>Cancelar</Button>
            <Button onClick={handleSaveFormando} disabled={savingFormando}>
              {savingFormando ? "Salvando..." : editingFormando ? "Salvar alterações" : `Criar ${termoFormando.toLowerCase()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Formando Dialog */}
      <Dialog open={deleteFormandoOpen} onOpenChange={setDeleteFormandoOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir {termoFormando.toLowerCase()}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir{" "}
            <span className="font-medium text-foreground">{editingFormando?.nome}</span>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteFormandoOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteFormando}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Imagem da Morada */}
      <ImageCropDialog
        open={imagemDialogOpen}
        onOpenChange={setImagemDialogOpen}
        title="Imagem de identificação"
        hasImage={!!grupoFormacao.imagemUrl}
        uploadEndpoint="/api/imagens"
        onSave={(imageData) => salvarImagem(imageData)}
        onRemove={() => salvarImagem(null)}
      />

      {/* Relatório Dialog */}
      {relatorioDialogOpen && relatorioFormando && (
        <RelatorioDialog
          open={relatorioDialogOpen}
          onClose={() => setRelatorioDialogOpen(false)}
          formando={relatorioFormando}
          nivelFormativo={relatorioFormando.nivelFormativo}
          relatorio={relatorioSelecionado}
          onSaved={onRelatorioSaved}
        />
      )}
    </div>
  );
}
