import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Mail } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { FaqAccordion } from "./FaqAccordion";
import type { FaqCategory } from "./FaqAccordion";

export const metadata: Metadata = {
  title: "Perguntas Frequentes — Formattio",
  description:
    "Tire suas dúvidas sobre o Formattio: funcionalidades, Jornada Vocacional, segurança, LGPD, planos e preços.",
  openGraph: {
    title: "Perguntas Frequentes — Formattio",
    description:
      "Respostas sobre plataforma, segurança, planos, cobrança e suporte do Formattio.",
    type: "website",
    locale: "pt_BR",
  },
};

const categories: FaqCategory[] = [
  {
    id: "plataforma",
    label: "Plataforma e funcionalidades",
    color: "bg-primary",
    items: [
      {
        q: "Quais tipos de comunidade o Formattio atende?",
        a: "O Formattio atende quatro perfis: Novas Comunidades (processo vocacional canônico), Institutos Religiosos (rigor canônico em escala), Grupos de Oração (encontros livres sem etapas formais) e Centros Formativos (cursos e turmas abertas). Cada tipo tem configuração padrão adequada ao seu modelo, e você pode ajustar conforme a realidade da sua instituição.",
      },
      {
        q: "O que é um 'Grupo de Formação' no Formattio?",
        a: "Um Grupo de Formação é um conjunto de pessoas que percorrerão um caminho formativo juntas. Cada grupo tem seus próprios formandos, formador responsável, plano formativo e grade de conteúdos. Grupos podem ser estruturados (com etapas e progressão canônica) ou livres (para encontros, cursos ou aprofundamentos sem etapas fixas).",
      },
      {
        q: "O que são as 3 perspectivas formativas (H/E/C)?",
        a: "São as três dimensões de avaliação de cada formando: Humana (maturidade afetiva, autoconhecimento, crescimento integral), Espiritual (vida de oração, intimidade com Deus, fidelidade sacramental) e Comunitária (vivência fraterna, comunhão, apostolado). O Formattio permite registrar e acompanhar a evolução em cada dimensão ao longo das etapas, alimentando os relatórios de encerramento.",
      },
      {
        q: "O que é a Jornada Vocacional no Formattio?",
        a: "É o módulo de acompanhamento processual canônico, disponível para Novas Comunidades e Institutos Religiosos. Ele gerencia o fluxo de aprovação de cada etapa do percurso vocacional e gera automaticamente 8 tipos de documentos PDF exigidos pelo direito canônico — pedidos de ingresso, avaliações de etapa, cartas de apresentação, declarações e relatórios — com base nos dados já cadastrados no sistema.",
      },
      {
        q: "Posso importar dados de planilhas ou outro sistema?",
        a: "Sim. O Formattio oferece importação via arquivo estruturado e exportação completa dos dados da sua organização em JSON a qualquer momento. Você nunca fica preso na plataforma. Para migrações de grande porte, nossa equipe pode auxiliar no processo de onboarding.",
      },
    ],
  },
  {
    id: "seguranca",
    label: "Segurança e privacidade",
    color: "bg-teal-500",
    items: [
      {
        q: "Meus dados estão seguros?",
        a: "Sim. Todos os dados são criptografados em trânsito (HTTPS/TLS) e em repouso. Campos sensíveis têm criptografia adicional em nível de campo (AES-256). A plataforma é hospedada em infraestrutura redundante no Brasil. Todos os acessos são registrados em logs de auditoria com IP anonimizado.",
      },
      {
        q: "O que é a LGPD e por que isso importa para minha comunidade?",
        a: "A LGPD (Lei Geral de Proteção de Dados — Lei nº 13.709/2018) regula o uso de dados pessoais no Brasil. Comunidades que cadastram membros — com nome, endereço, documentos e histórico pessoal — estão sujeitas à LGPD. O Formattio foi construído desde o início com conformidade em mente: logs de auditoria completos, exportação de dados, direito ao esquecimento e política de privacidade inclusa.",
      },
      {
        q: "Posso exportar ou excluir meus dados a qualquer momento?",
        a: "Sim. O Formattio oferece exportação completa de todos os dados da sua organização em formato JSON. Você também pode solicitar a exclusão permanente dos dados (direito ao esquecimento, previsto na LGPD) a qualquer momento pelo painel de configurações ou pelo canal de privacidade.",
      },
    ],
  },
  {
    id: "planos",
    label: "Planos e cobrança",
    color: "bg-amber-500",
    items: [
      {
        q: "Como funciona o período de experiência?",
        a: "Ao criar sua conta, você tem 30 dias de acesso completo à plataforma — é o seu período de experiência, sem cartão de crédito. Ao final do período, escolha o plano que melhor se adapta ao tamanho da sua comunidade em Configurações → Plano. Se não assinar, os dados ficam disponíveis por 30 dias adicionais para exportação antes de serem excluídos.",
      },
      {
        q: "Posso cancelar a qualquer momento?",
        a: "Sim. Você pode cancelar sua assinatura a qualquer momento pelo painel de configurações, sem burocracia. Ao cancelar, você ainda tem acesso à plataforma até o fim do período já pago. Seus dados ficam disponíveis por 30 dias após o cancelamento para exportação.",
      },
      {
        q: "Aceita boleto ou PIX?",
        a: "Os planos Básico, Intermediário e Avançado são pagos via cartão de crédito (Stripe). Para o plano Personalizado — destinado a organizações maiores (acima de 350 membros) — oferecemos pagamento por boleto bancário ou PIX. Entre em contato pelo e-mail contato@formattio.com.br para mais informações.",
      },
      {
        q: "Como funciona o upgrade de plano?",
        a: "Você pode fazer upgrade do seu plano a qualquer momento em Configurações → Plano. O novo plano entra em vigor imediatamente. O crédito proporcional do plano anterior é abatido na próxima cobrança. Não há taxa de migração entre planos.",
      },
      {
        q: "Como funciona o desconto no plano anual?",
        a: "O plano anual oferece desconto de 17% (equivalente a 2 meses grátis) em relação ao mensal. A cobrança é feita em parcela única anual. Você pode cancelar a qualquer momento, mas o valor anual não é reembolsado proporcionalmente — apenas o próximo ciclo não é cobrado.",
      },
    ],
  },
  {
    id: "suporte",
    label: "Suporte",
    color: "bg-blue-500",
    items: [
      {
        q: "Há suporte em português?",
        a: "Sim. Toda a plataforma, documentação e suporte são em português do Brasil. Nosso time responde por e-mail em até 24 horas nos dias úteis. Planos Intermediário e Avançado têm suporte prioritário. O plano Personalizado inclui suporte dedicado e onboarding guiado pelo time Formattio.",
      },
      {
        q: "Como entrar em contato com o time Formattio?",
        a: "Para suporte geral: contato@formattio.com.br. Para questões de privacidade e LGPD: privacidade@formattio.com.br. Para planos personalizados e grandes organizações: use o formulário de simulação na página de preços ou envie um e-mail com o assunto 'Plano Personalizado'.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="font-sans antialiased bg-slate-950 min-h-screen">
      <MarketingNav />

      {/* Hero */}
      <section className="relative bg-slate-950 pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-6">
            FAQ
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight mb-5">
            Perguntas frequentes
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            Encontre respostas rápidas sobre a plataforma, segurança, planos e suporte.
            Não encontrou o que precisava?{" "}
            <a
              href="mailto:contato@formattio.com.br"
              className="text-primary hover:underline"
            >
              Entre em contato.
            </a>
          </p>
        </div>
      </section>

      {/* FAQ accordion */}
      <section className="bg-slate-950 pb-24">
        <div className="max-w-3xl mx-auto px-4">
          <FaqAccordion categories={categories} />
        </div>
      </section>

      {/* CTA "Ainda tem dúvidas?" */}
      <section className="bg-slate-900 border-t border-white/5 py-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="rounded-2xl border border-white/10 bg-slate-800/30 p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Ainda tem dúvidas?</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto text-sm leading-relaxed">
              Nosso time responde em até 24 horas nos dias úteis, em português.
              Para demonstrações ou planos personalizados, fale com a gente.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="mailto:contato@formattio.com.br"
                className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-slate-300 hover:border-white/40 hover:text-white rounded-xl transition-colors text-sm"
              >
                <Mail className="h-4 w-4" />
                contato@formattio.com.br
              </a>
              <Link
                href="/registro"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm"
              >
                Criar conta gratuitamente
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
