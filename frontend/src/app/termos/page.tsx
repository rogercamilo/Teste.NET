import Link from "next/link";
import { FileText } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso — Formatio",
  description: "Condições de uso da plataforma Formatio.",
};

export const TERMS_VERSION = "1.0";
export const TERMS_DATE = "17 de maio de 2026";

export default function TermosDeUsoPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-foreground font-semibold hover:opacity-80">
            <FileText className="h-5 w-5 text-primary" />
            Formatio
          </Link>
          <span className="text-xs text-muted-foreground">Versão {TERMS_VERSION} · {TERMS_DATE}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 prose prose-neutral dark:prose-invert">
        <h1>Termos de Uso</h1>
        <p className="lead">
          Ao utilizar a plataforma <strong>Formatio</strong>, você concorda com os presentes Termos de Uso.
          Leia com atenção antes de criar uma conta ou utilizar qualquer funcionalidade.
        </p>

        <hr />

        <h2>1. Aceitação</h2>
        <p>
          O uso da plataforma Formatio pressupõe a leitura e aceitação integral destes Termos. Caso não concorde
          com qualquer disposição, não utilize o serviço. O aceite é registrado individualmente por usuário, com
          versão e data/hora, em conformidade com a LGPD.
        </p>

        <h2>2. Descrição do serviço</h2>
        <p>
          A Formatio é uma plataforma SaaS (Software as a Service) de gestão de formação comunitária. Permite que
          organizações (doravante "<strong>Organização</strong>" ou "<strong>Tenant</strong>") gerenciem formandos,
          moradas, planos formativos, presenças e documentos em ambiente seguro, com isolamento completo de dados
          entre organizações distintas.
        </p>

        <h2>3. Elegibilidade</h2>
        <p>Para utilizar a Formatio, você deve:</p>
        <ul>
          <li>Ter ao menos 18 anos ou estar representando uma organização legalmente constituída.</li>
          <li>Fornecer informações verdadeiras e atualizadas no cadastro.</li>
          <li>Não utilizar o serviço para finalidades ilegais ou que violem direitos de terceiros.</li>
        </ul>

        <h2>4. Cadastro e conta</h2>
        <p>
          Cada Organização cadastra um Administrador responsável pela conta. O Administrador é responsável por:
        </p>
        <ul>
          <li>Manter as credenciais de acesso em sigilo.</li>
          <li>Gerenciar convites e permissões dos demais usuários da organização.</li>
          <li>Garantir que os dados inseridos na plataforma sejam lícitos e respeitem os direitos dos titulares.</li>
        </ul>
        <p>
          A Formatio não se responsabiliza por acessos não autorizados decorrentes de falha na guarda das credenciais
          pelo usuário.
        </p>

        <h2>5. Planos e pagamento</h2>
        <ul>
          <li><strong>Trial:</strong> 14 dias gratuitos com acesso ao plano Essencial, sem necessidade de cartão de crédito.</li>
          <li><strong>Planos pagos:</strong> Essencial e Profissional, com cobrança mensal via Stripe. Os valores estão detalhados na página de planos.</li>
          <li><strong>Cancelamento:</strong> pode ser realizado a qualquer momento pelo portal do cliente (Stripe). O acesso permanece ativo até o fim do período pago.</li>
          <li><strong>Inadimplência:</strong> após 7 dias de carência, o acesso é suspenso. Os dados são mantidos por 30 dias adicionais para possibilitar a reativação.</li>
        </ul>

        <h2>6. Uso aceitável</h2>
        <p>É <strong>vedado</strong> ao usuário:</p>
        <ul>
          <li>Utilizar a plataforma para armazenar, transmitir ou processar conteúdo ilegal, ofensivo, difamatório ou que viole direitos de terceiros.</li>
          <li>Realizar engenharia reversa, descompilar ou tentar extrair o código-fonte da plataforma.</li>
          <li>Sobrecarregar intencionalmente a infraestrutura (ataques de negação de serviço).</li>
          <li>Compartilhar credenciais de acesso com pessoas não autorizadas.</li>
          <li>Inserir dados de menores de 12 anos sem a devida autorização dos responsáveis legais.</li>
        </ul>

        <h2>7. Dados e privacidade</h2>
        <p>
          A Organização é o <strong>controlador</strong> dos dados pessoais dos formandos que insere na plataforma.
          A Formatio atua como <strong>operadora</strong>, processando esses dados exclusivamente conforme as instruções
          da Organização e nos termos do <strong>DPA (Data Processing Agreement)</strong> aceito no momento do cadastro.
        </p>
        <p>
          Para detalhes sobre como tratamos seus dados, consulte nossa{" "}
          <Link href="/privacidade" className="text-primary hover:underline">
            Política de Privacidade
          </Link>.
        </p>

        <h2>8. Propriedade intelectual</h2>
        <p>
          Todo o código-fonte, design, marca e conteúdo da plataforma Formatio são de propriedade exclusiva dos
          seus desenvolvedores. A assinatura concede uma licença de uso limitada, não exclusiva e intransferível
          para utilização do serviço. Nenhum direito de propriedade intelectual é transferido ao usuário.
        </p>
        <p>
          Os dados inseridos pela Organização (formandos, planos, documentos) permanecem de propriedade da Organização.
          A Formatio não reivindica propriedade sobre esses dados.
        </p>

        <h2>9. Disponibilidade e SLA</h2>
        <p>
          A Formatio empenha-se em manter disponibilidade de 99,9% ao mês. Manutenções programadas serão
          comunicadas com antecedência mínima de 24 horas. A Formatio não se responsabiliza por indisponibilidades
          causadas por fatores fora de seu controle (falhas de provedores de infraestrutura, ataques externos, etc.).
        </p>

        <h2>10. Limitação de responsabilidade</h2>
        <p>
          A Formatio não se responsabiliza por danos indiretos, incidentais, especiais ou consequenciais decorrentes
          do uso ou incapacidade de uso do serviço. A responsabilidade total da Formatio, em qualquer circunstância,
          limita-se ao valor pago pelo usuário nos últimos 3 meses de serviço.
        </p>

        <h2>11. Rescisão</h2>
        <p>
          A Formatio reserva-se o direito de suspender ou encerrar contas que violem estes Termos, sem aviso prévio
          em casos graves (atividade ilegal, abuso comprovado). Em casos de inadimplência, o processo segue o disposto
          na cláusula 5.
        </p>

        <h2>12. Alterações nos Termos</h2>
        <p>
          Estes Termos podem ser atualizados. Quando ocorrer alteração relevante, notificaremos por e-mail e
          exibiremos aviso na plataforma solicitando novo aceite. O uso continuado após o aviso constitui aceitação
          dos Termos revisados.
        </p>
        <p>Versão atual: <strong>{TERMS_VERSION}</strong> · Data: <strong>{TERMS_DATE}</strong></p>

        <h2>13. Legislação aplicável</h2>
        <p>
          Estes Termos são regidos pela legislação brasileira. Fica eleito o foro da comarca de domicílio do
          contratante para dirimir eventuais controvérsias, salvo acordo em contrário.
        </p>

        <h2>14. Contato</h2>
        <p>
          Dúvidas sobre estes Termos podem ser enviadas para <strong>contato@formatio.app</strong> ou pelo canal
          de suporte disponível na plataforma.
        </p>

        <hr />

        <p className="text-sm text-muted-foreground">
          Termos de Uso — Versão {TERMS_VERSION} · Última atualização: {TERMS_DATE}.
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
