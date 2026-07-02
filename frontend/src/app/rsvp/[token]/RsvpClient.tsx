"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarCheck, CalendarX, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { RsvpResposta } from "@/lib/rsvp";

interface Props {
  token: string;
  formandoNome: string;
  orgNome: string;
  agendamentoId: string | null;
  agendamentoTema: string | null;
  agendamentoData: string | null;
  respInicial: RsvpResposta | null;
}

type State = "idle" | "loading" | "sim" | "nao" | "error";

export default function RsvpClient({
  token,
  formandoNome,
  orgNome,
  agendamentoId,
  agendamentoTema,
  agendamentoData,
  respInicial,
}: Props) {
  const [state, setState] = useState<State>("idle");
  const [motivo, setMotivo] = useState("");
  const [motivoEnviado, setMotivoEnviado] = useState(false);

  const enviar = useCallback(
    async (resposta: RsvpResposta, justificativa?: string) => {
      if (!agendamentoId) {
        setState("error");
        return;
      }
      setState("loading");
      try {
        const res = await fetch(`/api/rsvp/${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agendamentoId, resposta, justificativa }),
        });
        if (!res.ok) {
          setState("error");
          return;
        }
        setState(resposta);
        if (justificativa) setMotivoEnviado(true);
      } catch {
        setState("error");
      }
    },
    [agendamentoId, token]
  );

  // Ação em 1 clique: dispara a resposta da query no carregamento (client-side,
  // imune a prefetch de scanners de e-mail que não executam JS).
  useEffect(() => {
    if (respInicial && agendamentoId) void enviar(respInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = formandoNome.split(" ")[0];
  const dataFmt = agendamentoData
    ? format(parseISO(agendamentoData), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })
    : null;

  const clay = "#b25433";

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div
          className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border mb-6"
          style={{ background: `${clay}1a`, borderColor: `${clay}33` }}
        >
          <CalendarCheck className="h-7 w-7" style={{ color: clay }} />
        </div>

        <p className="text-sm font-medium uppercase tracking-widest mb-3" style={{ color: clay }}>
          {orgNome}
        </p>
        <h1 className="text-2xl font-bold text-white mb-2">Olá, {firstName}!</h1>

        {agendamentoTema ? (
          <p className="text-slate-300 text-sm mb-1">
            <span className="font-medium text-white">{agendamentoTema}</span>
          </p>
        ) : (
          <p className="text-slate-400 text-sm mb-6">Confirme sua presença no encontro.</p>
        )}
        {dataFmt && <p className="text-slate-500 text-xs mb-8 capitalize">{dataFmt}</p>}

        {!agendamentoId ? (
          <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-slate-800 border border-white/10 text-slate-400 text-sm">
            <XCircle className="h-5 w-5 shrink-0" />
            Encontro não encontrado.
          </div>
        ) : state === "loading" ? (
          <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-slate-800 border border-white/10 text-slate-300 text-sm">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> Registrando…
          </div>
        ) : state === "error" ? (
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <XCircle className="h-5 w-5 shrink-0" /> Ocorreu um erro. Tente novamente.
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {state === "sim" && (
              <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">Presença confirmada!</span>
              </div>
            )}
            {state === "nao" && (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-slate-800 border border-white/10 text-slate-300">
                  <CalendarX className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">Ausência registrada.</span>
                </div>
                {!motivoEnviado ? (
                  <div className="text-left">
                    <label className="block text-xs text-slate-400 mb-1.5">Quer avisar o motivo? (opcional)</label>
                    <textarea
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="Ex.: estarei viajando…"
                      className="w-full rounded-xl bg-slate-900 border border-white/10 text-slate-200 text-sm p-3 outline-none focus:border-white/20"
                    />
                    <button
                      onClick={() => enviar("nao", motivo.trim())}
                      disabled={motivo.trim().length < 3}
                      className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
                      style={{ background: clay }}
                    >
                      Enviar motivo
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-emerald-400">Motivo enviado ao formador. Obrigado!</p>
                )}
              </div>
            )}

            {/* Alternar a resposta */}
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => enviar("sim")}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  state === "sim" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <CalendarCheck className="h-4 w-4" /> Vou participar
              </button>
              <button
                onClick={() => { setMotivoEnviado(false); void enviar("nao"); }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  state === "nao" ? "bg-slate-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <CalendarX className="h-4 w-4" /> Não vou
              </button>
            </div>
          </div>
        )}

        <p className="mt-8 text-xs text-slate-600">
          Você pode alterar sua resposta a qualquer momento por este link.
        </p>
      </div>
    </div>
  );
}
