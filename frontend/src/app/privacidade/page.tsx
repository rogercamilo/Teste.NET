import Link from "next/link";
import { Shield } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — Formattio",
  description: "Como a Formattio coleta, usa e protege seus dados pessoais em conformidade com a LGPD.",
};

import { PRIVACY_VERSION } from "@/lib/legal-versions";
export { PRIVACY_VERSION };
export const PRIVACY_DATE = "23 de maio de 2026";

const tocSections = [
  { id: "estrutura-juridica", num: "1", label: "Estrutura Jurídica" },
  { id: "principios-lgpd", num: "2", label: "Princípios LGPD" },
  { id: "responsabilidade-org", num: "3", label: "Responsabilidade das Organizações" },
  { id: "dados-coletados", num: "4", label: "Dados Coletados" },
  { id: "dados-sensiveis", num: "5", label: "Dados Sensíveis" },
  { id: "dados-menores", num: "6", label: "Dados de Menores" },
  { id: "finalidade-base-legal", num: "7", label: "Finalidade e Base Legal" },
  { id: "retencao", num: "8", label: "Retenção de Dados" },
  { id: "seguranca", num: "9", label: "Segurança da Informação" },
  { id: "incidentes", num: "10", label: "Incidentes de Segurança" },
  { id: "transferencia-internacional", num: "11", label: "Transferência Internacional" },
  { id: "compartilhamento", num: "12", label: "Compartilhamento de Dados" },
  { id: "cookies", num: "13", label: "Cookies" },
  { id: "direitos-titular", num: "14", label: "Direitos do Titular" },
  { id: "canal-privacidade", num: "15", label: "Canal de Privacidade" },
  { id: "alteracoes", num: "16", label: "Alterações desta Política" },
];

