"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, CheckCircle2, FileText, XCircle, AlertCircle, Clock, Loader2, Download } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type ProcessoEclesiastico,
  type DocumentoEclesiastico,
  type TipoProcessoEclesiastico,
  type TipoRegistroPromessa,
  type StatusProcessoEclesiastico,
  type StatusDocumentoEclesiastico,
  type RegistroPromessaResumo,
  STATUS_PROCESSO_LABELS,
  STATUS_PROCESSO_COLORS,
  TIPO_REGISTRO_PROMESSA_LABELS,
  temPermissao,
} from "@/types";
import {
  getTransicoesDisponiveis,
  podeEditarFormulario,
  TIPO_DOCUMENTO_LABELS,
  getTipoLabel,
  type TermosProcesso,
} from "@/lib/jornada-vocacional";

// Formando extra fields not in base ProcessoEclesiastico type
interface FormandoDetalhe {
  id: string;
  nome: string;
  dataNascimento: string;
  estadoCivil: string;
  telefone: string;
  email: string;
  nomeSocial: string | null;
  nacionalidade: string | null;
  rg: string | null;
  orgaoEmissor: string | null;
  cep: string | null;
  paroquiaReferencia: string | null;
  numFilhos: number | null;
}

interface ProcessoCompleto extends Omit<ProcessoEclesiastico, "documentos"> {
  formando: FormandoDetalhe;
  documentos: (DocumentoEclesiastico & { observacoes?: string | null; geradoPorId?: string | null })[];
  promessa?: RegistroPromessaResumo | null;
}

interface Props {
  processo: ProcessoCompleto;
  userRole: string;
  termos: TermosProcesso;
  /** Tipo de promessa quando o processo culmina num assento do Livro de Promessas. */
  promessaTipo?: TipoRegistroPromessa | null;
  /** Fórmula de consagração default (pré-preenche o textarea da lavratura). */
  promessaFormulaDefault?: string | null;
}

const STATUS_DOC_COLORS: Record<StatusDocumentoEclesiastico, string> = {
  pendente:   "bg-muted text-muted-foreground",
  gerado:     "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  assinado:   "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  arquivado:  "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
  substituido:"bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
};

const STATUS_DOC_LABELS: Record<StatusDocumentoEclesiastico, string> = {
  pendente:   "Pendente",
  gerado:     "Gerado",
  assinado:   "Assinado",
  arquivado:  "Arquivado",
  substituido:"Substituído",
};

const STATUS_ICONS: Partial<Record<StatusProcessoEclesiastico, React.ElementType>> = {
  rascunho:    AlertCircle,
  em_andamento: Clock,
  em_revisao:  Clock,
  aprovado:    CheckCircle2,
  concluido:   CheckCircle2,
  rejeitado:   XCircle,
  cancelado:   XCircle,
};

