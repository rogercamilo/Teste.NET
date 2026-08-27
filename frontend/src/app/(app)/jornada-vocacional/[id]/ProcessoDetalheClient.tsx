"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, CheckCircle2, FileText, XCircle, AlertCircle, Clock, Loader2, Download, Eye, Info, Undo2, UserCheck, Hourglass } from "lucide-react";
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
  responsavelDaVez,
  documentosPendentesDeGeracao,
  documentosProntosParaRevisao,
  type TermosProcesso,
} from "@/lib/jornada-vocacional";
import { DocumentoViewer } from "@/components/documentos/DocumentoViewer";
import { useTermos } from "@/lib/data-store";

// Formando extra fields not in base ProcessoEclesiastico type
interface FormandoDetalhe {
  id: string;
  nome: string;
  dataNascimento: string | null;
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
  motivoDevolucao?: string | null;
  devolvidoEm?: string | null;
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
  const { formando: termoFormando } = useTermos();
  const [processo, setProcesso] = useState<ProcessoCompleto>(initial);
  const [isPending, startTransition] = useTransition();
  const [dadosForm, setDadosForm] = useState<Record<string, unknown>>(
    initial.dadosFormulario ?? {}
  );
  const [formDirty, setFormDirty] = useState(false);
  const [gerandoId, setGerandoId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [promessaDialogOpen, setPromessaDialogOpen] = useState(false);
  const [devolverDialogOpen, setDevolverDialogOpen] = useState(false);
  const [criandoDocs, setCriandoDocs] = useState(false);
  // Documento em pré-visualização (modal com preview + download embutido).
  const [viewerDoc, setViewerDoc] = useState<{ arquivoId: string; nome: string } | null>(null);

  // Processo de promessa ainda sem assento lavrado → conclusão passa pelo modal.
  const exigePromessa = !!promessaTipo && !processo.promessa;

  const canEdit = podeEditarFormulario(processo.status, userRole);
  const transicoes = getTransicoesDisponiveis(processo.status, userRole);
  const StatusIcon = STATUS_ICONS[processo.status] ?? AlertCircle;

  // Trava de documentos e estado da revisão.
  const docsPendentes = documentosPendentesDeGeracao(processo.documentos);
  const docsProntos = documentosProntosParaRevisao(processo.documentos);
  const resp = responsavelDaVez(processo.status);
  const acoesForward = transicoes.filter((t) => t.para !== "cancelado");
  // "É a sua vez": posso preencher (fase de preparação) ou tenho uma ação de avanço.
  const minhaVez = canEdit || acoesForward.length > 0;

  // Aba inicial: na revisão/aprovação o foco é conferir os documentos.
  const [tab, setTab] = useState<string>(
    processo.status === "em_revisao" || processo.status === "aprovado" ? "documentos" : "formulario"
  );

  // Recuperação: processo em andamento sem lista de documentos (ex.: dado de
  // importação/seed que nasceu fora do fluxo "iniciar"). Quem prepara materializa.
  const podeCriarDocumentos =
    canEdit && processo.status === "em_andamento" && processo.documentos.length === 0;

  async function handleCriarDocumentos() {
    setCriandoDocs(true);
    try {
      const res = await fetch(
        `/api/processos-eclesiasticos/${processo.id}/documentos/inicializar`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Erro ao criar a lista de documentos.");
        return;
      }
      const { documentos } = await res.json();
      setProcesso((prev) => ({ ...prev, documentos }));
      setTab("documentos");
      toast.success("Lista de documentos criada. Gere cada documento na aba Documentos.");
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setCriandoDocs(false);
    }
  }

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

  function onTransicaoClick(t: { para: StatusProcessoEclesiastico; exigeMotivo?: boolean }) {
    // Devolução para ajustes exige um motivo → passa pelo modal.
    if (t.exigeMotivo) {
      setDevolverDialogOpen(true);
      return;
    }
    // Conclusão de promessa exige os dados da celebração (Livro de Promessas).
    if (t.para === "concluido" && exigePromessa) {
      setPromessaDialogOpen(true);
      return;
    }
    handleTransicao(t.para);
  }

  async function handleTransicao(
    novoStatus: StatusProcessoEclesiastico,
    opts?: { promessa?: PromessaPayload; motivo?: string }
  ): Promise<boolean> {
    const prevStatus = processo.status;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/processos-eclesiasticos/${processo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: novoStatus,
          ...(opts?.promessa ? { promessa: opts.promessa } : {}),
          ...(opts?.motivo ? { motivo: opts.motivo } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Erro ao atualizar status.");
        return false;
      }
      toast.success(mensagemTransicao(novoStatus, prevStatus));
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
            {transicoes.map((t) => {
              // Trava: enviar para revisão só com todos os documentos gerados.
              const travadoPorDocs = !!t.exigeDocumentosGerados && !docsProntos;
              return (
                <Button
                  key={t.para + t.label}
                  size="sm"
                  variant={t.variante === "destrutiva" ? "destructive" : "default"}
                  disabled={isPending || isSaving || travadoPorDocs}
                  title={
                    travadoPorDocs
                      ? "Gere todos os documentos do processo antes de enviar para revisão."
                      : undefined
                  }
                  onClick={() => onTransicaoClick(t)}
                >
                  {(isPending || isSaving) && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  {t.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      <Separator />

      <ProcessoGuia
        status={processo.status}
        tipoLabel={getTipoLabel(processo.tipo, termos)}
        termoFormando={termoFormando}
        nome={f.nome}
        minhaVez={minhaVez}
        responsavelLabel={resp?.papelLabel ?? null}
        responsavelAcao={resp?.acao ?? null}
        docsPendentes={docsPendentes.map((d) => TIPO_DOCUMENTO_LABELS[d.tipo])}
        totalDocs={processo.documentos.length}
        motivoDevolucao={processo.motivoDevolucao ?? null}
        podeCriarDocumentos={podeCriarDocumentos}
        criandoDocumentos={criandoDocs}
        onCriarDocumentos={handleCriarDocumentos}
      />

      <Tabs value={tab} onValueChange={setTab}>
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
              {processo.status === "em_revisao"
                ? "O formulário está travado durante a revisão do Formador Geral. Para editar, é preciso devolvê-lo para ajustes."
                : <>Este processo está em status <strong>{STATUS_PROCESSO_LABELS[processo.status]}</strong> e não pode ser editado.</>}
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
        <TabsContent value="documentos" className="pt-4 space-y-3">
          {processo.status === "em_revisao" && (
            <div className="flex items-start gap-2.5 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900 px-4 py-3 text-sm text-yellow-900 dark:text-yellow-200">
              <UserCheck className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>Revisão do Formador Geral.</strong> Confira cada documento abaixo. Estando tudo
                correto, use <strong>Aprovar</strong> no topo; havendo pendências, use{" "}
                <strong>Devolver para ajustes</strong> e descreva o que corrigir.
              </span>
            </div>
          )}
          {processo.documentos.length === 0 ? (
            <Card>
              <CardContent className="py-14 flex flex-col items-center gap-3 text-center text-muted-foreground">
                <FileText className="h-9 w-9 opacity-30" />
                {processo.status === "rascunho" ? (
                  <p className="text-sm max-w-sm">
                    A lista de documentos é criada automaticamente quando você
                    inicia o processo. Use <strong>&ldquo;Iniciar processo&rdquo;</strong> no topo desta tela.
                  </p>
                ) : podeCriarDocumentos ? (
                  <>
                    <p className="text-sm max-w-sm">
                      Este processo ainda não tem a lista de documentos canônicos. Crie-a para
                      poder gerar cada documento.
                    </p>
                    <Button size="sm" disabled={criandoDocs} onClick={handleCriarDocumentos}>
                      {criandoDocs && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                      Criar lista de documentos
                    </Button>
                  </>
                ) : (
                  <p className="text-sm">Nenhum documento associado a este processo.</p>
                )}
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
                      {/* Visualizar/baixar/gerar são exclusivos da gestão — o formador
                          comunitário vê o status, mas não consome o documento. */}
                      {temPermissao(userRole, "formador_geral") && (
                        doc.arquivoId ? (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-xs gap-1"
                              onClick={() => setViewerDoc({ arquivoId: doc.arquivoId!, nome: `${TIPO_DOCUMENTO_LABELS[doc.tipo]}.pdf` })}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Visualizar
                            </Button>
                            <a
                              href={`/api/arquivos/${doc.arquivoId}?download=1`}
                              download={`${TIPO_DOCUMENTO_LABELS[doc.tipo]}.pdf`}
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Baixar
                            </a>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              disabled={gerandoId === doc.id}
                              onClick={() => handleGerarPDF(doc.id)}
                              title="Gerar novamente (cria uma nova versão)"
                            >
                              {gerandoId === doc.id
                                ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Gerando…</>
                                : "Atualizar"}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            className="text-xs"
                            disabled={gerandoId === doc.id}
                            onClick={() => handleGerarPDF(doc.id)}
                          >
                            {gerandoId === doc.id
                              ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Gerando…</>
                              : "Gerar PDF"}
                          </Button>
                        )
                      )}
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
              <InfoRow label={termoFormando} value={f.nome} />
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
            const ok = await handleTransicao("concluido", { promessa: payload });
            if (ok) setPromessaDialogOpen(false);
          }}
        />
      )}

      <DevolverDialog
        open={devolverDialogOpen}
        onOpenChange={setDevolverDialogOpen}
        nome={f.nome}
        busy={isSaving}
        onConfirm={async (motivo) => {
          const ok = await handleTransicao("em_andamento", { motivo });
          if (ok) setDevolverDialogOpen(false);
        }}
      />

      {viewerDoc && (
        <DocumentoViewer
          key={viewerDoc.arquivoId}
          open
          onOpenChange={(o) => { if (!o) setViewerDoc(null); }}
          nome={viewerDoc.nome}
          fileUrl={`/api/arquivos/${viewerDoc.arquivoId}?stream=1`}
          downloadUrl={`/api/arquivos/${viewerDoc.arquivoId}?download=1`}
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
  const isAdmissao = tipo === "inicio_vocacional" || tipo === "admissao_etapa";
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
            campoConsideracoes="consideracoes_espiritual"
            dados={dados}
            onChange={onChange}
            disabled={disabled}
          />
          <DimensaoParecer
            titulo="Comunitária"
            campos={["participacao_encontros", "relacao_fraterna", "zelo_responsabilidade"]}
            labels={["Participação nos encontros", "Relação fraterna", "Zelo e responsabilidade"]}
            campoConsideracoes="consideracoes_comunitaria"
            dados={dados}
            onChange={onChange}
            disabled={disabled}
          />
          <DimensaoParecer
            titulo="Missionária"
            campos={["envolvimento_missao", "disponibilidade_servico", "testemunho_cristao"]}
            labels={["Envolvimento na missão", "Disponibilidade para o serviço", "Testemunho cristão"]}
            campoConsideracoes="consideracoes_missionaria"
            dados={dados}
            onChange={onChange}
            disabled={disabled}
          />
          <DimensaoParecer
            titulo="Humana"
            campos={["maturidade_afetiva", "cooperacao_dialogo"]}
            labels={["Maturidade afetiva", "Cooperação e diálogo"]}
            campoConsideracoes="consideracoes_humana"
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
  titulo, campos, labels, campoConsideracoes, dados, onChange, disabled,
}: {
  titulo: string;
  campos: string[];
  labels: string[];
  /** Campo de texto livre (opcional) para considerações sobre esta dimensão. */
  campoConsideracoes: string;
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
              items={Object.fromEntries(NOTA_OPTIONS.map((n) => [n, n.charAt(0).toUpperCase() + n.slice(1)]))}
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
      <div className="mt-3">
        <Label className="text-xs text-muted-foreground mb-1.5 block">
          Considerações sobre a dimensão {titulo.toLowerCase()} <span className="font-normal">(opcional)</span>
        </Label>
        <Textarea
          rows={2}
          value={dados[campoConsideracoes] !== undefined && dados[campoConsideracoes] !== null ? String(dados[campoConsideracoes]) : ""}
          onChange={(e) => onChange(campoConsideracoes, e.target.value)}
          disabled={disabled}
          className="resize-none text-sm"
          placeholder="Observações do responsável sobre esta dimensão…"
        />
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

// ─── Guia do processo: propósito + andamento + próximo passo ──────────────────
// O usuário chega nesta tela sem contexto do rito canônico. Este painel explica
// o que a tela faz, mostra em que ponto da tramitação o processo está e diz
// claramente qual é o próximo passo e de quem é a vez.

const FLUXO_ETAPAS: { status: StatusProcessoEclesiastico; titulo: string }[] = [
  { status: "rascunho",     titulo: "Rascunho" },
  { status: "em_andamento", titulo: "Em andamento" },
  { status: "em_revisao",   titulo: "Em revisão" },
  { status: "aprovado",     titulo: "Aprovado" },
  { status: "concluido",    titulo: "Concluído" },
];

function proximoPassoTexto(status: StatusProcessoEclesiastico, termoFormando: string): string {
  switch (status) {
    case "rascunho":
      return "Use “Iniciar processo” no topo para criar automaticamente a lista de documentos canônicos desta etapa e começar o preenchimento.";
    case "em_andamento":
      return "Preencha o formulário e gere todos os documentos na aba Documentos. Só então o botão “Enviar para revisão” é liberado — passando a responsabilidade ao Formador Geral.";
    case "em_revisao":
      return "A responsabilidade agora é do Formador Geral: ele confere os documentos e valida — aprova, ou devolve para ajustes com um motivo. O formulário fica travado durante a revisão.";
    case "aprovado":
      return "Falta a etapa final: o Formador Geral conclui o processo — oficializando os documentos e, havendo promessa, lavrando o assento no Livro de Promessas.";
    case "concluido":
      return "Processo concluído. Os documentos oficiais ficam disponíveis na aba Documentos.";
    case "rejeitado":
      return `O processo foi encerrado como rejeitado. Para retomar, abra um novo processo para o ${termoFormando.toLowerCase()}.`;
    case "cancelado":
      return "Este processo foi cancelado e não terá andamento.";
    default:
      return "";
  }
}

// Mensagem de confirmação após uma transição — reforça a mensageria entre
// perfis: quem foi avisado e que o processo retornará com aviso.
function mensagemTransicao(
  novo: StatusProcessoEclesiastico,
  anterior: StatusProcessoEclesiastico
): string {
  switch (novo) {
    case "em_revisao":
      return "Enviado para revisão. O Formador Geral foi avisado — você será notificado quando ele responder.";
    case "em_andamento":
      return anterior === "em_revisao"
        ? "Devolvido para ajustes. O preparador foi avisado do motivo."
        : "Processo iniciado. Preencha o formulário e gere os documentos.";
    case "aprovado":
      return "Processo aprovado. O preparador foi avisado.";
    case "concluido":
      return "Processo concluído. Os documentos oficiais estão disponíveis.";
    case "cancelado":
      return "Processo cancelado.";
    default:
      return `Status atualizado: ${STATUS_PROCESSO_LABELS[novo]}`;
  }
}

function ProcessoGuia({
  status, tipoLabel, termoFormando, nome,
  minhaVez, responsavelLabel, responsavelAcao,
  docsPendentes, totalDocs, motivoDevolucao,
  podeCriarDocumentos, criandoDocumentos, onCriarDocumentos,
}: {
  status: StatusProcessoEclesiastico;
  tipoLabel: string;
  termoFormando: string;
  nome: string;
  minhaVez: boolean;
  responsavelLabel: string | null;
  responsavelAcao: string | null;
  docsPendentes: string[];
  totalDocs: number;
  motivoDevolucao: string | null;
  podeCriarDocumentos: boolean;
  criandoDocumentos: boolean;
  onCriarDocumentos: () => void;
}) {
  const idx = FLUXO_ETAPAS.findIndex((e) => e.status === status);
  const terminalNegativo = status === "rejeitado" || status === "cancelado";

  return (
    <Card className="border-primary/15 bg-primary/[0.03]">
      <CardContent className="py-4 px-5 space-y-4">
        <div className="flex items-start gap-2.5">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Este é o rito canônico de <span className="font-medium text-foreground">{tipoLabel}</span> de{" "}
            <span className="font-medium text-foreground">{nome}</span>. O objetivo é <span className="font-medium text-foreground">produzir e validar os documentos oficiais</span> da etapa:
            a preparação reúne os dados (aba <span className="font-medium text-foreground">Formulário</span>) e gera os documentos (aba{" "}
            <span className="font-medium text-foreground">Documentos</span>); o <span className="font-medium text-foreground">Formador Geral</span> revisa e valida;
            a conclusão oficializa e registra no Livro.
          </p>
        </div>

        {/* De quem é a vez agora */}
        {responsavelLabel && responsavelAcao && (
          minhaVez ? (
            <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5">
              <UserCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">É a sua vez:</span> {responsavelAcao}.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
              <Hourglass className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Aguardando <span className="font-medium text-foreground">{responsavelLabel}</span> — {responsavelAcao}.
                {" "}Você será avisado quando o processo retornar para você.
              </p>
            </div>
          )
        )}

        {/* Devolução para ajustes: motivo retornado ao preparador */}
        {status === "em_andamento" && motivoDevolucao && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-3 py-2.5">
            <Undo2 className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900 dark:text-amber-200">
              <span className="font-semibold">Devolvido para ajustes:</span> {motivoDevolucao}
            </p>
          </div>
        )}

        {/* Pendência de documentos para liberar o envio à revisão */}
        {status === "em_andamento" && (
          totalDocs === 0 ? (
            <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-start gap-2">
                <FileText className="h-4 w-4 shrink-0 mt-0.5" />
                A lista de documentos deste processo ainda não foi criada.
              </span>
              {podeCriarDocumentos && (
                <Button size="sm" className="shrink-0 self-start sm:self-auto" disabled={criandoDocumentos} onClick={onCriarDocumentos}>
                  {criandoDocumentos && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  Criar lista de documentos
                </Button>
              )}
            </div>
          ) : docsPendentes.length > 0 ? (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
              <FileText className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Faltam gerar para liberar a revisão:{" "}
                <span className="font-medium text-foreground">{docsPendentes.join(", ")}</span>.
              </span>
            </div>
          ) : null
        )}

        {terminalNegativo ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-foreground">
              {status === "rejeitado" ? "Processo rejeitado na revisão" : "Processo cancelado"}
            </span>
          </div>
        ) : (
          <ol className="grid grid-cols-2 sm:grid-cols-5 gap-x-3 gap-y-2.5">
            {FLUXO_ETAPAS.map((etapa, i) => {
              const reached = idx >= 0 && i <= idx;
              const active = i === idx;
              return (
                <li key={etapa.status} className="space-y-1.5">
                  <div className={`h-1.5 rounded-full ${reached ? "bg-primary" : "bg-border"}`} />
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[11px] leading-none rounded-full w-4 h-4 inline-flex items-center justify-center font-semibold ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : reached
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}>
                      {i + 1}
                    </span>
                    <span className={`text-xs ${
                      active ? "font-semibold text-foreground" : reached ? "text-foreground/70" : "text-muted-foreground"
                    }`}>
                      {etapa.titulo}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <div className="flex items-start gap-2 rounded-lg bg-background/70 border border-border/60 px-3 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-primary shrink-0 mt-0.5">
            Próximo passo
          </span>
          <p className="text-sm text-foreground/90 leading-relaxed">{proximoPassoTexto(status, termoFormando)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Diálogo: devolver processo para ajustes ──────────────────────────────────

function DevolverDialog({
  open, onOpenChange, nome, busy, onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nome: string;
  busy: boolean;
  onConfirm: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");

  function submit() {
    if (!motivo.trim()) {
      toast.error("Descreva o que precisa ser ajustado.");
      return;
    }
    onConfirm(motivo.trim());
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { if (!v) setMotivo(""); onOpenChange(v); }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Devolver para ajustes</DialogTitle>
          <DialogDescription>
            O processo de {nome} volta para <strong>Em andamento</strong> e o motivo é enviado ao
            preparador, que corrige e reenvia para revisão.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Motivo da devolução</Label>
          <Textarea
            rows={4}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: O Ato de Admissão está com a data da celebração incorreta."
            className="resize-none text-sm"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button variant="destructive" onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Devolver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
