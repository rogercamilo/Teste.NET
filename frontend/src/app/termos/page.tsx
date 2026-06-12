import Link from "next/link";
import { FileText } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso — Formattio",
  description: "Condições de uso da plataforma Formattio para organizações e usuários.",
};

import { TERMS_VERSION } from "@/lib/legal-versions";
export { TERMS_VERSION };
export const TERMS_DATE = "24 de maio de 2026";

const tocSections = [
  { id: "aceitacao", num: "1", label: "Aceitação" },
  { id: "descricao", num: "2", label: "Descrição do Serviço" },
  { id: "natureza", num: "3", label: "Natureza Empresarial" },
  { id: "elegibilidade", num: "4", label: "Elegibilidade" },
  { id: "cadastro", num: "5", label: "Cadastro e Conta" },
  { id: "planos", num: "6", label: "Planos e Pagamento" },
  { id: "uso-aceitavel", num: "7", label: "Uso Aceitável" },
  { id: "dados-privacidade", num: "8", label: "Dados e Privacidade" },
  { id: "propriedade", num: "9", label: "Propriedade Intelectual" },
  { id: "disponibilidade", num: "10", label: "Disponibilidade e Garantias" },
  { id: "seguranca", num: "11", label: "Segurança da Informação" },
  { id: "backup-retencao", num: "12", label: "Backup e Retenção" },
  { id: "exportacao", num: "13", label: "Exportação de Dados" },
  { id: "subprocessadores", num: "14", label: "Subprocessadores" },
  { id: "logs-auditoria", num: "15", label: "Logs e Auditoria" },
  { id: "limitacao", num: "16", label: "Limitação de Responsabilidade" },
  { id: "indenizacao", num: "17", label: "Indenização" },
  { id: "forca-maior", num: "18", label: "Força Maior" },
  { id: "suspensao", num: "19", label: "Suspensão e Rescisão" },
  { id: "alteracoes", num: "20", label: "Alterações" },
  { id: "foro", num: "21", label: "Legislação e Foro" },
  { id: "contato", num: "22", label: "Contato" },
];

