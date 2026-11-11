"use client";

/**
 * Visualização na tela de cada relatório — documentos estruturados (seções +
 * tabelas), não painéis de gráficos. Cada view recebe os dados já computados pelo
 * builder puro (via `carregar.ts`). O switch `RelatorioView` escolhe pela slug.
 */

import type { ReactNode } from "react";
import { CADENCIA_ACOMPANHAMENTO_LABELS } from "@/lib/acompanhamento-cadencia";
import { NOTA_ADESAO_LABELS, PERSPECTIVA_LABELS, type PerspectivaFormativa } from "@/types";
import type { ResultadoRelatorio } from "@/lib/relatorios/carregar";
import type { Pareceres } from "@/lib/relatorios/acompanhamento-morada-relatorio";
import {
  ResumoKpis,
  SituacaoBadge,
  AcompanhamentoBadge,
  PresencaCelulaTag,
  LegendaFrequencia,
  DistribuicaoEtapa,
  Tabela,
  Th,
  Td,
} from "./ui";

function Bloco({ titulo, children, acao }: { titulo: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-heading text-foreground">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

function pct(v: number | null): string {
  return v !== null ? `${v}%` : "—";
}

function Pareceres({ pareceres }: { pareceres: Pareceres }) {
  const chaves = (Object.keys(PERSPECTIVA_LABELS) as PerspectivaFormativa[]).filter((k) => pareceres[k]);
  if (chaves.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {chaves.map((k) => (
        <span key={k} className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground" title={`${PERSPECTIVA_LABELS[k]}: ${NOTA_ADESAO_LABELS[pareceres[k]!]}`}>
          <span className="font-medium">{PERSPECTIVA_LABELS[k][0]}</span>
          {NOTA_ADESAO_LABELS[pareceres[k]!]}
        </span>
      ))}
    </span>
  );
}

// ── R1 ─────────────────────────────────────────────────────────────────────────

function AcompanhamentoMoradaView({ dados }: { dados: Extract<ResultadoRelatorio, { slug: "acompanhamento-morada" }>["dados"] }) {
  return (
    <div className="space-y-6">
      <Bloco titulo="Resumo da morada">
        <ResumoKpis
          items={[
            { label: "Membros ativos", valor: dados.resumo.totalMembros },
            { label: "Em atenção", valor: dados.resumo.emAtencao, destaque: dados.resumo.emAtencao > 0 ? "risco" : undefined },
            { label: "Prontos p/ avançar", valor: dados.resumo.prontos, destaque: dados.resumo.prontos > 0 ? "bom" : undefined },
            { label: "Presença média", valor: pct(dados.resumo.presencaMedia) },
            { label: "Sem acompanhamento", valor: dados.resumo.semAcompanhamento, destaque: dados.resumo.semAcompanhamento > 0 ? "risco" : undefined },
          ]}
        />
      </Bloco>

      <Bloco titulo={`Acompanhamento cadência: ${CADENCIA_ACOMPANHAMENTO_LABELS[dados.cadenciaMeses]}`}>
        <Tabela>
          <thead>
            <tr>
              <Th>Nome</Th>
              <Th>Etapa</Th>
              <Th>Progresso</Th>
              <Th>Presença</Th>
              <Th>Situação</Th>
              <Th>Acompanhamento 1:1</Th>
              <Th>Pareceres</Th>
            </tr>
          </thead>
          <tbody>
            {dados.membros.map((m, i) => (
              <tr key={i}>
                <Td className="font-medium">{m.nome}</Td>
                <Td className="whitespace-nowrap text-muted-foreground">{m.etapaLabel}</Td>
                <Td className="whitespace-nowrap tabular-nums">{m.progressoDone}/{m.progressoTotal} <span className="text-muted-foreground">({m.progressoPct}%)</span></Td>
                <Td className="tabular-nums">{pct(m.presenca)}</Td>
                <Td><SituacaoBadge situacao={m.situacao} motivos={m.motivos} /></Td>
                <Td><AcompanhamentoBadge status={m.acompanhamentoStatus} diasAtraso={m.diasAtraso} /></Td>
                <Td><Pareceres pareceres={m.pareceres} /></Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      </Bloco>

      <Bloco titulo="Distribuição por etapa">
        <DistribuicaoEtapa itens={dados.funil} />
      </Bloco>
    </div>
  );
}

// ── R2 ─────────────────────────────────────────────────────────────────────────

function FrequenciaView({ dados }: { dados: Extract<ResultadoRelatorio, { slug: "frequencia" }>["dados"] }) {
  if (dados.totalEncontros === 0) {
    return <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhum encontro registrado no período.</p>;
  }
  return (
    <div className="space-y-4">
      <LegendaFrequencia />
      <Tabela>
        <thead>
          <tr>
            <Th className="sticky left-0 bg-muted/40">Nome</Th>
            {dados.encontros.map((e) => (
              <Th key={e.id} className="text-center">
                <span className="block whitespace-nowrap">{new Date(e.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                <span className="block font-normal text-muted-foreground">{pct(e.pct)}</span>
              </Th>
            ))}
            <Th className="text-center">Presença</Th>
          </tr>
        </thead>
        <tbody>
          {dados.linhas.map((l, i) => (
            <tr key={i}>
              <Td className="sticky left-0 bg-card font-medium">{l.nome}</Td>
              {l.celulas.map((c, j) => (
                <Td key={j} className="text-center"><PresencaCelulaTag estado={c} /></Td>
              ))}
              <Td className="text-center font-semibold tabular-nums">{pct(l.pct)}</Td>
            </tr>
          ))}
        </tbody>
      </Tabela>
    </div>
  );
}

// ── R3 ─────────────────────────────────────────────────────────────────────────

function ConsolidadoView({ dados }: { dados: Extract<ResultadoRelatorio, { slug: "consolidado-moradas" }>["dados"] }) {
  return (
    <div className="space-y-6">
      <Bloco titulo="Resumo da comunidade">
        <ResumoKpis
          items={[
            { label: "Moradas", valor: dados.totais.moradas },
            { label: "Formandos ativos", valor: `${dados.totais.ativos}/${dados.totais.total}` },
            { label: "Presença média", valor: pct(dados.totais.presencaMedia) },
            { label: "Em atenção", valor: dados.totais.emAtencao, destaque: dados.totais.emAtencao > 0 ? "risco" : undefined },
            { label: "Acompanhados", valor: `${dados.totais.coberturaEmDia}/${dados.totais.coberturaTotal}` },
          ]}
        />
      </Bloco>
      <Bloco titulo="Por morada">
        <Tabela>
          <thead>
            <tr>
              <Th>Morada</Th>
              <Th>Formador</Th>
              <Th className="text-center">Ativos</Th>
              <Th className="text-center">Presença</Th>
              <Th className="text-center">Em atenção</Th>
              <Th className="text-center">Acompanhados</Th>
              <Th className="text-center">Plano / Grade</Th>
            </tr>
          </thead>
          <tbody>
            {dados.moradas.map((m, i) => (
              <tr key={i}>
                <Td className="font-medium">{m.nome}</Td>
                <Td className="text-muted-foreground">{m.formadorNome ?? "—"}</Td>
                <Td className="text-center tabular-nums">{m.ativos}/{m.total}</Td>
                <Td className="text-center tabular-nums">{pct(m.presencaMedia)}</Td>
                <Td className={`text-center tabular-nums ${m.emAtencao > 0 ? "font-semibold text-amber-700" : ""}`}>{m.emAtencao}</Td>
                <Td className="text-center tabular-nums">{m.coberturaEmDia}/{m.coberturaTotal}</Td>
                <Td className="text-center text-xs">{m.temPlano ? "✓" : "—"} / {m.temGrade ? "✓" : "—"}</Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      </Bloco>
    </div>
  );
}

// ── R4 ─────────────────────────────────────────────────────────────────────────

function JornadaView({ dados }: { dados: Extract<ResultadoRelatorio, { slug: "jornada-comunidade" }>["dados"] }) {
  return (
    <div className="space-y-6">
      <Bloco titulo="Resumo">
        <ResumoKpis
          items={[
            { label: "Formandos ativos", valor: dados.resumo.totalAtivos },
            { label: "Prontos p/ avançar", valor: dados.resumo.prontos, destaque: dados.resumo.prontos > 0 ? "bom" : undefined },
            { label: "Em atenção", valor: dados.resumo.emAtencao, destaque: dados.resumo.emAtencao > 0 ? "risco" : undefined },
          ]}
        />
      </Bloco>
      <Bloco titulo="Distribuição por etapa">
        <DistribuicaoEtapa itens={dados.funil} />
      </Bloco>
      <Bloco titulo="Formandos">
        <Tabela>
          <thead>
            <tr>
              <Th>Nome</Th>
              <Th>Morada</Th>
              <Th>Etapa</Th>
              <Th className="text-center">Progresso</Th>
              <Th>Situação</Th>
            </tr>
          </thead>
          <tbody>
            {dados.membros.map((m, i) => (
              <tr key={i}>
                <Td className="font-medium">{m.nome}</Td>
                <Td className="text-muted-foreground">{m.moradaNome}</Td>
                <Td className="whitespace-nowrap text-muted-foreground">{m.etapaLabel}</Td>
                <Td className="text-center tabular-nums">{m.progressoPct}%</Td>
                <Td><SituacaoBadge situacao={m.situacao} motivos={m.motivos} /></Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      </Bloco>
    </div>
  );
}

// ── R5 ─────────────────────────────────────────────────────────────────────────

function CoberturaView({ dados }: { dados: Extract<ResultadoRelatorio, { slug: "cobertura-acompanhamento" }>["dados"] }) {
  return (
    <div className="space-y-6">
      <Bloco titulo={`Cobertura cadência: ${CADENCIA_ACOMPANHAMENTO_LABELS[dados.cadenciaMeses]}`}>
        <ResumoKpis
          items={[
            { label: "Em dia", valor: dados.totais.emDia, destaque: "bom" },
            { label: "Vence em breve", valor: dados.totais.venceEmBreve },
            { label: "Atrasados", valor: dados.totais.atrasado, destaque: dados.totais.atrasado > 0 ? "risco" : undefined },
            { label: "Nunca", valor: dados.totais.nunca, destaque: dados.totais.nunca > 0 ? "risco" : undefined },
            { label: "Cobertura", valor: pct(dados.totais.pctCoberto) },
          ]}
        />
      </Bloco>
      <Bloco titulo="Por morada">
        <Tabela>
          <thead>
            <tr>
              <Th>Morada</Th>
              <Th>Formador</Th>
              <Th className="text-center">Em dia</Th>
              <Th className="text-center">Atrasados</Th>
              <Th className="text-center">Nunca</Th>
              <Th className="text-center">Cobertura</Th>
            </tr>
          </thead>
          <tbody>
            {dados.moradas.map((m, i) => (
              <tr key={i}>
                <Td className="font-medium">{m.nome}</Td>
                <Td className="text-muted-foreground">{m.formadorNome ?? "—"}</Td>
                <Td className="text-center tabular-nums">{m.emDia}</Td>
                <Td className={`text-center tabular-nums ${m.atrasado > 0 ? "font-semibold text-red-700" : ""}`}>{m.atrasado}</Td>
                <Td className={`text-center tabular-nums ${m.nunca > 0 ? "font-semibold text-amber-700" : ""}`}>{m.nunca}</Td>
                <Td className="text-center tabular-nums">{pct(m.pctCoberto)}</Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      </Bloco>
      {dados.pendentes.length > 0 && (
        <Bloco titulo={`Pendentes de acompanhamento (${dados.pendentes.length})`}>
          <Tabela>
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>Morada</Th>
                <Th>Situação</Th>
              </tr>
            </thead>
            <tbody>
              {dados.pendentes.map((p, i) => (
                <tr key={i}>
                  <Td className="font-medium">{p.nome}</Td>
                  <Td className="text-muted-foreground">{p.moradaNome}</Td>
                  <Td>
                    <AcompanhamentoBadge status={p.status} diasAtraso={p.diasAtraso} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        </Bloco>
      )}
    </div>
  );
}

// ── R6 ─────────────────────────────────────────────────────────────────────────

function ExecutivoView({ dados }: { dados: Extract<ResultadoRelatorio, { slug: "executivo" }>["dados"] }) {
  return (
    <div className="space-y-6">
      <Bloco titulo="Indicadores executivos">
        <ResumoKpis
          items={[
            { label: "Formandos ativos", valor: dados.formandosAtivos },
            { label: "Retenção", valor: `${dados.retencaoPct}%`, destaque: dados.retencaoPct >= 80 ? "bom" : dados.retencaoPct < 60 ? "risco" : undefined },
            { label: "Presença global", valor: pct(dados.taxaPresencaGlobal) },
            { label: "Progresso médio", valor: `${dados.progressoMedioJornada}%` },
            { label: "Moradas", valor: dados.totalMoradas },
            { label: "Formadores", valor: dados.totalFormadores },
            { label: "Inativos", valor: dados.inativos },
          ]}
        />
      </Bloco>
      <div className="grid gap-6 lg:grid-cols-2">
        <Bloco titulo="Crescimento (ingressos por mês)">
          <Tabela>
            <thead><tr><Th>Mês</Th><Th className="text-center">Novos formandos</Th></tr></thead>
            <tbody>
              {dados.crescimentoMensal.map((c, i) => (
                <tr key={i}><Td>{c.mes}</Td><Td className="text-center tabular-nums">{c.novos}</Td></tr>
              ))}
            </tbody>
          </Tabela>
        </Bloco>
        <Bloco titulo="Tendência de presença">
          <Tabela>
            <thead><tr><Th>Mês</Th><Th className="text-center">Presença</Th></tr></thead>
            <tbody>
              {dados.presencaTendencia.map((c, i) => (
                <tr key={i}><Td>{c.mes}</Td><Td className="text-center tabular-nums">{pct(c.taxa)}</Td></tr>
              ))}
            </tbody>
          </Tabela>
        </Bloco>
      </div>
    </div>
  );
}

// ── Switch ───────────────────────────────────────────────────────────────────

export function RelatorioView({ resultado }: { resultado: ResultadoRelatorio }) {
  switch (resultado.slug) {
    case "acompanhamento-morada":
      return <AcompanhamentoMoradaView dados={resultado.dados} />;
    case "frequencia":
      return <FrequenciaView dados={resultado.dados} />;
    case "consolidado-moradas":
      return <ConsolidadoView dados={resultado.dados} />;
    case "jornada-comunidade":
      return <JornadaView dados={resultado.dados} />;
    case "cobertura-acompanhamento":
      return <CoberturaView dados={resultado.dados} />;
    case "executivo":
      return <ExecutivoView dados={resultado.dados} />;
  }
}
