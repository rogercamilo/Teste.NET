"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Filter, FolderOpen, Info, RefreshCw, ScrollText, Search } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import {
  type ProcessoEclesiastico,
  type StatusProcessoEclesiastico,
  STATUS_PROCESSO_LABELS,
  STATUS_PROCESSO_COLORS,
  temPermissao,
} from "@/types";
import { getTipoLabel, type TermosProcesso } from "@/lib/jornada-vocacional";
import { useTermos } from "@/lib/data-store";

const PAGE_SIZE = 15;

interface Props {
  initialProcessos: ProcessoEclesiastico[];
  userRole: string;
  termos: TermosProcesso;
}

export default function JornadaVocacionalClient({ initialProcessos, userRole, termos }: Props) {
  const router = useRouter();
  const { formando: termoFormando } = useTermos();
  const termoFormandoPlural = `${termoFormando}s`;
  const [search, setSearch] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [page, setPage] = useState(1);

  const isGestao = temPermissao(userRole, "formador_geral");

  const filtered = useMemo(() => {
    return initialProcessos.filter((p) => {
      const matchSearch =
        !search ||
        p.formandoNome?.toLowerCase().includes(search.toLowerCase()) ||
        getTipoLabel(p.tipo, termos).toLowerCase().includes(search.toLowerCase());
      const matchTipo = tipoFiltro === "todos" || p.tipo === tipoFiltro;
      const matchStatus = statusFiltro === "todos" || p.status === statusFiltro;
      return matchSearch && matchTipo && matchStatus;
    });
  }, [initialProcessos, search, tipoFiltro, statusFiltro, termos]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const tiposUnicos = Array.from(new Set(initialProcessos.map((p) => p.tipo)));
  const statusUnicos = Array.from(new Set(initialProcessos.map((p) => p.status)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-primary" />
            Jornada Vocacional
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Processos eclesiásticos canônicos da organização
          </p>
        </div>
        <button
          onClick={() => router.refresh()}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {/* Nota: o que é a seção e onde os processos nascem */}
      <div className="flex gap-2.5 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <div className="space-y-1.5">
          <p className="text-foreground font-medium">A Jornada Vocacional</p>
          <p>
            Acompanha os processos eclesiásticos canônicos dos {termoFormando.toLowerCase()}s (admissões, renovações e
            demais ritos): é aqui que os documentos oficiais de cada etapa são{" "}
            <span className="font-medium">gerados</span>, revisados pelo Formador Geral e{" "}
            <span className="font-medium">validados</span> — é a geração canônica dos documentos (a Auditoria
            Documental apenas os consulta). Abra um processo para preencher o formulário, gerar os documentos e conduzir
            a tramitação até a conclusão, com o assento no Livro de Promessas quando houver.
          </p>
          <p>
            <span className="font-medium text-foreground">Onde os processos nascem:</span> cada processo é iniciado na
            ficha do {termoFormando.toLowerCase()} (menu{" "}
            <span className="font-medium">{termoFormandoPlural} → abrir o {termoFormando.toLowerCase()}</span>). Esta
            tela reúne todos eles para busca, acompanhamento do status e acesso aos documentos.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Buscar por ${termoFormando.toLowerCase()} ou tipo de processo...`}
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Filter className="hidden sm:block h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={tipoFiltro} onValueChange={(v) => { setTipoFiltro(v ?? "todos"); setPage(1); }} items={{ todos: "Todos os tipos", ...Object.fromEntries(tiposUnicos.map((tipo) => [tipo, getTipoLabel(tipo, termos)])) }}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Tipo de processo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {tiposUnicos.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {getTipoLabel(tipo, termos)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFiltro} onValueChange={(v) => { setStatusFiltro(v ?? "todos"); setPage(1); }} items={{ todos: "Todos os status", ...Object.fromEntries(statusUnicos.map((s) => [s, STATUS_PROCESSO_LABELS[s as StatusProcessoEclesiastico]])) }}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {statusUnicos.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_PROCESSO_LABELS[s as StatusProcessoEclesiastico]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {filtered.length === 0 ? (
            initialProcessos.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="Nenhum processo eclesiástico"
                description={`Os processos são iniciados na ficha de cada ${termoFormando.toLowerCase()}. Abra um ${termoFormando.toLowerCase()} para registrar o primeiro processo da jornada.`}
                action={
                  <Link href="/formandos" className={buttonVariants({ size: "sm" })}>
                    Ir para {termoFormandoPlural.toLowerCase()}
                  </Link>
                }
              />
            ) : (
              <EmptyState
                icon={Search}
                title="Nenhum resultado"
                description="Nenhum processo corresponde à busca ou aos filtros aplicados."
                secondaryAction={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setTipoFiltro("todos");
                      setStatusFiltro("todos");
                      setPage(1);
                    }}
                  >
                    Limpar filtros
                  </Button>
                }
              />
            )
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{termoFormando}</TableHead>
                  <TableHead>Tipo de processo</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Documentos</TableHead>
                  {isGestao && <TableHead>Criado por</TableHead>}
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/jornada-vocacional/${p.id}`)}
                  >
                    <TableCell className="font-medium">{p.formandoNome}</TableCell>
                    <TableCell className="text-sm">{getTipoLabel(p.tipo, termos)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.nivelFormativo}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_PROCESSO_COLORS[p.status]}`}>
                        {STATUS_PROCESSO_LABELS[p.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {p.documentos && p.documentos.length > 0 ? (
                        <Badge variant="secondary" className="text-xs">
                          {p.documentos.length} doc{p.documentos.length !== 1 ? "s" : ""}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {isGestao && (
                      <TableCell className="text-sm text-muted-foreground">
                        {p.criadoPorNome}
                      </TableCell>
                    )}
                    <TableCell className="text-sm text-muted-foreground">
                      {format(parseISO(p.criadoEm), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {filtered.length > PAGE_SIZE && (
        <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
      )}
    </div>
  );
}
