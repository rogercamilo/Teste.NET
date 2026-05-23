import Link from "next/link";
import { Shield } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — Formatio",
  description: "Como a Formatio coleta, usa e protege seus dados pessoais.",
};

export const PRIVACY_VERSION = "1.0";
export const PRIVACY_DATE = "17 de maio de 2026";

export default function PoliticaPrivacidadePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-foreground font-semibold hover:opacity-80">
            <Shield className="h-5 w-5 text-primary" />
            Formatio
          </Link>
          <span className="text-xs text-muted-foreground">Versão {PRIVACY_VERSION} · {PRIVACY_DATE}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 prose prose-neutral dark:prose-invert">
        <h1>Política de Privacidade</h1>
        <p className="lead">
          A <strong>Formatio</strong> respeita a sua privacidade e está comprometida com a proteção dos seus dados
          pessoais em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.
        </p>
        <p>
          Esta Política descreve como coletamos, usamos, armazenamos e compartilhamos seus dados pessoais, bem como
          os direitos que você possui como titular.
        </p>

        <hr />

        <h2>1. Quem somos</h2>
        <p>
          A Formatio é uma plataforma SaaS de gestão de formação comunitária. Neste documento, "<strong>Formatio</strong>",
          "<strong>nós</strong>" ou "<strong>plataforma</strong>" refere-se ao operador do serviço. Cada organização
          assinante é o <strong>controlador</strong> dos dados de seus formandos; a Formatio atua como <strong>operadora</strong>.
        </p>

        <h2>2. Dados coletados</h2>
        <h3>2.1 Dados que você fornece</h3>
        <ul>
          <li><strong>Cadastro de organização:</strong> nome da organização, nome e e-mail do administrador, senha (armazenada com hash scrypt + salt).</li>
          <li><strong>Perfil de usuário:</strong> nome, e-mail, foto de perfil (opcional).</li>
          <li><strong>Dados de formandos:</strong> nome, data de nascimento, estado civil, nível formativo, telefone, e-mail e foto (inseridos pelos administradores/formadores da organização).</li>
          <li><strong>Documentos:</strong> arquivos PDF/DOCX enviados por usuários autenticados.</li>
        </ul>
        <h3>2.2 Dados coletados automaticamente</h3>
        <ul>
          <li><strong>Logs de auditoria:</strong> ações realizadas na plataforma (login, criação, edição, exclusão), com endereço IP <em>anonimizado</em> (último octeto substituído por "xxx" para IPv4).</li>
          <li><strong>Cookies de sessão:</strong> necessários para manter você autenticado (via NextAuth).</li>
          <li><strong>Preferências de consentimento de cookies:</strong> sua escolha sobre cookies analíticos, de marketing e de preferências.</li>
        </ul>

        <h2>3. Finalidade e base legal</h2>
        <table>
          <thead>
            <tr><th>Finalidade</th><th>Base legal (LGPD)</th></tr>
          </thead>
          <tbody>
            <tr><td>Autenticação e segurança da conta</td><td>Legítimo interesse / Execução de contrato (art. 7º, II e IX)</td></tr>
            <tr><td>Gestão formativa (formandos, presenças, planos)</td><td>Execução de contrato — serviço contratado pela organização (art. 7º, V)</td></tr>
            <tr><td>Comunicações transacionais (convites, recuperação de senha)</td><td>Execução de contrato (art. 7º, V)</td></tr>
            <tr><td>Notificações de limite de plano e inadimplência</td><td>Legítimo interesse / Execução de contrato (art. 7º, IX)</td></tr>
            <tr><td>Logs de auditoria e conformidade legal</td><td>Cumprimento de obrigação legal (art. 7º, II)</td></tr>
            <tr><td>Cookies analíticos e de marketing</td><td>Consentimento explícito (art. 7º, I)</td></tr>
            <tr><td>Melhoria contínua do serviço (métricas agregadas)</td><td>Legítimo interesse (art. 7º, IX)</td></tr>
          </tbody>
        </table>

        <h2>4. Retenção de dados</h2>
        <ul>
          <li><strong>Dados de conta ativa:</strong> mantidos durante toda a vigência do contrato.</li>
          <li><strong>Logs de auditoria:</strong> retidos por 12 meses a partir da geração.</li>
          <li><strong>Dados após cancelamento:</strong> mantidos por 30 dias (período de recuperação), seguido de exclusão permanente (hard delete) e purge de arquivos no storage.</li>
          <li><strong>Backups:</strong> retidos por 30 dias; excluídos automaticamente após esse prazo.</li>
        </ul>

        <h2>5. Compartilhamento de dados</h2>
        <p>
          A Formatio <strong>não vende</strong> dados pessoais. Compartilhamos apenas com subprocessadores necessários
          à operação do serviço, todos com DPA equivalente ao Brasil:
        </p>
        <ul>
          <li><strong>Railway</strong> — hospedagem da aplicação e banco de dados PostgreSQL (EUA/EU, DPA disponível).</li>
          <li><strong>Cloudflare R2</strong> — armazenamento de arquivos com redundância geográfica.</li>
          <li><strong>Stripe</strong> — processamento de pagamentos (dados de cobrança apenas).</li>
          <li><strong>Resend</strong> — envio de e-mails transacionais.</li>
          <li><strong>Sentry</strong> — monitoramento de erros (configurado com <code>sendDefaultPii: false</code>).</li>
        </ul>

        <h2>6. Segurança</h2>
        <ul>
          <li>Comunicação protegida por HTTPS/TLS em todos os ambientes.</li>
          <li>Senhas armazenadas com <strong>scrypt + salt aleatório de 32 bytes</strong>; nunca em texto claro.</li>
          <li>Dados de formandos armazenados exclusivamente no servidor (PostgreSQL); proibido uso de localStorage.</li>
          <li>Arquivos armazenados no Cloudflare R2 com acesso exclusivo via <strong>URLs pré-assinadas</strong> com expiração de 15 minutos.</li>
          <li>Rate limiting nos endpoints de autenticação: máximo 5 tentativas por IP em 15 minutos.</li>
          <li>Logs de auditoria com IP anonimizado para todas as ações críticas.</li>
        </ul>

        <h2>7. Direitos do titular (LGPD)</h2>
        <p>Você tem os seguintes direitos em relação aos seus dados pessoais:</p>
        <ul>
          <li><strong>Acesso:</strong> solicitar cópia dos seus dados em formato JSON ou CSV.</li>
          <li><strong>Retificação:</strong> corrigir dados incompletos ou imprecisos.</li>
          <li><strong>Exclusão:</strong> solicitar a exclusão da sua conta (soft delete por 30 dias, depois hard delete).</li>
          <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado e legível por máquina.</li>
          <li><strong>Revogação do consentimento:</strong> retirar consentimento de cookies analíticos/marketing a qualquer momento.</li>
          <li><strong>Informação:</strong> ser informado sobre com quem seus dados são compartilhados.</li>
          <li><strong>Oposição:</strong> opor-se ao tratamento em determinadas circunstâncias.</li>
        </ul>
        <p>
          Para exercer esses direitos, acesse{" "}
          <Link href="/privacidade/contato" className="text-primary hover:underline">
            /privacidade/contato
          </Link>{" "}
          ou envie um e-mail para <strong>privacidade@formatio.app</strong>.
        </p>

        <h2>8. Cookies</h2>
        <p>Utilizamos as seguintes categorias de cookies:</p>
        <ul>
          <li><strong>Necessários:</strong> essenciais para funcionamento e autenticação. Sempre ativos.</li>
          <li><strong>Analíticos:</strong> métricas de uso e performance. Ativados apenas com seu consentimento.</li>
          <li><strong>Marketing:</strong> personalização de comunicações. Ativados apenas com seu consentimento.</li>
          <li><strong>Preferências:</strong> tema, idioma e configurações da interface. Ativados apenas com seu consentimento.</li>
        </ul>
        <p>
          Você pode gerenciar suas preferências de cookies a qualquer momento pelo banner exibido na plataforma
          ou por meio do link "Preferências de cookies" no rodapé.
        </p>

        <h2>9. Alterações nesta Política</h2>
        <p>
          Esta Política pode ser atualizada periodicamente. Quando isso ocorrer, atualizaremos a versão e a data
          acima, e exibiremos um aviso na plataforma solicitando novo aceite. O uso continuado após a publicação
          da nova versão constitui aceite dos termos revisados.
        </p>
        <p>Versão atual: <strong>{PRIVACY_VERSION}</strong> · Data: <strong>{PRIVACY_DATE}</strong></p>

        <h2>10. Contato e DPO</h2>
        <p>
          Para dúvidas sobre esta Política ou para exercer seus direitos como titular, entre em contato:
        </p>
        <ul>
          <li><strong>E-mail:</strong> privacidade@formatio.app</li>
          <li><strong>Formulário:</strong>{" "}
            <Link href="/privacidade/contato" className="text-primary hover:underline">
              /privacidade/contato
            </Link>
          </li>
        </ul>

        <hr />

        <p className="text-sm text-muted-foreground">
          Esta Política está em conformidade com a Lei nº 13.709/2018 (LGPD).
          Versão {PRIVACY_VERSION} — Última atualização: {PRIVACY_DATE}.
        </p>
      </main>

      <footer className="border-t border-border/60 bg-card/50 mt-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Formatio — Todos os direitos reservados.</span>
          <div className="flex gap-4">
            <Link href="/termos" className="hover:text-foreground">Termos de Uso</Link>
            <Link href="/privacidade" className="hover:text-foreground">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