export default function ProcessoDetalheClient({ processo: initial, userRole, termos, promessaTipo, promessaFormulaDefault }: Props) {
  const router = useRouter();
  const [processo, setProcesso] = useState<ProcessoCompleto>(initial);
  const [isPending, startTransition] = useTransition();
  const [dadosForm, setDadosForm] = useState<Record<string, unknown>>(
    initial.dadosFormulario ?? {}
  );
  const [formDirty, setFormDirty] = useState(false);
  const [gerandoId, setGerandoId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [promessaDialogOpen, setPromessaDialogOpen] = useState(false);

  // Processo de promessa ainda sem assento lavrado → conclusão passa pelo modal.
  const exigePromessa = !!promessaTipo && !processo.promessa;

  const canEdit = podeEditarFormulario(processo.status, userRole);
  const transicoes = getTransicoesDisponiveis(processo.status, userRole);
  const StatusIcon = STATUS_ICONS[processo.status] ?? AlertCircle;

  function setField(key: string, value: unknown) {
    setDadosForm((prev) => ({ ...prev, [key]: value }));
    setFormDirty(true);
  }

  async function handleSalvarFormulario() {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/processos-eclesiasticos/${processo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dadosFormulario: dadosForm }),
      });
      if (!res.ok) {
        toast.error("Erro ao salvar formulário.");
        return;
      }
      setFormDirty(false);
      toast.success("Formulário salvo.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGerarPDF(docId: string) {
    setGerandoId(docId);
    try {
      const res = await fetch(
        `/api/processos-eclesiasticos/${processo.id}/documentos/${docId}/gerar`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Erro ao gerar PDF.");
        return;
      }
      const { arquivoId, geradoEm, versao } = await res.json();
      setProcesso((prev) => ({
        ...prev,
        documentos: prev.documentos.map((d) =>
          d.id === docId
            ? { ...d, arquivoId, geradoEm, versao, status: "gerado" as const }
            : d
        ),
      }));
      toast.success("PDF gerado com sucesso.");
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setGerandoId(null);
    }
  }

  function onTransicaoClick(novoStatus: StatusProcessoEclesiastico) {
    // Conclusão de promessa exige os dados da celebração (Livro de Promessas).
    if (novoStatus === "concluido" && exigePromessa) {
      setPromessaDialogOpen(true);
      return;
    }
    handleTransicao(novoStatus);
  }

  async function handleTransicao(
    novoStatus: StatusProcessoEclesiastico,
    promessa?: PromessaPayload
  ): Promise<boolean> {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/processos-eclesiasticos/${processo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus, ...(promessa ? { promessa } : {}) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Erro ao atualizar status.");
        return false;
      }
      toast.success(`Status atualizado: ${STATUS_PROCESSO_LABELS[novoStatus]}`);
      startTransition(() => router.refresh());
      setProcesso((prev) => ({ ...prev, status: novoStatus }));
      return true;
    } finally {
      setIsSaving(false);
    }
  }

  const f = processo.formando;

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/jornada-vocacional"
          className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground mb-0.5">Jornada Vocacional</p>
          <h1 className="text-xl font-semibold tracking-tight">{f.nome}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="text-sm text-muted-foreground">
              {getTipoLabel(processo.tipo, termos)}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-sm text-muted-foreground">{processo.nivelFormativo}</span>
            <span className="text-muted-foreground/40">·</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_PROCESSO_COLORS[processo.status]}`}
            >
              <StatusIcon className="h-3 w-3" />
              {STATUS_PROCESSO_LABELS[processo.status]}
            </span>
          </div>
        </div>

        {/* Botões de transição de status */}
        {transicoes.length > 0 && (
          <div className="flex gap-2 shrink-0">
            {transicoes.map((t) => (
              <Button
                key={t.para}
                size="sm"
                variant={t.para === "rejeitado" || t.para === "cancelado" ? "destructive" : "default"}
                disabled={isPending || isSaving}
                onClick={() => onTransicaoClick(t.para)}
              >
                {(isPending || isSaving) && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {t.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <Separator />

      <Tabs defaultValue="formulario">
        <TabsList>
          <TabsTrigger value="formulario">Formulário</TabsTrigger>
          <TabsTrigger value="documentos">
            Documentos
            {processo.documentos.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {processo.documentos.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="info">Informações</TabsTrigger>
        </TabsList>

        {/* ── TAB: FORMULÁRIO ── */}
        <TabsContent value="formulario" className="space-y-6 pt-4">
          {!canEdit && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Este processo está em status <strong>{STATUS_PROCESSO_LABELS[processo.status]}</strong> e não pode ser editado.
            </div>
          )}

          <FormularioAdmissao
            dados={dadosForm}
            formando={f}
            onChange={setField}
            disabled={!canEdit}
            tipo={processo.tipo}
          />

          {canEdit && (
            <div className="flex justify-end">
              <Button onClick={handleSalvarFormulario} disabled={!formDirty || isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar formulário
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ── TAB: DOCUMENTOS ── */}
        <TabsContent value="documentos" className="pt-4">
          {processo.documentos.length === 0 ? (
            <Card>
              <CardContent className="py-14 flex flex-col items-center gap-3 text-muted-foreground">
                <FileText className="h-9 w-9 opacity-30" />
                <p className="text-sm">
                  {processo.status === "rascunho"
                    ? "Os documentos serão gerados quando o processo for iniciado."
                    : "Nenhum documento associado a este processo."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {processo.documentos.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="flex items-center justify-between py-3 px-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">
                          {TIPO_DOCUMENTO_LABELS[doc.tipo]}
                        </p>
                        {doc.geradoEm && (
                          <p className="text-xs text-muted-foreground">
                            Gerado em {format(parseISO(doc.geradoEm), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {doc.versao > 1 && (
                        <span className="text-xs text-muted-foreground">v{doc.versao}</span>
                      )}
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_DOC_COLORS[doc.status]}`}
                      >
                        {STATUS_DOC_LABELS[doc.status]}
                      </span>
                      {doc.arquivoId && (
                        <a
                          href={`/api/arquivos/${doc.arquivoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                        >
                          <Download className="h-3 w-3" />
                          Baixar
                        </a>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        disabled={gerandoId === doc.id || !temPermissao(userRole, "formador_geral")}
                        onClick={() => handleGerarPDF(doc.id)}
                      >
                        {gerandoId === doc.id
                          ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Gerando…</>
                          : doc.arquivoId ? "Regenerar" : "Gerar PDF"
                        }
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── TAB: INFORMAÇÕES ── */}
        <TabsContent value="info" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados do processo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow label="Membro" value={f.nome} />
              <InfoRow label="Tipo" value={getTipoLabel(processo.tipo, termos)} />
              <InfoRow label="Etapa" value={processo.nivelFormativo} />
              <InfoRow label="Status" value={STATUS_PROCESSO_LABELS[processo.status]} />
              <InfoRow label="Criado por" value={processo.criadoPorNome ?? "—"} />
              <InfoRow
                label="Criado em"
                value={format(parseISO(processo.criadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              />
              <InfoRow
                label="Atualizado em"
                value={format(parseISO(processo.atualizadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              />
            </CardContent>
          </Card>

          {processo.promessa && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Livro de Promessas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <InfoRow label="Tipo" value={TIPO_REGISTRO_PROMESSA_LABELS[processo.promessa.tipo]} />
                <InfoRow
                  label="Assento"
                  value={`Tomo ${processo.promessa.tomo}, Folha ${String(processo.promessa.folha).padStart(3, "0")}, Registro nº ${processo.promessa.numeroRegistro}`}
                />
                <InfoRow label="Celebrante" value={processo.promessa.celebrante} />
                <InfoRow label="Local da celebração" value={processo.promessa.localCelebracao} />
                <InfoRow label="Moderador(a) Geral" value={processo.promessa.moderadorGeral} />
                <InfoRow
                  label="Vigência"
                  value={
                    processo.promessa.dataVigenciaFim
                      ? `${format(parseISO(processo.promessa.dataVigenciaInicio), "dd/MM/yyyy")} a ${format(parseISO(processo.promessa.dataVigenciaFim), "dd/MM/yyyy")}`
                      : `${format(parseISO(processo.promessa.dataVigenciaInicio), "dd/MM/yyyy")} — perpétua`
                  }
                />
                <Link href="/livro-promessas" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  Ver no Livro de Promessas
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {promessaTipo && (
        <LavrarPromessaDialog
          open={promessaDialogOpen}
          onOpenChange={setPromessaDialogOpen}
          tipo={promessaTipo}
          formulaDefault={promessaFormulaDefault ?? ""}
          busy={isSaving}
          onConfirm={async (payload) => {
            const ok = await handleTransicao("concluido", payload);
            if (ok) setPromessaDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Formulário de admissão (Etapas 1 e 2) ────────────────────────────────────

interface FormularioProps {
  dados: Record<string, unknown>;
  formando: FormandoDetalhe;
  onChange: (key: string, value: unknown) => void;
  disabled: boolean;
  tipo: TipoProcessoEclesiastico;
}

function FormularioAdmissao({ dados, formando, onChange, disabled, tipo }: FormularioProps) {
  const isAdmissao = tipo === "admissao_etapa1" || tipo === "admissao_etapa2";
  const isRenovacao = tipo === "renovacao_promessas";

  function val(key: string, fallback = ""): string {
    const v = dados[key];
    return v !== undefined && v !== null ? String(v) : fallback;
  }

  if (isAdmissao) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Dados Pessoais</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome completo" value={val("nome_completo", formando.nome)} onChange={(v) => onChange("nome_completo", v)} disabled={disabled} />
            <Field label="Nome social" value={val("nome_social", formando.nomeSocial ?? "")} onChange={(v) => onChange("nome_social", v)} disabled={disabled} />
            <Field label="Nacionalidade" value={val("nacionalidade", formando.nacionalidade ?? "brasileiro(a)")} onChange={(v) => onChange("nacionalidade", v)} disabled={disabled} />
            <Field label="Estado civil" value={val("estado_civil", formando.estadoCivil)} onChange={(v) => onChange("estado_civil", v)} disabled={disabled} />
            <Field label="RG" value={val("rg", formando.rg ?? "")} onChange={(v) => onChange("rg", v)} disabled={disabled} />
            <Field label="Órgão emissor" value={val("orgao_emissor", formando.orgaoEmissor ?? "")} onChange={(v) => onChange("orgao_emissor", v)} disabled={disabled} />
            <Field label="Telefone" value={val("telefone", formando.telefone)} onChange={(v) => onChange("telefone", v)} disabled={disabled} />
            <Field label="E-mail" value={val("email", formando.email)} onChange={(v) => onChange("email", v)} disabled={disabled} />
            <Field label="CEP" value={val("cep", formando.cep ?? "")} onChange={(v) => onChange("cep", v)} disabled={disabled} />
            <Field label="Paróquia de referência" value={val("paroquia_referencia", formando.paroquiaReferencia ?? "")} onChange={(v) => onChange("paroquia_referencia", v)} disabled={disabled} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Dados do Processo</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Núcleo" value={val("nucleo")} onChange={(v) => onChange("nucleo", v)} disabled={disabled} />
            <Field label="Data de início" type="date" value={val("data_inicio")} onChange={(v) => onChange("data_inicio", v)} disabled={disabled} />
            <Field label="Data fim estimada" type="date" value={val("data_fim_estimada")} onChange={(v) => onChange("data_fim_estimada", v)} disabled={disabled} />
            <Field label="Responsável canônico" value={val("responsavel_canonico")} onChange={(v) => onChange("responsavel_canonico", v)} disabled={disabled} />
            <Field label="Cargo / Função" value={val("cargo_funcao")} onChange={(v) => onChange("cargo_funcao", v)} disabled={disabled} />
            <div className="col-span-full">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Observações / Condições</Label>
              <Textarea
                rows={3}
                value={val("observacoes_condicoes")}
                onChange={(e) => onChange("observacoes_condicoes", e.target.value)}
                disabled={disabled}
                className="resize-none text-sm"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isRenovacao) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Parecer Formativo Anual</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <DimensaoParecer
            titulo="Espiritual"
            campos={["participacao_sacramentos", "vida_oracao", "adesao_carisma"]}
            labels={["Participação nos sacramentos", "Vida de oração", "Adesão ao carisma"]}
            dados={dados}
            onChange={onChange}
            disabled={disabled}
          />
          <DimensaoParecer
            titulo="Comunitária"
            campos={["participacao_encontros", "relacao_fraterna", "zelo_responsabilidade"]}
            labels={["Participação nos encontros", "Relação fraterna", "Zelo e responsabilidade"]}
            dados={dados}
            onChange={onChange}
            disabled={disabled}
          />
          <DimensaoParecer
            titulo="Missionária"
            campos={["envolvimento_missao", "disponibilidade_servico", "testemunho_cristao"]}
            labels={["Envolvimento na missão", "Disponibilidade para o serviço", "Testemunho cristão"]}
            dados={dados}
            onChange={onChange}
            disabled={disabled}
          />
          <DimensaoParecer
            titulo="Humana"
            campos={["maturidade_afetiva", "cooperacao_dialogo"]}
            labels={["Maturidade afetiva", "Cooperação e diálogo"]}
            dados={dados}
            onChange={onChange}
            disabled={disabled}
          />
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Recomendações formativas</Label>
            <Textarea
              rows={3}
              value={dados["recomendacoes_formativas"] !== undefined ? String(dados["recomendacoes_formativas"]) : ""}
              onChange={(e) => onChange("recomendacoes_formativas", e.target.value)}
              disabled={disabled}
              className="resize-none text-sm"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
        <FileText className="h-8 w-8 opacity-30" />
        <p className="text-sm">Formulário específico para este tipo de processo em desenvolvimento.</p>
      </CardContent>
    </Card>
  );
}

function Field({
  label, value, onChange, disabled, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  type?: string;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="text-sm"
      />
    </div>
  );
}

const NOTA_OPTIONS = ["ótimo", "bom", "regular", "fraco"] as const;

function DimensaoParecer({
  titulo, campos, labels, dados, onChange, disabled,
}: {
  titulo: string;
  campos: string[];
  labels: string[];
  dados: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <p className="text-sm font-medium mb-2">{titulo}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {campos.map((campo, i) => (
          <div key={campo}>
            <Label className="text-xs text-muted-foreground mb-1.5 block">{labels[i]}</Label>
            <Select
              disabled={disabled}
              value={(dados[campo] as string) || undefined}
              onValueChange={(v) => onChange(campo, v)}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="— Selecionar —" />
              </SelectTrigger>
              <SelectContent>
                {NOTA_OPTIONS.map((n) => (
                  <SelectItem key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-muted-foreground min-w-32">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

// ─── Diálogo: lavrar registro no Livro de Promessas ───────────────────────────

interface PromessaPayload {
  dataCelebracao: string;
  localCelebracao: string;
  celebrante: string;
  moderadorGeral: string;
  formadorGeralLocal?: string;
  assistenteEclesiastico?: string;
  secretario: string;
  formulaTexto?: string;
  dataVigenciaInicio?: string;
  dataVigenciaFim?: string;
}

const hojeISO = () => new Date().toISOString().slice(0, 10);

function LavrarPromessaDialog({
  open, onOpenChange, tipo, formulaDefault, busy, onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipo: TipoRegistroPromessa;
  formulaDefault: string;
  busy: boolean;
  onConfirm: (payload: PromessaPayload) => void;
}) {
  const isDefinitivas = tipo === "definitivas";
  const [dataCelebracao, setDataCelebracao] = useState(hojeISO);
  const [localCelebracao, setLocalCelebracao] = useState("");
  const [celebrante, setCelebrante] = useState("");
  const [moderadorGeral, setModeradorGeral] = useState("");
  const [formadorGeralLocal, setFormadorGeralLocal] = useState("");
  const [assistenteEclesiastico, setAssistenteEclesiastico] = useState("");
  const [secretario, setSecretario] = useState("");
  const [dataVigenciaFim, setDataVigenciaFim] = useState("");
  const [formulaTexto, setFormulaTexto] = useState(formulaDefault);

  function submit() {
    if (!localCelebracao.trim() || !celebrante.trim() || !moderadorGeral.trim() || !secretario.trim()) {
      toast.error("Preencha local, celebrante, moderador(a) geral e secretário(a).");
      return;
    }
    onConfirm({
      dataCelebracao,
      localCelebracao: localCelebracao.trim(),
      celebrante: celebrante.trim(),
      moderadorGeral: moderadorGeral.trim(),
      formadorGeralLocal: formadorGeralLocal.trim() || undefined,
      assistenteEclesiastico: assistenteEclesiastico.trim() || undefined,
      secretario: secretario.trim(),
      formulaTexto: formulaTexto.trim() || undefined,
      dataVigenciaInicio: dataCelebracao,
      dataVigenciaFim: isDefinitivas ? undefined : (dataVigenciaFim || undefined),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Lavrar no Livro de Promessas</DialogTitle>
          <DialogDescription>
            Ao concluir, o assento é lavrado no Livro de Promessas ({TIPO_REGISTRO_PROMESSA_LABELS[tipo]}) e
            o termo referencial entra no Livro de Registro Geral. Tomo, folha e número são atribuídos
            automaticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data da celebração</Label>
              <Input type="date" value={dataCelebracao} onChange={(e) => setDataCelebracao(e.target.value)} />
            </div>
            {!isDefinitivas && (
              <div className="space-y-1.5">
                <Label>Vigência até</Label>
                <Input type="date" value={dataVigenciaFim} onChange={(e) => setDataVigenciaFim(e.target.value)} />
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Local da celebração</Label>
            <Input value={localCelebracao} onChange={(e) => setLocalCelebracao(e.target.value)} placeholder="Ex.: Capela da Casa de Formação" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Celebrante</Label>
              <Input value={celebrante} onChange={(e) => setCelebrante(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-1.5">
              <Label>Moderador(a) Geral</Label>
              <Input value={moderadorGeral} onChange={(e) => setModeradorGeral(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-1.5">
              <Label>Formador(a) Geral local</Label>
              <Input value={formadorGeralLocal} onChange={(e) => setFormadorGeralLocal(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label>Assistente eclesiástico</Label>
              <Input value={assistenteEclesiastico} onChange={(e) => setAssistenteEclesiastico(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Secretário(a)</Label>
              <Input value={secretario} onChange={(e) => setSecretario(e.target.value)} placeholder="Nome completo" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Fórmula de consagração</Label>
            <Textarea rows={4} value={formulaTexto} onChange={(e) => setFormulaTexto(e.target.value)} className="resize-none text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Lavrar e concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
