"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Users,
  Compass,
  Calendar,
  Sparkles,
  MessageSquare,
  Check,
  Loader2,
  ArrowRight,
  AlertCircle,
  type LucideIcon,
} from "lucide-react";
import {
  TIPO_ORGANIZACAO_OPCOES,
  NUMERO_MEMBROS_OPCOES,
  INTENCAO_OPCOES,
  PAPEL_OPCOES,
} from "@/lib/acesso-antecipado-opcoes";
import { trackMetaEvent } from "@/lib/analytics-config";

// Ícone por intenção — reforça a leitura (cor nunca sozinha: ícone + palavra).
const INTENCAO_ICONE: Record<string, LucideIcon> = {
  demonstracao: Calendar,
  acesso_antecipado: Sparkles,
  duvida: MessageSquare,
};

type Opcao = { value: string; label: string };

function GrupoEscolha({
  legenda,
  icone: Icone,
  nome,
  opcoes,
  valor,
  onChange,
  icones,
}: {
  legenda: string;
  icone: LucideIcon;
  nome: string;
  opcoes: readonly Opcao[];
  valor: string;
  onChange: (v: string) => void;
  icones?: Record<string, LucideIcon>;
}) {
  return (
    <fieldset>
      <legend className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
        <Icone className="h-4 w-4 text-primary" />
        {legenda} <span className="text-primary">*</span>
      </legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {opcoes.map((o) => {
          const selecionado = valor === o.value;
          const OpIcone = icones?.[o.value];
          return (
            <label
              key={o.value}
              className={`group relative flex items-center gap-3 rounded-xl border px-4 py-3.5 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-slate-950 ${
                selecionado
                  ? "border-primary bg-primary/10"
                  : "border-white/10 bg-slate-900/60 hover:border-white/25"
              }`}
            >
              <input
                type="radio"
                name={nome}
                value={o.value}
                checked={selecionado}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              <span
                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  selecionado ? "border-primary bg-primary text-white" : "border-white/30"
                }`}
                aria-hidden="true"
              >
                {selecionado && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              {OpIcone && (
                <OpIcone
                  className={`h-4 w-4 shrink-0 ${selecionado ? "text-primary" : "text-slate-400"}`}
                  aria-hidden="true"
                />
              )}
              <span
                className={`text-sm leading-snug ${selecionado ? "text-white font-medium" : "text-slate-300"}`}
              >
                {o.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

const CAMPO =
  "w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3.5 text-base text-white placeholder:text-slate-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

export function AcessoAntecipadoForm({
  intencaoInicial,
  planoInteresse,
}: {
  intencaoInicial: string;
  planoInteresse: string;
}) {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [comunidade, setComunidade] = useState("");
  const [tipoOrganizacao, setTipoOrganizacao] = useState("");
  const [numeroMembros, setNumeroMembros] = useState("");
  const [intencao, setIntencao] = useState(intencaoInicial);
  const [papel, setPapel] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [desafio, setDesafio] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!tipoOrganizacao) return setErro("Escolha o tipo de organização.");
    if (!numeroMembros) return setErro("Informe o número aproximado de membros em formação.");
    if (!intencao) return setErro("Conte o que você gostaria de fazer agora.");
    if (!consent) return setErro("É preciso aceitar a Política de Privacidade para continuar.");

    setLoading(true);
    try {
      const res = await fetch("/api/acesso-antecipado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          comunidade,
          tipoOrganizacao,
          numeroMembros,
          intencao,
          papel,
          whatsapp,
          email,
          desafio,
          planoInteresse,
          consent: true,
          website,
        }),
      });

      if (res.status === 429) {
        setErro("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setErro(data?.error ?? "Não foi possível enviar. Verifique os dados e tente novamente.");
        return;
      }

      // Conversão para a aquisição paga (Meta) — no-op sem pixel/consentimento.
      trackMetaEvent("Lead", { content_name: "acesso-antecipado", intencao });

      router.push(`/acesso-antecipado/obrigado?intencao=${encodeURIComponent(intencao)}`);
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-sm p-6 sm:p-8 shadow-2xl shadow-black/30 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 [animation-delay:200ms] space-y-8"
    >
      {/* Honeypot — invisível para humanos */}
      <div className="absolute w-0 h-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="aa-website">Não preencha este campo</label>
        <input
          id="aa-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {planoInteresse && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="text-slate-200">
            Interesse no plano <strong className="text-white">{planoInteresse}</strong> — a
            equipe ajuda a confirmar o mais adequado à sua realidade.
          </span>
        </div>
      )}

      {/* Seus dados */}
      <div className="space-y-4">
        <div>
          <label htmlFor="aa-nome" className="block text-sm font-semibold text-white mb-2">
            Seu nome <span className="text-primary">*</span>
          </label>
          <input
            id="aa-nome"
            type="text"
            required
            autoComplete="name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Como podemos te chamar?"
            className={CAMPO}
          />
        </div>
        <div>
          <label htmlFor="aa-comunidade" className="block text-sm font-semibold text-white mb-2">
            Comunidade ou Instituto <span className="text-primary">*</span>
          </label>
          <input
            id="aa-comunidade"
            type="text"
            required
            value={comunidade}
            onChange={(e) => setComunidade(e.target.value)}
            placeholder="Nome da sua comunidade ou instituto"
            className={CAMPO}
          />
        </div>
        <div>
          <label htmlFor="aa-papel" className="block text-sm font-semibold text-white mb-2">
            Sua função <span className="text-slate-500 font-normal">(opcional)</span>
          </label>
          <select
            id="aa-papel"
            value={papel}
            onChange={(e) => setPapel(e.target.value)}
            className={`${CAMPO} appearance-none`}
          >
            <option value="">Selecione…</option>
            {PAPEL_OPCOES.map((p) => (
              <option key={p} value={p} className="bg-slate-900">
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sobre a organização */}
      <GrupoEscolha
        legenda="Tipo de organização"
        icone={Building2}
        nome="tipoOrganizacao"
        opcoes={TIPO_ORGANIZACAO_OPCOES}
        valor={tipoOrganizacao}
        onChange={setTipoOrganizacao}
      />

      <GrupoEscolha
        legenda="Número aproximado de membros em formação"
        icone={Users}
        nome="numeroMembros"
        opcoes={NUMERO_MEMBROS_OPCOES}
        valor={numeroMembros}
        onChange={setNumeroMembros}
      />

      {/* Intenção */}
      <GrupoEscolha
        legenda="O que você gostaria de fazer agora?"
        icone={Compass}
        nome="intencao"
        opcoes={INTENCAO_OPCOES}
        valor={intencao}
        onChange={setIntencao}
        icones={INTENCAO_ICONE}
      />

      {/* Contato */}
      <div className="space-y-4">
        <div>
          <label htmlFor="aa-whatsapp" className="block text-sm font-semibold text-white mb-2">
            WhatsApp <span className="text-primary">*</span>
          </label>
          <input
            id="aa-whatsapp"
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="(00) 90000-0000"
            className={CAMPO}
          />
        </div>
        <div>
          <label htmlFor="aa-email" className="block text-sm font-semibold text-white mb-2">
            E-mail de acesso <span className="text-primary">*</span>
          </label>
          <input
            id="aa-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@comunidade.org"
            className={CAMPO}
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Usamos este e-mail para liberar o seu acesso quando chegar a hora.
          </p>
        </div>
        <div>
          <label htmlFor="aa-desafio" className="block text-sm font-semibold text-white mb-2">
            Qual é o seu maior desafio hoje na formação?{" "}
            <span className="text-slate-500 font-normal">(opcional)</span>
          </label>
          <textarea
            id="aa-desafio"
            rows={3}
            value={desafio}
            onChange={(e) => setDesafio(e.target.value)}
            placeholder="Conte em poucas palavras — isso ajuda a equipe a preparar a conversa."
            className={`${CAMPO} resize-y`}
          />
        </div>
      </div>

      {/* Consentimento + envio */}
      <div className="space-y-5 border-t border-white/10 pt-6">
        <label className="flex items-start gap-3 text-sm text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-white/20 bg-slate-900 accent-primary"
          />
          <span>
            Autorizo o contato da Formattio por e-mail e WhatsApp e concordo com a{" "}
            <Link href="/privacidade" className="text-primary hover:underline" target="_blank">
              Política de Privacidade
            </Link>
            .
          </span>
        </label>

        {erro && (
          <p
            role="alert"
            aria-live="polite"
            className="flex items-center gap-2 text-sm text-red-400"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Enviando…
            </>
          ) : (
            <>
              Quero participar do acesso antecipado
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
        <p className="text-center text-xs text-slate-500">
          Sem cartão de crédito. A equipe entra em contato com você.
        </p>
      </div>
    </form>
  );
}