export default function PoliticaPrivacidadePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-foreground font-semibold hover:opacity-80 transition-opacity"
          >
            <Shield className="h-5 w-5 text-primary" />
            Formattio
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Versão {PRIVACY_VERSION}
            </span>
            <span className="text-xs text-muted-foreground">Atualizada em {PRIVACY_DATE}</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Page intro */}
        <div className="mb-10 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Política de Privacidade</h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            A <strong className="text-foreground">Formattio</strong> está comprometida com a proteção dos seus dados
            pessoais em conformidade com a{" "}
            <strong className="text-foreground">Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.
            Esta Política descreve como coletamos, usamos, armazenamos e compartilhamos seus dados, bem como os
            direitos que você possui como titular.
          </p>
          <div className="mt-4 rounded-lg border border-blue-200 dark:border-blue-800/50 bg-blue-50/60 dark:bg-blue-950/20 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
            A plataforma destina-se a organizações e usuários cujas atividades de tratamento de dados sejam
            compatíveis com a legislação brasileira aplicável, especialmente a Lei Geral de Proteção de Dados
            Pessoais (LGPD).
          </div>
        </div>

        <div className="flex gap-10 items-start">
          {/* Sticky ToC */}
          <aside className="hidden lg:block w-56 shrink-0 sticky top-20 self-start">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-2">
              Nesta página
            </p>
            <nav className="space-y-0.5">
              {tocSections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <span className="flex-none w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center leading-none">
                    {s.num}
                  </span>
                  <span className="truncate">{s.label}</span>
                </a>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1 space-y-12">

            {/* ── 1. Estrutura Jurídica ───────────────────────────── */}
            <section id="estrutura-juridica" className="scroll-mt-20">
              <SectionHeader num="1" title="Estrutura Jurídica e Papéis no Tratamento" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>A Formattio opera em duplo papel no ecossistema de proteção de dados:</p>
                <ul>
                  <li>
                    <strong>Controladora</strong> — em relação aos dados dos{" "}
                    <em>administradores e usuários da plataforma</em> (nome, e-mail, senha, logs de acesso),
                    a Formattio define as finalidades e os meios do tratamento.
                  </li>
                  <li>
                    <strong>Operadora</strong> — em relação aos dados dos{" "}
                    <em>formandos cadastrados pelas organizações</em> assinantes, a Formattio trata os dados
                    segundo as instruções de cada organização, que é a Controladora desses dados.
                  </li>
                </ul>
                <p>
                  Essa distinção é regulada pelos arts. 5º, VI e VII, e 39 da LGPD. O Acordo de Processamento
                  de Dados (DPA) integra os documentos contratuais disponibilizados às organizações assinantes.
                </p>
              </div>
            </section>

            {/* ── 2. Princípios LGPD (NOVO) ──────────────────────── */}
            <section id="principios-lgpd" className="scroll-mt-20">
              <SectionHeader num="2" title="Princípios Gerais de Tratamento (Art. 6º LGPD)" />
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  O tratamento de dados pessoais realizado pela Formattio observa os princípios previstos no
                  art. 6º da LGPD, incluindo{" "}
                  <strong className="text-foreground">
                    finalidade, adequação, necessidade, livre acesso, qualidade dos dados, transparência,
                    segurança, prevenção, não discriminação e responsabilização
                  </strong>.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
                  {[
                    { label: "Finalidade", desc: "Fins legítimos, específicos e informados" },
                    { label: "Adequação", desc: "Compatível com as finalidades declaradas" },
                    { label: "Necessidade", desc: "Apenas dados estritamente necessários" },
                    { label: "Livre acesso", desc: "Consulta facilitada e gratuita" },
                    { label: "Qualidade", desc: "Dados exatos e atualizados" },
                    { label: "Transparência", desc: "Informações claras sobre o tratamento" },
                    { label: "Segurança", desc: "Medidas técnicas de proteção" },
                    { label: "Prevenção", desc: "Medidas preventivas de danos" },
                    { label: "Não discriminação", desc: "Proibição de usos discriminatórios" },
                    { label: "Responsabilização", desc: "Demonstração de conformidade" },
                  ].map((p) => (
                    <div
                      key={p.label}
                      className="rounded-lg border border-border/60 bg-card/40 px-3 py-2.5"
                    >
                      <p className="text-xs font-semibold text-foreground">{p.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{p.desc}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A Formattio adota os princípios de finalidade, adequação, necessidade e minimização previstos
                  no art. 6º da LGPD, limitando o tratamento aos dados estritamente necessários para a
                  prestação dos serviços disponibilizados. Os dados pessoais tratados não serão utilizados
                  para finalidades incompatíveis com as informadas nesta Política, salvo mediante nova base
                  legal adequada ou consentimento específico quando exigido.
                </p>
              </div>
            </section>

            {/* ── 3. Responsabilidade das Organizações ────────────── */}
            <section id="responsabilidade-org" className="scroll-mt-20">
              <SectionHeader num="3" title="Responsabilidade das Organizações Usuárias" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>
                  Cada organização assinante é responsável pela legitimidade da coleta, definição das
                  finalidades e pela base legal aplicável aos dados pessoais inseridos na plataforma, em
                  especial dados de formandos. Cabe à organização:
                </p>
                <ul>
                  <li>
                    Obter base legal adequada (art. 7º LGPD) antes de inserir dados de terceiros na
                    plataforma.
                  </li>
                  <li>
                    Colher consentimento específico e destacado dos titulares quando exigido, especialmente
                    para dados sensíveis (art. 11, I, LGPD).
                  </li>
                  <li>Informar os titulares sobre o tratamento realizado pela organização e pela Formattio.</li>
                  <li>Atender às solicitações de direitos dos titulares encaminhadas à organização.</li>
                </ul>
                <p>
                  A Formattio disponibiliza ferramentas técnicas para facilitar o cumprimento dessas obrigações
                  (exportação de dados, exclusão de registros, logs de auditoria), mas a responsabilidade
                  jurídica pelo tratamento dos dados de formandos é da organização assinante.
                </p>
              </div>
            </section>

            {/* ── 4. Dados Coletados ──────────────────────────────── */}
            <section id="dados-coletados" className="scroll-mt-20">
              <SectionHeader num="4" title="Dados Coletados" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <h3>4.1 Dados fornecidos diretamente</h3>
                <ul>
                  <li>
                    <strong>Cadastro de organização:</strong> nome da organização, nome e e-mail do
                    administrador, senha protegida com armazenamento em hash criptográfico unidirecional
                    utilizando algoritmo scrypt com salt aleatório.
                  </li>
                  <li>
                    <strong>Perfil de usuário:</strong> nome, e-mail, foto de perfil (opcional).
                  </li>
                  <li>
                    <strong>Dados de formandos:</strong> nome, data de nascimento, estado civil, nível
                    formativo, telefone, e-mail e foto — inseridos pelos administradores e formadores
                    da organização.
                  </li>
                  <li>
                    <strong>Documentos:</strong> arquivos PDF/DOCX enviados por usuários autenticados.
                  </li>
                </ul>
                <h3>4.2 Dados coletados automaticamente</h3>
                <ul>
                  <li>
                    <strong>Logs de auditoria:</strong> ações realizadas na plataforma (login, criação,
                    edição, exclusão), com endereço IP <em>anonimizado</em> (último octeto IPv4 substituído
                    por &quot;xxx&quot;). Os registros poderão ser utilizados para fins de segurança, prevenção à
                    fraude, investigação de incidentes e cumprimento de obrigações legais e regulatórias.
                  </li>
                  <li>
                    <strong>Cookies de sessão:</strong> necessários para manter a autenticação (via NextAuth).
                  </li>
                  <li>
                    <strong>Registro de consentimento de cookies:</strong> data e hora, endereço IP
                    (anonimizado), versão da Política e preferências selecionadas — armazenados para fins
                    de conformidade legal.
                  </li>
                </ul>
              </div>
            </section>

            {/* ── 5. Dados Sensíveis ──────────────────────────────── */}
            <section id="dados-sensiveis" className="scroll-mt-20">
              <SectionHeader num="5" title="Dados Pessoais Sensíveis" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>
                  A Formattio reconhece que organizações de formação comunitária, pastoral, vocacional ou
                  espiritual podem registrar informações enquadradas como{" "}
                  <strong>dados pessoais sensíveis</strong> nos termos do art. 5º, II, c/c arts. 7º e 11
                  da LGPD, tais como:
                </p>
                <ul>
                  <li>Convicção religiosa ou pertença a comunidade de fé;</li>
                  <li>Dados sobre saúde física ou mental de formandos;</li>
                  <li>Dados de natureza vocacional, espiritual ou pastoral;</li>
                  <li>Dados de menores de 18 anos (tratados na seção seguinte).</li>
                </ul>
                <p>
                  O tratamento somente poderá ocorrer com{" "}
                  <strong>consentimento específico e destacado do titular</strong> (art. 11, I, LGPD) ou
                  nas demais hipóteses taxativas do art. 11, II. A organização assinante é responsável
                  por garantir a base legal adequada antes de inserir dados sensíveis na plataforma.
                </p>
                <p>
                  A Formattio adota controles técnicos adicionais para dados sensíveis: acesso restrito por
                  perfil, registros de auditoria específicos e criptografia em repouso na camada de
                  armazenamento (seção 9).
                </p>
              </div>
            </section>

            {/* ── 6. Dados de Menores ─────────────────────────────── */}
            <section id="dados-menores" className="scroll-mt-20">
              <SectionHeader num="6" title="Dados de Menores de Idade" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>
                  Nos termos do art. 14 da LGPD, o tratamento de dados pessoais de crianças (menores de
                  12 anos) e adolescentes (entre 12 e 18 anos) exige atenção especial:
                </p>
                <ul>
                  <li>
                    Para <strong>crianças</strong>: o consentimento deve ser dado por pelo menos um dos
                    pais ou responsável legal, de forma específica e destacada.
                  </li>
                  <li>
                    Para <strong>adolescentes</strong>: o tratamento deve ser realizado no seu melhor
                    interesse, podendo o consentimento ser dado pelo próprio adolescente ou por responsável
                    legal, conforme o contexto.
                  </li>
                  <li>
                    A Formattio <strong>não coleta diretamente</strong> dados de menores — esses dados são
                    inseridos pelas organizações assinantes, que são responsáveis por obter as autorizações
                    necessárias.
                  </li>
                  <li>
                    Nenhuma funcionalidade da Formattio é direcionada a crianças para uso direto e autônomo.
                  </li>
                </ul>
              </div>
            </section>

            {/* ── 7. Finalidade e Base Legal ──────────────────────── */}
            <section id="finalidade-base-legal" className="scroll-mt-20">
              <SectionHeader num="7" title="Finalidade e Base Legal" />
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap">
                        Finalidade
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap">
                        Base legal (LGPD)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {[
                      ["Autenticação e segurança da conta", "Legítimo interesse / Execução de contrato (art. 7º, II e IX)"],
                      ["Gestão formativa (formandos, presenças, planos)", "Execução de contrato — serviço contratado pela organização (art. 7º, V)"],
                      ["Comunicações transacionais (convites, recuperação de senha)", "Execução de contrato (art. 7º, V)"],
                      ["Atendimento ao cliente e suporte técnico", "Execução de contrato / Legítimo interesse (art. 7º, V e IX)"],
                      ["Prevenção a fraudes e uso abusivo", "Legítimo interesse (art. 7º, IX)"],
                      ["Monitoramento de segurança e estabilidade do serviço", "Legítimo interesse (art. 7º, IX)"],
                      ["Notificações de limite de plano e inadimplência", "Legítimo interesse / Execução de contrato (art. 7º, IX)"],
                      ["Logs de auditoria e conformidade legal", "Cumprimento de obrigação legal (art. 7º, II)"],
                      ["Métricas de performance e melhoria do serviço (dados agregados e anonimizados)", "Legítimo interesse (art. 7º, IX)"],
                      ["Cookies analíticos e de marketing", "Consentimento explícito (art. 7º, I)"],
                    ].map(([fin, base], i) => (
                      <tr key={i} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                        <td className="px-4 py-3 text-foreground">{fin}</td>
                        <td className="px-4 py-3 text-muted-foreground">{base}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── 8. Retenção de Dados ────────────────────────────── */}
            <section id="retencao" className="scroll-mt-20">
              <SectionHeader num="8" title="Retenção de Dados" />
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Os dados são retidos pelos prazos descritos abaixo, após os quais são excluídos de forma
                  segura:
                </p>
                <div className="overflow-x-auto rounded-lg border border-border/60">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap">
                          Categoria
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap">
                          Prazo de retenção
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap">
                          Tipo de exclusão
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {[
                        ["Dados de conta ativa (usuários e organização)", "Vigência do contrato", "Soft delete durante vigência; hard delete após cancelamento"],
                        ["Dados de formandos", "Vigência do contrato + 30 dias de carência", "Hard delete e purge de arquivos no storage"],
                        ["Logs de auditoria", "12 meses a partir da geração", "Hard delete automático"],
                        ["Dados após cancelamento (carência)", "30 dias", "Hard delete ao término da carência"],
                        ["Backups de banco de dados", "30 dias", "Excluídos automaticamente (política do provedor)"],
                        ["Registros de consentimento de cookies", "5 anos (prazo legal)", "Hard delete após o prazo"],
                        ["Dados de cobrança (Stripe)", "5 anos (obrigação fiscal/contábil)", "Conforme política do Stripe e legislação fiscal brasileira"],
                      ].map(([cat, prazo, tipo], i) => (
                        <tr key={i} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                          <td className="px-4 py-3 text-foreground font-medium">{cat}</td>
                          <td className="px-4 py-3 text-muted-foreground">{prazo}</td>
                          <td className="px-4 py-3 text-muted-foreground">{tipo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                  <strong>Retenção por obrigação legal:</strong> Mesmo após solicitação de exclusão pelo
                  titular, determinados dados poderão ser mantidos pelo período necessário para cumprimento
                  de obrigações legais, regulatórias, contratuais ou para exercício regular de direitos em
                  processos administrativos, arbitrais ou judiciais.
                </div>
              </div>
            </section>

            {/* ── 9. Segurança da Informação ──────────────────────── */}
            <section id="seguranca" className="scroll-mt-20">
              <SectionHeader num="9" title="Segurança da Informação" />
              <div className="space-y-4">
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <p>
                    A Formattio adota medidas técnicas e organizacionais para proteger seus dados, incluindo:
                  </p>
                  <ul>
                    <li>
                      Comunicação protegida por <strong>HTTPS/TLS</strong> em todos os ambientes.
                    </li>
                    <li>
                      Senhas protegidas com <strong>armazenamento em hash criptográfico unidirecional
                      utilizando algoritmo scrypt com salt aleatório</strong> de 32 bytes.
                    </li>
                    <li>
                      <strong>Criptografia em repouso</strong> na camada de banco de dados (PostgreSQL)
                      e nos volumes de armazenamento gerenciados pelo provedor de hospedagem (Railway).
                    </li>
                    <li>
                      <strong>Criptografia de backups</strong> — backups do banco de dados são
                      criptografados pelo provedor antes do armazenamento.
                    </li>
                    <li>
                      Dados de formandos armazenados no servidor (PostgreSQL); a aplicação é projetada
                      para evitar armazenamento persistente local de dados pessoais sensíveis no navegador.
                    </li>
                    <li>
                      Arquivos armazenados no Cloudflare R2 com acesso controlado via{" "}
                      <strong>URLs pré-assinadas</strong> com expiração de 15 minutos.
                    </li>
                    <li>
                      <strong>Controle de acesso baseado em perfil</strong> (RBAC): separação de permissões
                      entre Formador Comunitário, Formador Geral e Administrador; acesso à área Super Admin
                      restrito.
                    </li>
                    <li>
                      A Formattio poderá exigir <strong>autenticação multifator (MFA)</strong> para contas
                      com privilégios administrativos ou acesso a funcionalidades críticas.
                    </li>
                    <li>
                      Rate limiting nos endpoints de autenticação: máximo 5 tentativas por IP em 15 minutos.
                    </li>
                    <li>Logs de auditoria com IP anonimizado para todas as ações críticas.</li>
                  </ul>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      title: "Accountability",
                      body: "A Formattio mantém registros e evidências das operações de tratamento de dados pessoais, medidas de segurança adotadas e registros de consentimento, em conformidade com os princípios de responsabilização e prestação de contas previstos na LGPD.",
                    },
                    {
                      title: "Revisão Periódica",
                      body: "As medidas técnicas e organizacionais de segurança são revisadas periodicamente, considerando a natureza dos dados tratados, os riscos envolvidos e a evolução das melhores práticas de segurança da informação.",
                    },
                    {
                      title: "Continuidade Operacional",
                      body: "A Formattio adota medidas de continuidade operacional e recuperação de desastres visando assegurar a disponibilidade, integridade e resiliência dos dados e serviços disponibilizados na plataforma.",
                    },
                  ].map((card) => (
                    <div
                      key={card.title}
                      className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-1.5"
                    >
                      <p className="text-sm font-semibold text-foreground">{card.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{card.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── 10. Incidentes de Segurança ─────────────────────── */}
            <section id="incidentes" className="scroll-mt-20">
              <SectionHeader num="10" title="Incidentes de Segurança" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>
                  Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares
                  (vazamento, acesso não autorizado, perda ou alteração indevida de dados), a Formattio adotará
                  as seguintes medidas:
                </p>
                <ul>
                  <li>
                    <strong>Notificação à ANPD</strong> em prazo razoável e sem demora injustificada,
                    conforme a legislação aplicável e regulamentações da Autoridade Nacional de Proteção de
                    Dados (ANPD), nos termos do art. 48 da LGPD.
                  </li>
                  <li>
                    <strong>Comunicação aos titulares</strong> afetados em prazo razoável, com descrição
                    clara da natureza dos dados envolvidos e das medidas adotadas.
                  </li>
                  <li>
                    <strong>Notificação às organizações assinantes</strong> (Controladoras dos dados de
                    formandos) para que possam cumprir suas próprias obrigações legais.
                  </li>
                  <li>
                    Adoção imediata de <strong>medidas de mitigação</strong>: contenção do incidente,
                    revogação de acessos comprometidos, correção da vulnerabilidade e revisão dos controles.
                  </li>
                  <li>
                    Registro e documentação do incidente no{" "}
                    <strong>Registro de Operações de Tratamento</strong> interno, conforme art. 37 da LGPD.
                  </li>
                </ul>
              </div>
            </section>

            {/* ── 11. Transferência Internacional ─────────────────── */}
            <section id="transferencia-internacional" className="scroll-mt-20">
              <SectionHeader num="11" title="Transferência Internacional de Dados" />
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A Formattio utiliza subprocessadores localizados nos <strong className="text-foreground">Estados
                  Unidos</strong> e na <strong className="text-foreground">União Europeia</strong>. Toda
                  transferência internacional de dados pessoais é realizada com base em salvaguardas
                  adequadas, conforme art. 33 da LGPD:
                </p>
                <div className="overflow-x-auto rounded-lg border border-border/60">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap">
                          Subprocessador
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap">
                          Localização
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap">
                          Salvaguarda
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {[
                        ["Railway", "EUA / UE", "Data Processing Agreement (DPA); cláusulas contratuais padrão"],
                        ["Cloudflare R2", "EUA / múltiplas regiões", "DPA Cloudflare; certificação ISO 27001"],
                        ["Stripe", "EUA", "DPA Stripe; certificação PCI-DSS Level 1; cláusulas padrão UE"],
                        ["Resend", "EUA", "DPA Resend; dados limitados a e-mail transacional"],
                        ["Sentry", "EUA", "DPA Sentry; sendDefaultPii: false (sem PII em erros)"],
                      ].map(([sp, loc, salv], i) => (
                        <tr key={i} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                          <td className="px-4 py-3 font-medium text-foreground">{sp}</td>
                          <td className="px-4 py-3 text-muted-foreground">{loc}</td>
                          <td className="px-4 py-3 text-muted-foreground">{salv}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-muted-foreground">
                  A lista atualizada de subprocessadores, incluindo os respectivos DPAs, está disponível
                  mediante solicitação ao Canal de Privacidade (seção 15).
                </p>
              </div>
            </section>

            {/* ── 12. Compartilhamento ────────────────────────────── */}
            <section id="compartilhamento" className="scroll-mt-20">
              <SectionHeader num="12" title="Compartilhamento de Dados" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>
                  A Formattio <strong>não comercializa</strong> dados pessoais. Compartilhamos dados somente
                  com os subprocessadores listados na seção 11, estritamente necessários à operação do
                  serviço, e com autoridades públicas quando exigido por lei ou ordem judicial.
                </p>
                <p>
                  Dados anonimizados e agregados poderão ser utilizados para fins estatísticos, analíticos,
                  operacionais e de melhoria contínua da plataforma, sem possibilidade de identificação dos
                  titulares.
                </p>
              </div>
            </section>

            {/* ── 13. Cookies ─────────────────────────────────────── */}
            <section id="cookies" className="scroll-mt-20">
              <SectionHeader num="13" title="Cookies" />
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      label: "Necessários",
                      badge: "Sempre ativo",
                      badgeClass: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
                      desc: "Essenciais para o funcionamento e autenticação. Sempre ativos e dispensados de consentimento.",
                    },
                    {
                      label: "Analíticos",
                      badge: "Requer consentimento",
                      badgeClass: "bg-primary/10 text-primary",
                      desc: "Métricas de uso e performance. Ativados apenas com seu consentimento explícito.",
                    },
                    {
                      label: "Marketing",
                      badge: "Requer consentimento",
                      badgeClass: "bg-primary/10 text-primary",
                      desc: "Personalização de comunicações. Ativados apenas com seu consentimento explícito.",
                    },
                    {
                      label: "Preferências",
                      badge: "Requer consentimento",
                      badgeClass: "bg-primary/10 text-primary",
                      desc: "Tema, idioma e configurações da interface. Ativados apenas com seu consentimento explícito.",
                    },
                  ].map((c) => (
                    <div key={c.label} className="rounded-lg border border-border/60 bg-card/40 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-foreground">{c.label}</p>
                        <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${c.badgeClass}`}>
                          {c.badge}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Ao registrar sua preferência de cookies, gravamos:{" "}
                  <strong className="text-foreground">data e hora do consentimento, endereço IP
                  anonimizado, versão desta Política e preferências selecionadas</strong>. Esse registro é
                  mantido por 5 anos para fins de demonstração de conformidade. Você pode rever ou retirar
                  seu consentimento a qualquer momento pelo banner da plataforma ou pelo link
                  &quot;Preferências de cookies&quot; no rodapé.
                </p>
              </div>
            </section>

            {/* ── 14. Direitos do Titular ─────────────────────────── */}
            <section id="direitos-titular" className="scroll-mt-20">
              <SectionHeader num="14" title="Direitos do Titular (LGPD)" />
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Nos termos do art. 18 da LGPD, você possui os seguintes direitos em relação aos seus dados:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    ["Confirmação e acesso", "Solicitar confirmação de tratamento e cópia dos seus dados em formato JSON ou CSV."],
                    ["Retificação", "Corrigir dados incompletos, inexatos ou desatualizados."],
                    ["Anonimização, bloqueio ou eliminação", "Solicitar anonimização ou exclusão de dados desnecessários ou tratados em desconformidade."],
                    ["Portabilidade", "Receber seus dados em formato estruturado e legível por máquina."],
                    ["Eliminação por consentimento", "Solicitar exclusão de dados tratados com base em consentimento, ressalvadas as hipóteses legais."],
                    ["Revogação do consentimento", "Retirar consentimento de cookies analíticos/marketing a qualquer momento."],
                    ["Informação", "Ser informado sobre com quem seus dados são compartilhados."],
                    ["Oposição", "Opor-se ao tratamento em caso de descumprimento da LGPD."],
                    ["Revisão automatizada", "Solicitar revisão de decisões tomadas unicamente com base em tratamento automatizado."],
                    ["Petição à ANPD", "Apresentar petição à Autoridade Nacional de Proteção de Dados."],
                  ].map(([direito, desc]) => (
                    <div key={direito} className="rounded-lg border border-border/60 bg-card/40 px-3 py-2.5">
                      <p className="text-xs font-semibold text-foreground">{direito}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    As solicitações serão respondidas em até{" "}
                    <strong className="text-foreground">15 dias corridos</strong> a partir do recebimento.
                    Para exercer seus direitos:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link
                      href="/privacidade/contato"
                      className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                    >
                      Formulário online
                    </Link>
                    <a
                      href="mailto:privacidade@formattio.com.br"
                      className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      privacidade@formattio.com.br
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A Formattio poderá solicitar informações adicionais para validação da identidade do
                    solicitante antes do atendimento de requisições relacionadas aos direitos dos titulares,
                    visando prevenir fraudes e acessos não autorizados.
                  </p>
                </div>
              </div>
            </section>

            {/* ── 15. Canal de Privacidade ────────────────────────── */}
            <section id="canal-privacidade" className="scroll-mt-20">
              <SectionHeader num="15" title="Canal de Privacidade e Proteção de Dados" />
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A Formattio mantém um{" "}
                  <strong className="text-foreground">Canal de Privacidade e Proteção de Dados</strong>{" "}
                  dedicado ao atendimento de questões relacionadas ao tratamento de dados pessoais. Não
                  possuímos Encarregado (DPO) formalmente designado nesta fase, mas o canal é monitorado
                  por responsáveis internos com competência para responder às demandas dos titulares.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a
                    href="mailto:privacidade@formattio.com.br"
                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-4 hover:bg-accent transition-colors group"
                  >
                    <div className="flex-none w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="16" x="2" y="4" rx="2"/>
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">E-mail</p>
                      <p className="text-xs text-muted-foreground">privacidade@formattio.com.br</p>
                    </div>
                  </a>
                  <Link
                    href="/privacidade/contato"
                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-4 hover:bg-accent transition-colors group"
                  >
                    <div className="flex-none w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Formulário</p>
                      <p className="text-xs text-muted-foreground">/privacidade/contato</p>
                    </div>
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground">
                  Eventuais comunicações com a{" "}
                  <strong className="text-foreground">Autoridade Nacional de Proteção de Dados (ANPD)</strong>{" "}
                  serão realizadas por meio deste mesmo canal.
                </p>
              </div>
            </section>

            {/* ── 16. Alterações ──────────────────────────────────── */}
            <section id="alteracoes" className="scroll-mt-20">
              <SectionHeader num="16" title="Alterações nesta Política" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>
                  Esta Política pode ser atualizada periodicamente para refletir mudanças no serviço,
                  na legislação ou em nossas práticas de privacidade. Quando isso ocorrer:
                </p>
                <ul>
                  <li>Atualizaremos o número de versão e a data no topo deste documento.</li>
                  <li>
                    Exibiremos um <strong>aviso destacado na plataforma</strong> informando os titulares
                    sobre as alterações relevantes.
                  </li>
                  <li>
                    Para alterações que impliquem novo tratamento de dados ou mudança de base legal,
                    solicitaremos <strong>consentimento expresso renovado</strong> quando aplicável.
                  </li>
                  <li>
                    Você pode consultar versões anteriores mediante solicitação ao Canal de Privacidade.
                  </li>
                </ul>
                <p>
                  Recomendamos a leitura periódica desta Política. A continuidade do uso da plataforma
                  após notificação de atualização não constitui, por si só, aceitação tácita de novos
                  termos — novos consentimentos serão obtidos quando juridicamente necessários.
                </p>
              </div>
            </section>

            {/* Footer note */}
            <div className="border-t border-border/60 pt-6">
              <p className="text-sm text-muted-foreground">
                Esta Política está em conformidade com a Lei nº 13.709/2018 (LGPD) e demais regulamentações
                da ANPD. Versão <strong className="text-foreground">{PRIVACY_VERSION}</strong> — Última
                atualização: {PRIVACY_DATE}.
              </p>
            </div>
          </main>
        </div>
      </div>

      <footer className="border-t border-border/60 bg-card/50 mt-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Formattio — Todos os direitos reservados.</span>
          <div className="flex gap-4">
            <Link href="/termos" className="hover:text-foreground transition-colors">Termos de Uso</Link>
            <Link href="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <span className="flex-none mt-0.5 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center leading-none shrink-0">
        {num}
      </span>
      <h2 className="text-xl font-semibold text-foreground leading-snug">{title}</h2>
    </div>
  );
}