export default function TermosDeUsoPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-foreground font-semibold hover:opacity-80 transition-opacity"
          >
            <FileText className="h-5 w-5 text-primary" />
            Formattio
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Versão {TERMS_VERSION}
            </span>
            <span className="text-xs text-muted-foreground">Atualizada em {TERMS_DATE}</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Page intro */}
        <div className="mb-10 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Termos de Uso</h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Ao utilizar a plataforma <strong className="text-foreground">Formattio</strong>, você concorda com os
            presentes Termos de Uso. Leia com atenção antes de criar uma conta ou utilizar qualquer funcionalidade.
            Estes Termos foram elaborados para garantir uma relação transparente e juridicamente robusta entre a
            Formattio e as organizações contratantes.
          </p>
          <div className="mt-4 rounded-lg border border-blue-200 dark:border-blue-800/50 bg-blue-50/60 dark:bg-blue-950/20 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
            A plataforma destina-se exclusivamente a uso profissional e organizacional. Ao aceitar estes Termos,
            você confirma que possui autoridade para representar a organização contratante.
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

            {/* ── 1. Aceitação ─────────────────────────────────────── */}
            <section id="aceitacao" className="scroll-mt-20">
              <SectionHeader num="1" title="Aceitação" />
              <div className="space-y-4">
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <p>
                    O uso da plataforma Formattio pressupõe a leitura e aceitação integral destes Termos. Caso não
                    concorde com qualquer disposição, não utilize o serviço. O aceite é registrado individualmente
                    por usuário, com versão e data/hora, em conformidade com a LGPD.
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/40 px-4 py-4 text-sm text-muted-foreground leading-relaxed">
                  O usuário reconhece que o aceite eletrônico destes Termos possui{" "}
                  <strong className="text-foreground">validade jurídica plena</strong>, nos termos da legislação
                  brasileira aplicável, constituindo manifestação inequívoca de vontade. A Formattio poderá
                  armazenar registros eletrônicos de aceite, incluindo data, hora, endereço IP, identificadores
                  de dispositivo, versão dos Termos aceitos e logs relacionados, para fins de auditoria,
                  segurança e comprovação.
                </div>
              </div>
            </section>

            {/* ── 2. Descrição do Serviço ──────────────────────────── */}
            <section id="descricao" className="scroll-mt-20">
              <SectionHeader num="2" title="Descrição do Serviço" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>
                  A Formattio é uma plataforma SaaS (Software as a Service) de gestão de formação comunitária.
                  Permite que organizações (doravante "<strong>Organização</strong>" ou "<strong>Tenant</strong>")
                  gerenciem formandos, moradas, planos formativos, presenças e documentos em ambiente com
                  segregação lógica completa de dados entre organizações distintas.
                </p>
              </div>
            </section>

            {/* ── 3. Natureza Empresarial ──────────────────────────── */}
            <section id="natureza" className="scroll-mt-20">
              <SectionHeader num="3" title="Natureza Empresarial da Plataforma" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>
                  A plataforma destina-se exclusivamente a <strong>uso profissional e organizacional</strong>,
                  no contexto de atividades institucionais, administrativas e formativas das Organizações
                  contratantes.
                </p>
                <p>
                  O serviço não é direcionado a consumidores finais para uso pessoal autônomo. A relação
                  estabelecida por estes Termos é de natureza empresarial e institucional (B2B), não se
                  aplicando, portanto, disposições típicas das relações de consumo que sejam incompatíveis
                  com essa natureza.
                </p>
              </div>
            </section>

            {/* ── 4. Elegibilidade ─────────────────────────────────── */}
            <section id="elegibilidade" className="scroll-mt-20">
              <SectionHeader num="4" title="Elegibilidade" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>Para utilizar a Formattio, você deve:</p>
                <ul>
                  <li>Ter ao menos 18 anos ou estar representando uma organização legalmente constituída.</li>
                  <li>Fornecer informações verdadeiras e atualizadas no cadastro.</li>
                  <li>Não utilizar o serviço para finalidades ilegais ou que violem direitos de terceiros.</li>
                </ul>
              </div>
            </section>

            {/* ── 5. Cadastro e Conta ──────────────────────────────── */}
            <section id="cadastro" className="scroll-mt-20">
              <SectionHeader num="5" title="Cadastro e Conta" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>
                  Cada Organização cadastra um Administrador responsável pela conta. O Administrador é
                  responsável por:
                </p>
                <ul>
                  <li>Manter as credenciais de acesso em sigilo.</li>
                  <li>Gerenciar convites e permissões dos demais usuários da organização.</li>
                  <li>
                    Garantir que os dados inseridos na plataforma sejam lícitos e respeitem os direitos dos
                    titulares.
                  </li>
                </ul>
                <p>
                  A Formattio não se responsabiliza por acessos não autorizados decorrentes de falha na guarda
                  das credenciais pelo usuário.
                </p>
              </div>
            </section>

            {/* ── 6. Planos e Pagamento ────────────────────────────── */}
            <section id="planos" className="scroll-mt-20">
              <SectionHeader num="6" title="Planos e Pagamento" />
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      label: "Trial",
                      badge: "14 dias grátis",
                      badgeClass: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
                      desc: "Acesso ao plano Essencial sem necessidade de cartão de crédito. Contas em período de avaliação podem possuir limitações funcionais, ausência de SLA e disponibilidade reduzida de suporte técnico, a exclusivo critério da Formattio.",
                    },
                    {
                      label: "Planos Pagos",
                      badge: "Essencial · Profissional",
                      badgeClass: "bg-primary/10 text-primary",
                      desc: "Cobrança mensal via Stripe. Os valores estão detalhados na página de planos e podem ser alterados mediante aviso prévio de 30 dias.",
                    },
                    {
                      label: "Cancelamento",
                      badge: "A qualquer momento",
                      badgeClass: "bg-muted text-muted-foreground",
                      desc: "Realizado pelo portal do cliente (Stripe). O acesso permanece ativo até o fim do período pago.",
                    },
                    {
                      label: "Inadimplência",
                      badge: "7 dias de carência",
                      badgeClass: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
                      desc: "Após a carência, o acesso é suspenso. Os dados são mantidos por 30 dias adicionais para possibilitar reativação.",
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
              </div>
            </section>

            {/* ── 7. Uso Aceitável ─────────────────────────────────── */}
            <section id="uso-aceitavel" className="scroll-mt-20">
              <SectionHeader num="7" title="Uso Aceitável" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>
                  É <strong>vedado</strong> ao usuário:
                </p>
                <ul>
                  <li>
                    Utilizar a plataforma para armazenar, transmitir ou processar conteúdo ilegal, ofensivo,
                    difamatório ou que viole direitos de terceiros.
                  </li>
                  <li>
                    Realizar engenharia reversa, descompilar ou tentar extrair o código-fonte da plataforma.
                  </li>
                  <li>
                    Sobrecarregar intencionalmente a infraestrutura (ataques de negação de serviço — DoS/DDoS).
                  </li>
                  <li>Compartilhar credenciais de acesso com pessoas não autorizadas.</li>
                  <li>
                    Inserir dados de menores de 12 anos sem a devida autorização dos responsáveis legais.
                  </li>
                  <li>
                    <strong>
                      Utilizar a plataforma para desenvolvimento de produto concorrente
                    </strong>
                    , testes comparativos não autorizados ou coleta automatizada de informações comerciais,
                    técnicas ou funcionais da Formattio.
                  </li>
                </ul>
              </div>
            </section>

            {/* ── 8. Dados e Privacidade ───────────────────────────── */}
            <section id="dados-privacidade" className="scroll-mt-20">
              <SectionHeader num="8" title="Dados e Privacidade (LGPD)" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>
                  A Organização é o <strong>controlador</strong> dos dados pessoais dos formandos que insere
                  na plataforma. A Formattio atua como <strong>operadora</strong>, processando esses dados
                  exclusivamente conforme as instruções da Organização e nos termos do{" "}
                  <strong>DPA (Data Processing Agreement)</strong> aceito no momento do cadastro.
                </p>
                <p>
                  A Organização declara possuir <strong>base legal válida</strong> para coleta, armazenamento
                  e tratamento dos dados pessoais inseridos na plataforma, responsabilizando-se integralmente
                  pela legitimidade do tratamento realizado, inclusive quanto à obtenção de consentimentos,
                  autorizações legais e cumprimento de deveres de transparência perante os titulares.
                </p>
                <p>
                  Para detalhes sobre como a Formattio trata seus dados, consulte nossa{" "}
                  <Link href="/privacidade" className="text-primary hover:underline">
                    Política de Privacidade
                  </Link>
                  .
                </p>
              </div>
            </section>

            {/* ── 9. Propriedade Intelectual ───────────────────────── */}
            <section id="propriedade" className="scroll-mt-20">
              <SectionHeader num="9" title="Propriedade Intelectual" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>
                  Todo o código-fonte, design, marca e conteúdo da plataforma Formattio são de propriedade
                  exclusiva dos seus desenvolvedores. A assinatura concede uma licença de uso limitada, não
                  exclusiva e intransferível para utilização do serviço. Nenhum direito de propriedade
                  intelectual é transferido ao usuário.
                </p>
                <p>
                  Os dados inseridos pela Organização (formandos, planos, documentos) permanecem de
                  propriedade da Organização. A Formattio não reivindica propriedade sobre esses dados.
                </p>
              </div>
            </section>

            {/* ── 10. Disponibilidade e Garantias ──────────────────── */}
            <section id="disponibilidade" className="scroll-mt-20">
              <SectionHeader num="10" title="Disponibilidade e Isenção de Garantias" />
              <div className="space-y-4">
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <p>
                    A Formattio empenha-se em manter disponibilidade de <strong>99,9% ao mês</strong>.
                    Manutenções programadas serão comunicadas com antecedência mínima de 24 horas.
                  </p>
                </div>
                <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-4 space-y-2">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Fornecimento "como está" (As Is / As Available)
                  </p>
                  <p className="text-sm text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                    A plataforma é fornecida <strong>"no estado em que se encontra"</strong> ("as is") e{" "}
                    <strong>"conforme disponibilidade"</strong> ("as available"), podendo sofrer
                    indisponibilidades temporárias, falhas, interrupções, atrasos ou limitações inerentes a
                    serviços digitais e infraestrutura de terceiros.
                  </p>
                </div>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <p>
                    A Formattio <strong>não garante</strong> que:
                  </p>
                  <ul>
                    <li>o serviço será ininterrupto ou livre de erros;</li>
                    <li>a plataforma atenderá integralmente expectativas específicas do usuário;</li>
                    <li>falhas serão corrigidas imediatamente;</li>
                    <li>
                      o serviço estará imune a ataques cibernéticos, eventos externos ou falhas de terceiros.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* ── 11. Segurança da Informação ──────────────────────── */}
            <section id="seguranca" className="scroll-mt-20">
              <SectionHeader num="11" title="Segurança da Informação" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>
                  A Formattio adota medidas técnicas e administrativas razoáveis e compatíveis com o estado
                  da técnica para proteção dos dados tratados, incluindo controles de acesso, criptografia
                  quando aplicável, segregação lógica entre organizações e monitoramento de segurança.
                </p>
                <p>
                  Nenhum sistema é integralmente imune a falhas ou incidentes de segurança, razão pela qual
                  a Formattio <strong>não garante segurança absoluta</strong> contra invasões, ações
                  maliciosas ou eventos externos imprevisíveis.
                </p>
                <p>
                  Para detalhes sobre as medidas técnicas adotadas, consulte a seção de Segurança da
                  Informação em nossa{" "}
                  <Link href="/privacidade#seguranca" className="text-primary hover:underline">
                    Política de Privacidade
                  </Link>
                  .
                </p>
              </div>
            </section>

            {/* ── 12. Backup, Retenção e Exclusão ──────────────────── */}
            <section id="backup-retencao" className="scroll-mt-20">
              <SectionHeader num="12" title="Backup, Retenção e Exclusão de Dados" />
              <div className="space-y-4">
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <p>
                    A Formattio realiza rotinas periódicas de backup para fins de continuidade operacional,
                    sem garantia de recuperação integral em todos os cenários.
                  </p>
                  <p>
                    Após o encerramento da conta ou exclusão definitiva dos dados, os registros poderão
                    permanecer armazenados temporariamente em backups de contingência pelo prazo tecnicamente
                    necessário, sendo posteriormente eliminados conforme políticas internas de retenção e
                    requisitos legais aplicáveis.
                  </p>
                  <p>
                    Decorrido o prazo de retenção após cancelamento da conta, os dados poderão ser excluídos
                    de forma <strong>definitiva e irreversível</strong>, sem possibilidade de recuperação.
                    A Organização é responsável por exportar os dados necessários antes do encerramento
                    da conta.
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/40 px-4 py-3 text-sm text-muted-foreground">
                  <strong className="text-foreground">Prazos de retenção:</strong> Os períodos de retenção
                  detalhados por categoria de dado estão disponíveis na seção de{" "}
                  <Link href="/privacidade#retencao" className="text-primary hover:underline">
                    Retenção de Dados
                  </Link>{" "}
                  da nossa Política de Privacidade.
                </div>
              </div>
            </section>

            {/* ── 13. Exportação de Dados ──────────────────────────── */}
            <section id="exportacao" className="scroll-mt-20">
              <SectionHeader num="13" title="Exportação de Dados" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>
                  A exportação de dados observará os formatos e limitações técnicas disponibilizados pela
                  plataforma à época da solicitação.
                </p>
                <p>
                  A Formattio não se obriga a disponibilizar exportações em formatos específicos não previstos
                  na plataforma ou a manter funcionalidades de exportação inalteradas ao longo do tempo.
                </p>
              </div>
            </section>

            {/* ── 14. Subprocessadores ─────────────────────────────── */}
            <section id="subprocessadores" className="scroll-mt-20">
              <SectionHeader num="14" title="Subprocessadores" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>
                  A Formattio poderá utilizar provedores terceirizados ("<strong>suboperadores</strong>" ou
                  "<strong>subprocessadores</strong>") para hospedagem, processamento de pagamentos, envio
                  de e-mails, monitoramento e infraestrutura tecnológica, observados padrões adequados de
                  segurança e proteção de dados.
                </p>
                <p>
                  A lista atualizada de subprocessadores, incluindo localização e salvaguardas adotadas,
                  está disponível na seção de{" "}
                  <Link
                    href="/privacidade#transferencia-internacional"
                    className="text-primary hover:underline"
                  >
                    Transferência Internacional de Dados
                  </Link>{" "}
                  da nossa Política de Privacidade.
                </p>
              </div>
            </section>

            {/* ── 15. Logs e Auditoria ─────────────────────────────── */}
            <section id="logs-auditoria" className="scroll-mt-20">
              <SectionHeader num="15" title="Logs, Auditoria e Validade Probatória" />
              <div className="space-y-4">
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <p>
                    A Formattio poderá manter registros de acesso, logs operacionais e trilhas de auditoria,
                    nos termos da legislação aplicável, para fins de segurança, prevenção a fraudes,
                    investigação de incidentes e cumprimento de obrigações legais.
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/40 px-4 py-4 text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Validade probatória:</strong> Registros eletrônicos,
                  logs sistêmicos e evidências digitais mantidos pela Formattio poderão ser utilizados como{" "}
                  <strong className="text-foreground">meio válido de prova</strong> em processos
                  administrativos ou judiciais, nos termos da legislação brasileira aplicável.
                </div>
              </div>
            </section>

            {/* ── 16. Limitação de Responsabilidade ────────────────── */}
            <section id="limitacao" className="scroll-mt-20">
              <SectionHeader num="16" title="Limitação de Responsabilidade" />
              <div className="space-y-4">
                <div className="rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50/60 dark:bg-red-950/20 px-4 py-4">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-3">
                    Em nenhuma hipótese a Formattio será responsável por:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      "Lucros cessantes",
                      "Perda de receita",
                      "Perda de oportunidade",
                      "Danos indiretos",
                      "Danos morais",
                      "Perda de dados decorrente de ação do próprio usuário",
                      "Indisponibilidade causada por terceiros",
                      "Ataques cibernéticos inevitáveis",
                      "Falhas de internet ou infraestrutura externa",
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-start gap-2 text-xs text-red-800/80 dark:text-red-300/80"
                      >
                        <span className="mt-0.5 flex-none w-3.5 h-3.5 rounded-full border border-red-300 dark:border-red-700 flex items-center justify-center text-[8px] shrink-0">
                          ✕
                        </span>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <p>
                    A responsabilidade total da Formattio, quando comprovada judicialmente, ficará limitada ao{" "}
                    <strong>
                      montante efetivamente pago pela Organização nos 12 meses anteriores
                    </strong>{" "}
                    ao evento que originou a reclamação.
                  </p>
                  <p>
                    Esta limitação não se aplica nos casos em que a legislação brasileira proibir
                    expressamente tal restrição.
                  </p>
                </div>
              </div>
            </section>

            {/* ── 17. Indenização ──────────────────────────────────── */}
            <section id="indenizacao" className="scroll-mt-20">
              <SectionHeader num="17" title="Indenização" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>
                  A Organização compromete-se a indenizar e manter a Formattio indene de quaisquer
                  reclamações, perdas, danos, custos, sanções, penalidades ou despesas decorrentes:
                </p>
                <ul>
                  <li>do uso indevido da plataforma;</li>
                  <li>da inserção de dados ilícitos;</li>
                  <li>da violação de direitos de terceiros;</li>
                  <li>do descumprimento da LGPD pela Organização;</li>
                  <li>
                    de ordens judiciais relacionadas aos dados inseridos pela própria Organização.
                  </li>
                </ul>
              </div>
            </section>

            {/* ── 18. Força Maior ──────────────────────────────────── */}
            <section id="forca-maior" className="scroll-mt-20">
              <SectionHeader num="18" title="Força Maior e Caso Fortuito" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>
                  A Formattio não será responsabilizada por falhas ou atrasos decorrentes de eventos de força
                  maior ou caso fortuito, incluindo falhas de energia, interrupções de provedores de
                  infraestrutura, ataques cibernéticos em larga escala, desastres naturais, atos
                  governamentais, greves ou eventos fora de seu controle razoável.
                </p>
              </div>
            </section>

            {/* ── 19. Suspensão e Rescisão ─────────────────────────── */}
            <section id="suspensao" className="scroll-mt-20">
              <SectionHeader num="19" title="Suspensão Preventiva e Rescisão" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>
                  A Formattio poderá <strong>suspender preventivamente</strong> o acesso à plataforma quando
                  identificar indícios de atividade suspeita, risco à segurança, tentativa de fraude,
                  comprometimento de credenciais ou uso que possa afetar a estabilidade da infraestrutura.
                </p>
                <p>
                  A Formattio reserva-se o direito de suspender ou encerrar contas que violem estes Termos,
                  sem aviso prévio em casos graves (atividade ilegal, abuso comprovado). Em casos de
                  inadimplência, o processo segue o disposto na cláusula 6.
                </p>
              </div>
            </section>

            {/* ── 20. Alterações ───────────────────────────────────── */}
            <section id="alteracoes" className="scroll-mt-20">
              <SectionHeader num="20" title="Alterações nestes Termos" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>
                  Estes Termos podem ser atualizados. Quando ocorrer alteração relevante, notificaremos por
                  e-mail e exibiremos aviso na plataforma solicitando novo aceite. O uso continuado após o
                  aviso constitui aceitação dos Termos revisados.
                </p>
                <p>
                  Versão atual:{" "}
                  <strong>{TERMS_VERSION}</strong> · Data:{" "}
                  <strong>{TERMS_DATE}</strong>
                </p>
              </div>
            </section>

            {/* ── 21. Legislação e Foro ────────────────────────────── */}
            <section id="foro" className="scroll-mt-20">
              <SectionHeader num="21" title="Legislação Aplicável e Foro" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>
                  Estes Termos são regidos pela legislação brasileira, incluindo a Lei nº 13.709/2018
                  (LGPD) e o Marco Civil da Internet (Lei nº 12.965/2014).
                </p>
                <p>
                  Fica eleito o foro da comarca de <strong>Fortaleza/CE</strong> para dirimir controvérsias
                  relativas a estes Termos, com renúncia expressa a qualquer outro, por mais privilegiado
                  que seja.
                </p>
              </div>
            </section>

            {/* ── 22. Contato ──────────────────────────────────────── */}
            <section id="contato" className="scroll-mt-20">
              <SectionHeader num="22" title="Contato" />
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <p>
                  Dúvidas sobre estes Termos podem ser enviadas para{" "}
                  <strong>contato@formattio.com.br</strong> ou pelo canal de suporte disponível na plataforma.
                </p>
              </div>
            </section>

            {/* Footer note */}
            <div className="border-t border-border/60 pt-6">
              <p className="text-sm text-muted-foreground">
                Termos de Uso em conformidade com a legislação brasileira aplicável, incluindo a Lei nº
                13.709/2018 (LGPD) e o Marco Civil da Internet (Lei nº 12.965/2014). Versão{" "}
                <strong className="text-foreground">{TERMS_VERSION}</strong> — Última atualização:{" "}
                {TERMS_DATE}.
              </p>
            </div>
          </main>
        </div>
      </div>

      <footer className="border-t border-border/60 bg-card/50 mt-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Formattio — Todos os direitos reservados.</span>
          <div className="flex gap-4">
            <Link href="/termos" className="hover:text-foreground transition-colors">
              Termos de Uso
            </Link>
            <Link href="/privacidade" className="hover:text-foreground transition-colors">
              Privacidade
            </Link>
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
