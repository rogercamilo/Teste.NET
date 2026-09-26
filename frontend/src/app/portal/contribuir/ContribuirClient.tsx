"use client";

import { useState } from "react";

type EntryType = "tithe" | "offering";
type Method = "pix" | "boleto";

type Checkout = {
  recorrente?: boolean;
  status?: string;
  qrCode?: string;
  qrCodeUrl?: string;
  boletoLine?: string;
  boletoUrl?: string;
};

export default function ContribuirClient({
  consentido: consentidoInicial,
  versaoConsentimento,
}: {
  consentido: boolean;
  versaoConsentimento: string;
}) {
  const [consentido, setConsentido] = useState(consentidoInicial);
  const [tipo, setTipo] = useState<EntryType>("tithe");
  const [valor, setValor] = useState("");
  const [recorrente, setRecorrente] = useState(true);
  const [dia, setDia] = useState("5");
  const [metodo, setMetodo] = useState<Method>("pix");
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const ehRecorrente = tipo === "tithe" && recorrente;

  async function aceitarConsentimento() {
    setErro(null);
    setCarregando(true);
    try {
      const res = await fetch("/api/portal/contribuir/consentimento", { method: "POST" });
      if (!res.ok) throw new Error("Não foi possível registrar o consentimento.");
      setConsentido(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro.");
    } finally {
      setCarregando(false);
    }
  }

  async function contribuir(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const amount = Number(valor.replace(",", "."));
    if (!(amount > 0)) {
      setErro("Informe um valor válido.");
      return;
    }
    setCarregando(true);
    try {
      const res = await fetch("/api/portal/contribuir", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entryType: tipo,
          amount,
          recorrente: ehRecorrente,
          dayOfMonth: ehRecorrente ? Number(dia) : undefined,
          method: metodo,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Falha ao contribuir.");
      setCheckout(data as Checkout);
      setValor("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="mb-1 text-2xl font-semibold">Contribuir</h1>
      <p className="mb-4 text-sm text-gray-500">Dízimo e oferta da sua comunidade.</p>

      {erro && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{erro}</p>}

      {!consentido ? (
        <div className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">Autorização</h2>
          <p className="mb-3 text-sm text-gray-600">
            Para dizimar ou ofertar pelo portal, precisamos vincular a sua identidade de membro à sua
            contribuição. Compartilhamos apenas o mínimo (um identificador, seu nome e e-mail) — nada da sua
            formação. É voluntário e você pode revogar quando quiser.
          </p>
          <label className="flex items-start gap-2 text-sm">
            <span>
              Autorizo o vínculo da minha identidade de membro para dízimo/oferta.
              <span className="block text-xs text-gray-400">Versão {versaoConsentimento}</span>
            </span>
          </label>
          <button
            onClick={aceitarConsentimento}
            disabled={carregando}
            className="mt-3 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {carregando ? "Registrando…" : "Autorizar e continuar"}
          </button>
        </div>
      ) : checkout ? (
        <div className="rounded-lg border p-4">
          {checkout.recorrente ? (
            <p className="text-sm text-green-700">
              Dízimo mensal assinado! A cobrança de cada ciclo será gerada automaticamente.
            </p>
          ) : checkout.boletoLine ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Boleto gerado</p>
              <textarea readOnly value={checkout.boletoLine} rows={2} className="w-full rounded border p-2 text-xs" />
              {checkout.boletoUrl && (
                <a href={checkout.boletoUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">
                  Abrir PDF do boleto
                </a>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm font-medium">Pague com PIX</p>
              {checkout.qrCodeUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={checkout.qrCodeUrl} alt="QR PIX" className="h-48 w-48 rounded border bg-white p-2" />
              )}
              {checkout.qrCode && (
                <textarea readOnly value={checkout.qrCode} rows={3} className="w-full rounded border p-2 text-xs" />
              )}
            </div>
          )}
          <button onClick={() => setCheckout(null)} className="mt-3 text-sm text-blue-600 underline">
            Nova contribuição
          </button>
        </div>
      ) : (
        <form onSubmit={contribuir} className="space-y-3 rounded-lg border p-4">
          <div className="flex gap-3">
            <label className="flex-1 text-sm">
              Tipo
              <select
                value={tipo}
                onChange={(e) => {
                  const t = e.target.value as EntryType;
                  setTipo(t);
                  if (t === "offering") setRecorrente(false);
                }}
                className="mt-1 w-full rounded border p-2"
              >
                <option value="tithe">Dízimo</option>
                <option value="offering">Oferta</option>
              </select>
            </label>
            <label className="flex-1 text-sm">
              Valor (R$)
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
                className="mt-1 w-full rounded border p-2"
              />
            </label>
          </div>

          {tipo === "tithe" && (
            <div className="flex gap-3">
              <label className="flex-1 text-sm">
                Frequência
                <select
                  value={recorrente ? "monthly" : "once"}
                  onChange={(e) => setRecorrente(e.target.value === "monthly")}
                  className="mt-1 w-full rounded border p-2"
                >
                  <option value="monthly">Mensal (recorrente)</option>
                  <option value="once">Pontual (uma vez)</option>
                </select>
              </label>
              {ehRecorrente && (
                <label className="w-24 text-sm">
                  Dia
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dia}
                    onChange={(e) => setDia(e.target.value)}
                    className="mt-1 w-full rounded border p-2"
                  />
                </label>
              )}
            </div>
          )}

          <label className="block text-sm">
            Forma de pagamento
            <select value={metodo} onChange={(e) => setMetodo(e.target.value as Method)} className="mt-1 w-full rounded border p-2">
              <option value="pix">PIX</option>
              <option value="boleto">Boleto</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {carregando ? "Enviando…" : ehRecorrente ? "Assinar dízimo mensal" : "Contribuir"}
          </button>
        </form>
      )}
    </div>
  );
}
