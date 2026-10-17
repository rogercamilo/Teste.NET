"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

// Palco 16:9. Cada cena é absoluta e aparece/some na sua janela de tempo
// (opacidade keyframe) — tudo orquestrado a partir do mount (t=0), o que torna
// a gravação determinística.
function Scene({
  start,
  dur,
  children,
}: {
  start: number;
  dur: number;
  children: ReactNode;
}) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center text-center px-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: dur, delay: start, times: [0, 0.1, 0.86, 1], ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

function Rise({
  start,
  children,
  className,
}: {
  start: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: start, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function Frame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="w-[760px] max-w-[72vw] rounded-xl overflow-hidden border border-white/10 bg-slate-950/70 shadow-2xl shadow-black/50">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/10 bg-slate-900/80">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-2 text-[10px] text-slate-500">app.formattio.com.br</span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} width={1200} height={741} className="w-full h-auto block" />
    </div>
  );
}

// Legenda de montagem (imagem + frase).
function Prova({ start, dur, src, alt, legenda }: { start: number; dur: number; src: string; alt: string; legenda: ReactNode }) {
  return (
    <Scene start={start} dur={dur}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, delay: start, ease: EASE }}
      >
        <Frame src={src} alt={alt} />
      </motion.div>
      <Rise start={start + 0.25} className="mt-7">
        <p className="text-2xl sm:text-3xl font-semibold text-white">{legenda}</p>
      </Rise>
    </Scene>
  );
}

export function ReelClient() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 font-sans antialiased">
      {/* Atmosfera de marca */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]" />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[760px] h-[760px] rounded-full bg-primary/15 blur-[140px] pointer-events-none"
        initial={{ opacity: 0.5, scale: 0.9 }}
        animate={{ opacity: [0.5, 0.8, 0.6, 0.8], scale: [0.9, 1.05, 1, 1.08] }}
        transition={{ duration: 15, ease: "easeInOut" }}
      />

      {/* 0–3s · Gancho (dor) */}
      <Scene start={0} dur={3}>
        <Rise start={0.15}>
          <p className="text-3xl sm:text-5xl font-bold text-white leading-tight">
            Conduzir uma comunidade é{" "}
            <span className="text-primary">cuidar de pessoas</span>.
          </p>
        </Rise>
        <Rise start={1.1} className="mt-5">
          <p className="text-xl sm:text-2xl text-slate-400">
            Não de cadernos, planilhas e grupos espalhados.
          </p>
        </Rise>
      </Scene>

      {/* 3–6s · Promessa */}
      <Scene start={3} dur={3}>
        <Rise start={3.15}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/formatio-horizontal-on-dark.svg" alt="Formattio" className="h-12 sm:h-14 w-auto mx-auto mb-7" />
        </Rise>
        <Rise start={3.5}>
          <p className="text-3xl sm:text-5xl font-bold text-white leading-tight max-w-3xl">
            A jornada formativa <span className="text-primary">inteira</span>, em um só lugar.
          </p>
        </Rise>
      </Scene>

      {/* 6–11s · Prova (telas reais) */}
      <Prova
        start={6}
        dur={1.8}
        src="/jornada/dashboard.webp"
        alt="Painel da Formattio"
        legenda={<>Comece o dia sabendo o que importa.</>}
      />
      <Prova
        start={7.8}
        dur={1.7}
        src="/jornada/ficha.webp"
        alt="Ficha do formando"
        legenda={<>Acompanhe a história de cada pessoa.</>}
      />
      <Prova
        start={9.5}
        dur={1.6}
        src="/jornada/formandos.webp"
        alt="Lista de formandos com situação"
        legenda={
          <>
            Perceba quem precisa de você — <span className="text-primary">a tempo</span>.
          </>
        }
      />

      {/* 11–13.8s · Ganho */}
      <Scene start={11} dur={2.8}>
        <Rise start={11.15}>
          <p className="text-3xl sm:text-5xl font-bold text-white leading-tight">
            Mais tempo com <span className="text-primary">as pessoas</span>.
          </p>
        </Rise>
        <Rise start={11.7} className="mt-4">
          <p className="text-2xl sm:text-3xl text-slate-400">Menos com a papelada.</p>
        </Rise>
      </Scene>

      {/* 13.8–15s · CTA */}
      <Scene start={13.8} dur={1.2}>
        <Rise start={13.9}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/formatio-horizontal-on-dark.svg" alt="Formattio" className="h-11 sm:h-12 w-auto mx-auto mb-5" />
        </Rise>
        <Rise start={14.1}>
          <p className="text-2xl sm:text-3xl font-semibold text-white">
            Comece sua jornada
          </p>
          <p className="mt-2 text-lg text-primary font-medium">formattio.com.br</p>
        </Rise>
      </Scene>

      {/* Linha de progresso (0 → 100% em 15s) */}
      <motion.div
        className="absolute bottom-0 left-0 h-1 bg-primary origin-left"
        style={{ width: "100%" }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 15, ease: "linear" }}
      />
    </div>
  );
}
