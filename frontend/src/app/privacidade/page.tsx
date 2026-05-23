import Link from "next/link";
import { Shield } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — Formatio",
  description: "Como a Formatio coleta, usa e protege seus dados pessoais.",
};

export const PRIVACY_VERSION = "1.1";
export const PRIVACY_DATE = "23 de maio de 2026";

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

        {/* ── 1. Estrutura Jurídica ─────────────────────────────────── */}
        <h2>1. Estrutura Jurídica e Papéis no Tratamento</h2>
        <p>
          A Formatio opera em duplo papel no ecossistema de proteção de dados:
        </p>
        <ul>
          <li>
            <strong>Controladora</strong> — em relação aos dados dos <em>administradores e usuários da plataforma</em>{" "}
            (nome, e-mail, senha, logs de acesso), a Formatio define as finalidades e os meios do tratamento.
          </li>
          <li>
            <strong>Operadora</strong> — em relação aos dados dos <em>formandos cadastrados pelas organizações</em>{" "}
            assinantes, a Formatio trata os dados segundo as instruções de cada organização, que é a Controladora
            desses dados.
          </li>
        </ul>
        <p>
          Essa distinção é regulada pelos arts. 5º, VI e VII, e 39 da LGPD. A Formatio mantém com cada
          organização assinante um Acordo de Processamento de Dados (DPA), disponível mediante solicitação.
        </p>

        {/* ── 2. Responsabilidade das Organizações ─────────────────── */}
        <h2>2. Responsabilidade das Organizações Usuárias</h2>
        <p>
          Cada organização assinante é integralmente responsável pelos dados pessoais que insere na plataforma,
          em especial dados de formandos. Cabe à organização:
        </p>
        <ul>
          <li>Obter base legal adequada (art. 7º LGPD) antes de inserir dados de terceiros na plataforma.</li>
          <li>
            Colher consentimento específico e destacado dos titulares quando exigido, especialmente para dados
            sensíveis (art. 11, I, LGPD).
          </li>
          <li>Informar os titulares sobre o tratamento realizado pela organização e pela Formatio.</li>
          <li>Atender às solicitações de direitos dos titulares encaminhadas à organização.</li>
        </ul>
        <p>
          A Formatio disponibiliza ferramentas técnicas para facilitar o cumprimento dessas obrigações
          (exportação de dados, exclusão de registros, logs de auditoria), mas a responsabilidade jurídica
          pelo tratamento dos dados de formandos é da organização assinante.
        </p>

        {/* ── 3. Dados Coletados ────────────────────────────────────── */}
        <h2>3. Dados Coletados</h2>
        <h3>3.1 Dados fornecidos diretamente</h3>
        <ul>
          <li><strong>Cadastro de organização:</strong> nome da organização, nome e e-mail do administrador, senha (armazenada com hash scrypt + salt).</li>
          <li><strong>Perfil de usuário:</strong> nome, e-mail, foto de perfil (opcional).</li>
          <li>
            <strong>Dados de formandos:</strong> nome, data de nascimento, estado civil, nível formativo,
            telefone, e-mail e foto — inseridos pelos administradores e formadores da organização.
          </li>
          <li><strong>Documentos:</strong> arquivos PDF/DOCX enviados por usuários autenticados.</li>
        </ul>

        <h3>3.2 Dados coletados automaticamente</h3>
        <ul>
          <li>
            <strong>Logs de auditoria:</strong> ações realizadas na plataforma (login, criação, edição,
            exclusão), com endereço IP <em>anonimizado</em> (último octeto IPv4 substituído por "xxx").
          </li>
          <li><strong>Cookies de sessão:</strong> necessários para manter a autenticação (via NextAuth).</li>
          <li>
            <strong>Registro de consentimento de cookies:</strong> data e hora, endereço IP (anonimizado),
            versão da Política e preferências selecionadas — armazenados para fins de conformidade legal.
          </li>
        </ul>

        {/* ── 4. Dados Pessoais Sensíveis ──────────────────────────── */}
        <h2>4. Dados Pessoais Sensíveis</h2>
        <p>
          A Formatio reconhece que organizações de formação comunitária, pastoral, vocacional ou espiritual
          podem registrar informações que se enquadram como <strong>dados pessoais sensíveis</strong> nos termos
          do art. 5º, II, c/c arts. 7º e 11 da LGPD, tais como:
        </p>
        <ul>
          <li>Convicção religiosa ou pertença a comunidade de fé;</li>
          <li>Dados sobre saúde física ou mental de formandos;</li>
          <li>Dados de natureza vocacional, espiritual ou pastoral;</li>
          <li>Dados de menores de 18 anos (tratados na seção seguinte).</li>
        </ul>
        <p>
          O tratamento desses dados somente poderá ocorrer com <strong>consentimento específico e destacado
          do titular</strong> (art. 11, I, LGPD) ou nas demais hipóteses taxativas do art. 11, II.
          A organização assinante é responsável por garantir a base legal adequada antes de inserir
          dados sensíveis na plataforma.
        </p>
        <p>
          A Formatio adota controles técnicos adicionais para dados sensíveis: acesso restrito por
          perfil, registros de auditoria específicos e criptografia em repouso na camada de
          armazenamento (seção 8).
        </p>

        {/* ── 5. Dados de Menores ──────────────────────────────────── */}
        <h2>5. Dados de Menores de Idade</h2>
        <p>
          Nos termos do art. 14 da LGPD, o tratamento de dados pessoais de crianças (menores de 12 anos)
          e adolescentes (entre 12 e 18 anos) exige atenção especial:
        </p>
        <ul>
          <li>
            Para <strong>crianças</strong>: o consentimento deve ser dado por pelo menos um dos pais ou
            responsável legal, de forma específica e destacada.
          </li>
          <li>
            Para <strong>adolescentes</strong>: o tratamento deve ser realizado no seu melhor interesse,
            podendo o consentimento ser dado pelo próprio adolescente ou por responsável legal,
            conforme o contexto.
          </li>
          <li>
            A Formatio <strong>não coleta diretamente</strong> dados de menores — esses dados são inseridos
            pelas organizações assinantes, que são responsáveis por obter as autorizações necessárias.
          </li>
          <li>
            Nenhuma funcionalidade da Formatio é direcionada a crianças para uso direto e autônomo.
          </li>
        </ul>

        {/* ── 6. Finalidade e Base Legal ───────────────────────────── */}
        <h2>6. Finalidade e Base Legal</h2>
        <table>
          <thead>
            <tr><th>Finalidade</th><th>Base legal (LGPD)</th></tr>
          </thead>
          <tbody>
            <tr><td>Autenticação e segurança da conta</td><td>Legítimo interesse / Execução de contrato (art. 7º, II e IX)</td></tr>
            <tr><td>Gestão formativa (formandos, presenças, planos)</td><td>Execução de contrato — serviço contratado pela organização (art. 7º, V)</td></tr>
            <tr><td>Comunicações transacionais (convites, recuperação de senha)</td><td>Execução de contrato (art. 7º, V)</td></tr>
            <tr><td>Atendimento ao cliente e suporte técnico</td><td>Execução de contrato / Legítimo interesse (art. 7º, V e IX)</td></tr>
            <tr><td>Prevenção a fraudes e uso abusivo</td><td>Legítimo interesse (art. 7º, IX)</td></tr>
            <tr><td>Monitoramento de segurança e estabilidade do serviço</td><td>Legítimo interesse (art. 7º, IX)</td></tr>
            <tr><td>Notificações de limite de plano e inadimplência</td><td>Legítimo interesse / Execução de contrato (art. 7º, IX)</td></tr>
            <tr><td>Logs de auditoria e conformidade legal</td><td>Cumprimento de obrigação legal (art. 7º, II)</td></tr>
            <tr><td>Métricas de performance e melhoria do serviço (dados agregados e anonimizados)</td><td>Legítimo interesse (art. 7º, IX)</td></tr>
            <tr><td>Cookies analíticos e de marketing</td><td>Consentimento explícito (art. 7º, I)</td></tr>
          </tbody>
        </table>

        {/* ── 7. Retenção de Dados ─────────────────────────────────── */}
        <h2>7. Retenção de Dados</h2>
        <p>Os dados são retidos pelos prazos descritos abaixo, após os quais são excluídos de forma segura:</p>
        <table>
          <thead>
            <tr><th>Categoria de dado</th><th>Prazo de retenção</th><th>Tipo de exclusão</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Dados de conta ativa (usuários e organização)</td>
              <td>Vigência do contrato</td>
              <td>Lógica (soft delete) durante vigência; física (hard delete) após cancelamento</td>
            </tr>
            <tr>
              <td>Dados de formandos</td>
              <td>Vigência do contrato + 30 dias de carência</td>
              <td>Hard delete e purge de arquivos no storage</td>
            </tr>
            <tr>
              <td>Logs de auditoria</td>
              <td>12 meses a partir da geração</td>
              <td>Hard delete automático</td>
            </tr>
            <tr>
              <td>Dados após cancelamento (carência)</td>
              <td>30 dias</td>
              <td>Hard delete ao término da carência</td>
            </tr>
            <tr>
              <td>Backups de banco de dados</td>
              <td>30 dias</td>
              <td>Excluídos automaticamente (política do provedor)</td>
            </tr>
            <tr>
              <td>Registros de consentimento de cookies</td>
              <td>5 anos (prazo legal de comprovação)</td>
              <td>Hard delete após o prazo</td>
            </tr>
            <tr>
              <td>Dados de cobrança (Stripe)</td>
              <td>5 anos (obrigação fiscal/contábil)</td>
              <td>Conforme política do Stripe e legislação fiscal brasileira</td>
            </tr>
          </tbody>
        </table>

        {/* ── 8. Segurança ─────────────────────────────────────────── */}
        <h2>8. Segurança da Informação</h2>
        <p>A Formatio adota medidas técnicas e organizacionais para proteger seus dados, incluindo:</p>
        <ul>
          <li>Comunicação protegida por <strong>HTTPS/TLS</strong> em todos os ambientes.</li>
          <li>
            Senhas armazenadas com <strong>scrypt + salt aleatório de 32 bytes</strong> — armazenamento
            em hash unidirecional, sem reversão possível.
          </li>
          <li>
            <strong>Criptografia em repouso</strong> na camada de banco de dados (PostgreSQL) e nos
            volumes de armazenamento gerenciados pelo provedor de hospedagem (Railway).
          </li>
          <li>
            <strong>Criptografia de backups</strong> — backups do banco de dados são criptografados
            pelo provedor antes do armazenamento.
          </li>
          <li>
            Dados de formandos armazenados no servidor (PostgreSQL), com proibição técnica de uso
            de armazenamento local não criptografado no navegador.
          </li>
          <li>
            Arquivos armazenados no Cloudflare R2 com acesso controlado via{" "}
            <strong>URLs pré-assinadas</strong> com expiração de 15 minutos.
          </li>
          <li>
            <strong>Controle de acesso baseado em perfil</strong> (RBAC): separação de permissões entre
            Formador Comunitário, Formador Geral e Administrador; acesso à área Super Admin restrito.
          </li>
          <li>
            <strong>Autenticação multifator (MFA)</strong> disponível para contas de administrador via
            Google OAuth.
          </li>
          <li>
            Rate limiting nos endpoints de autenticação: máximo 5 tentativas por IP em 15 minutos.
          </li>
          <li>Logs de auditoria com IP anonimizado para todas as ações críticas.</li>
        </ul>

        {/* ── 9. Incidentes de Segurança ───────────────────────────── */}
        <h2>9. Incidentes de Segurança</h2>
        <p>
          Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares
          (vazamento, acesso não autorizado, perda ou alteração indevida de dados), a Formatio adotará
          as seguintes medidas:
        </p>
        <ul>
          <li>
            <strong>Notificação à ANPD</strong> no prazo de <strong>72 horas</strong> a partir da
            ciência do incidente, conforme art. 48 da LGPD e regulamentação da Autoridade Nacional
            de Proteção de Dados.
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
            Registro e documentação do incidente no <strong>Registro de Operações de Tratamento</strong>
            interno, conforme art. 37 da LGPD.
          </li>
        </ul>

        {/* ── 10. Transferência Internacional ──────────────────────── */}
        <h2>10. Transferência Internacional de Dados</h2>
        <p>
          A Formatio utiliza subprocessadores localizados nos <strong>Estados Unidos</strong> e na{" "}
          <strong>União Europeia</strong>. Toda transferência internacional de dados pessoais é realizada
          com base em salvaguardas adequadas, conforme art. 33 da LGPD:
        </p>
        <table>
          <thead>
            <tr><th>Subprocessador</th><th>Localização</th><th>Salvaguarda</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Railway</td>
              <td>EUA / UE</td>
              <td>Data Processing Agreement (DPA); cláusulas contratuais padrão</td>
            </tr>
            <tr>
              <td>Cloudflare R2</td>
              <td>EUA / múltiplas regiões</td>
              <td>DPA Cloudflare; certificação ISO 27001</td>
            </tr>
            <tr>
              <td>Stripe</td>
              <td>EUA</td>
              <td>DPA Stripe; certificação PCI-DSS Level 1; cláusulas padrão UE</td>
            </tr>
            <tr>
              <td>Resend</td>
              <td>EUA</td>
              <td>DPA Resend; dados limitados a e-mail transacional</td>
            </tr>
            <tr>
              <td>Sentry</td>
              <td>EUA</td>
              <td>DPA Sentry; <code>sendDefaultPii: false</code> (sem PII em erros)</td>
            </tr>
          </tbody>
        </table>
        <p>
          A lista atualizada de subprocessadores, incluindo os respectivos DPAs, está disponível
          mediante solicitação ao Canal de Privacidade (seção 14).
        </p>

        {/* ── 11. Compartilhamento de Dados ────────────────────────── */}
        <h2>11. Compartilhamento de Dados</h2>
        <p>
          A Formatio <strong>não comercializa</strong> dados pessoais. Compartilhamos dados somente com os
          subprocessadores listados na seção 10, estritamente necessários à operação do serviço, e com
          autoridades públicas quando exigido por lei ou ordem judicial.
        </p>

        {/* ── 12. Cookies ──────────────────────────────────────────── */}
        <h2>12. Cookies</h2>
        <p>Utilizamos as seguintes categorias de cookies:</p>
        <ul>
          <li><strong>Necessários:</strong> essenciais para funcionamento e autenticação. Sempre ativos e dispensados de consentimento.</li>
          <li><strong>Analíticos:</strong> métricas de uso e performance. Ativados apenas com seu consentimento explícito.</li>
          <li><strong>Marketing:</strong> personalização de comunicações. Ativados apenas com seu consentimento explícito.</li>
          <li><strong>Preferências:</strong> tema, idioma e configurações da interface. Ativados apenas com seu consentimento explícito.</li>
        </ul>
        <p>
          Ao registrar sua preferência de cookies, gravamos: <strong>data e hora do consentimento,
          endereço IP anonimizado, versão desta Política e preferências selecionadas</strong>. Esse
          registro é mantido por 5 anos para fins de demonstração de conformidade.
        </p>
        <p>
          Você pode rever ou retirar seu consentimento a qualquer momento pelo banner exibido na
          plataforma ou pelo link "Preferências de cookies" no rodapé.
        </p>

        {/* ── 13. Direitos do Titular ──────────────────────────────── */}
        <h2>13. Direitos do Titular (LGPD)</h2>
        <p>
          Nos termos do art. 18 da LGPD, você possui os seguintes direitos em relação aos seus dados pessoais:
        </p>
        <ul>
          <li><strong>Confirmação e acesso:</strong> solicitar confirmação de tratamento e cópia dos seus dados em formato JSON ou CSV.</li>
          <li><strong>Retificação:</strong> corrigir dados incompletos, inexatos ou desatualizados.</li>
          <li><strong>Anonimização, bloqueio ou eliminação:</strong> solicitar a anonimização ou exclusão de dados desnecessários ou tratados em desconformidade com a LGPD.</li>
          <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado e legível por máquina para transferência a outro fornecedor.</li>
          <li><strong>Eliminação (dados com base em consentimento):</strong> solicitar exclusão de dados tratados com base em seu consentimento, ressalvadas as hipóteses legais de retenção.</li>
          <li><strong>Revogação do consentimento:</strong> retirar consentimento de cookies analíticos/marketing a qualquer momento, sem prejuízo do tratamento anterior.</li>
          <li><strong>Informação:</strong> ser informado sobre com quem seus dados são compartilhados e sobre a possibilidade de não fornecer consentimento.</li>
          <li><strong>Oposição:</strong> opor-se ao tratamento realizado com fundamento diverso do consentimento, em caso de descumprimento da LGPD.</li>
          <li><strong>Revisão de decisões automatizadas:</strong> solicitar revisão de decisões tomadas unicamente com base em tratamento automatizado.</li>
          <li><strong>Petição à ANPD:</strong> apresentar petição à Autoridade Nacional de Proteção de Dados.</li>
        </ul>
        <p>
          As solicitações serão respondidas em até <strong>15 dias corridos</strong> a partir do recebimento.
          Para exercer seus direitos:
        </p>
        <ul>
          <li>
            <strong>Formulário:</strong>{" "}
            <Link href="/privacidade/contato" className="text-primary hover:underline">
              /privacidade/contato
            </Link>
          </li>
          <li><strong>E-mail:</strong> privacidade@formatio.app</li>
        </ul>
        <p>
          Poderemos solicitar informações adicionais para verificar sua identidade antes de atender
          à solicitação, garantindo a segurança dos dados.
        </p>

        {/* ── 14. Canal de Privacidade ─────────────────────────────── */}
        <h2>14. Canal de Privacidade e Proteção de Dados</h2>
        <p>
          A Formatio mantém um <strong>Canal de Privacidade e Proteção de Dados</strong> dedicado ao
          atendimento de questões relacionadas ao tratamento de dados pessoais. Não possuímos
          Encarregado (DPO) formalmente designado nesta fase, mas o canal é monitorado por
          responsáveis internos com competência para responder às demandas dos titulares.
        </p>
        <p>Para dúvidas, solicitações ou comunicação de incidentes:</p>
        <ul>
          <li><strong>E-mail:</strong> privacidade@formatio.app</li>
          <li>
            <strong>Formulário:</strong>{" "}
            <Link href="/privacidade/contato" className="text-primary hover:underline">
              /privacidade/contato
            </Link>
          </li>
        </ul>
        <p>
          Eventuais comunicações com a{" "}
          <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong> serão realizadas por
          meio deste mesmo canal.
        </p>

        {/* ── 15. Alterações nesta Política ────────────────────────── */}
        <h2>15. Alterações nesta Política</h2>
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
        <p>Versão atual: <strong>{PRIVACY_VERSION}</strong> · Data: <strong>{PRIVACY_DATE}</strong></p>

        <hr />

        <p className="text-sm text-muted-foreground">
          Esta Política está em conformidade com a Lei nº 13.709/2018 (LGPD) e demais regulamentações
          da ANPD. Versão {PRIVACY_VERSION} — Última atualização: {PRIVACY_DATE}.
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
