"use client";

import { useEffect, useState } from "react";

type Config = {
  habilitado: boolean;
  tenantSlug: string;
  organizationId: string;
  baseUrl: string;
  temChave: boolean;
};

export default function FidellisConfigClient() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [serviceKey, setServiceKey] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetch("/api/integracao-fidellis")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Falha ao carregar."))))
      .then((c: Config) => setCfg(c))
      .catch((e) => setErro(e instanceof Error ? e.message : "Erro."));
  }, []);

  function set<K extends keyof Config>(k: K, v: Config[K]) {
    setCfg((c) => (c ? { ...c, [k]: v } : c));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!cfg) return;
    setErro(null);
    setOk(false);
    setSalvando(true);
    try {
      const res = await fetch("/api/integracao-fidellis", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          habilitado: cfg.habilitado,
          tenantSlug: cfg.tenantSlug,
          organizationId: cfg.organizationId,
          baseUrl: cfg.baseUrl,
          serviceKey: serviceKey || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Falha ao salvar.");
      setServiceKey("");
      setCfg((c) => (c ? { ...c, temChave: true } : c));
      setOk(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro.");
    } finally {
      setSalvando(false);
    }
  }

  if (!cfg) {
    return (
      <div className="mx-auto max-w-xl p-4">
        {erro ? <p className="text-sm text-red-600">{erro}</p> : <p className="text-sm text-gray-500">Carregando…</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-4">
      <h1 className="mb-1 text-2xl font-semibold">Integração Fidellis</h1>
      <p className="mb-4 text-sm text-gray-500">
        Habilita o dízimo/oferta do formando pelo portal, integrado ao Fidellis. A chave de serviço é
        gerada no Fidellis e guardada de forma cifrada.
      </p>

      {erro && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{erro}</p>}
      {ok && <p className="mb-3 rounded bg-green-50 p-2 text-sm text-green-700">Configuração salva.</p>}

      <form onSubmit={salvar} className="space-y-3 rounded-lg border p-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cfg.habilitado} onChange={(e) => set("habilitado", e.target.checked)} />
          Integração habilitada
        </label>

        <label className="block text-sm">
          Tenant (slug no Fidellis)
          <input value={cfg.tenantSlug} onChange={(e) => set("tenantSlug", e.target.value)} className="mt-1 w-full rounded border p-2" required />
        </label>

        <label className="block text-sm">
          Organization ID (unidade no Fidellis)
          <input value={cfg.organizationId} onChange={(e) => set("organizationId", e.target.value)} className="mt-1 w-full rounded border p-2" required />
        </label>

        <label className="block text-sm">
          Base URL da API do Fidellis
          <input type="url" value={cfg.baseUrl} onChange={(e) => set("baseUrl", e.target.value)} placeholder="https://…" className="mt-1 w-full rounded border p-2" required />
        </label>

        <label className="block text-sm">
          Chave de serviço {cfg.temChave && <span className="text-xs text-green-600">(configurada)</span>}
          <input
            type="password"
            value={serviceKey}
            onChange={(e) => setServiceKey(e.target.value)}
            placeholder={cfg.temChave ? "•••• (deixe em branco para manter)" : "cole a chave gerada no Fidellis"}
            className="mt-1 w-full rounded border p-2"
          />
        </label>

        <button type="submit" disabled={salvando} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </form>
    </div>
  );
}
