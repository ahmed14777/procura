"use client";

import { FormEvent, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type LoginStage = "idle" | "checking" | "error" | "success";

function FountainPen({ writing }: { writing: boolean }) {
  return (
    <motion.div
      className="pointer-events-none absolute z-30 h-28 w-28 drop-shadow-[0_12px_12px_rgba(17,24,39,0.22)] sm:h-32 sm:w-32"
      initial={{ x: 82, y: -68, rotate: -34, opacity: 0 }}
      animate={writing
        ? { x: [82, -35, 46, -68, 28], y: [-68, -22, -12, 2, 10], rotate: [-34, -28, -31, -27, -30], opacity: 1 }
        : { x: 82, y: -68, rotate: -34, opacity: 1 }}
      transition={writing
        ? { duration: 1.55, ease: "easeInOut", times: [0, 0.25, 0.5, 0.76, 1] }
        : { duration: 0.65, ease: "easeOut" }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 160 160" className="h-full w-full">
        <defs>
          <linearGradient id="penBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0b1320" />
            <stop offset="0.45" stopColor="#334155" />
            <stop offset="0.7" stopColor="#111827" />
            <stop offset="1" stopColor="#030712" />
          </linearGradient>
          <linearGradient id="penGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f5df9b" />
            <stop offset="0.45" stopColor="#b18438" />
            <stop offset="0.72" stopColor="#f3d47e" />
            <stop offset="1" stopColor="#805c22" />
          </linearGradient>
        </defs>
        <g transform="rotate(-42 80 80)">
          <rect x="67" y="16" width="27" height="92" rx="13" fill="url(#penBody)" stroke="#b99652" strokeWidth="1.4" />
          <rect x="68" y="26" width="25" height="7" rx="3" fill="url(#penGold)" />
          <path d="M68 105h25l-5 19-8 18-8-18Z" fill="url(#penGold)" stroke="#73501d" strokeWidth="1" />
          <path d="M80.5 111v28" stroke="#5b3b15" strokeWidth="1.6" />
          <circle cx="80.5" cy="121" r="2.4" fill="#172033" />
          <path d="M91 21c11 8 13 28 5 45" fill="none" stroke="#d1ad60" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </svg>
    </motion.div>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      {open ? (
        <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.8" /></>
      ) : (
        <><path d="M3 3l18 18M10.6 6.2A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a15.8 15.8 0 0 1-3 3.6M6.1 6.1C3.8 7.8 2.5 12 2.5 12s3.5 6 9.5 6c1.4 0 2.7-.3 3.8-.8M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>
      )}
    </svg>
  );
}

export default function StaffLoginPage() {
  const reduceMotion = useReducedMotion();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [stage, setStage] = useState<LoginStage>("idle");
  const [error, setError] = useState<string | null>(null);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buongiorno";
    if (hour < 18) return "Buon pomeriggio";
    return "Buonasera";
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStage("checking");
    setError(null);
    try {
      const response = await fetch("/api/staff-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Accesso non riuscito.");

      setStage("success");
      const next = new URLSearchParams(window.location.search).get("next");
      window.setTimeout(() => {
        window.location.assign(next?.startsWith("/") && !next.startsWith("//") ? next : "/");
      }, reduceMotion ? 250 : 2600);
    } catch (cause) {
      setStage("error");
      setError(cause instanceof Error ? cause.message : "Accesso non riuscito.");
    }
  };

  const successful = stage === "success";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#171b20] px-4 py-8 text-[#172033] sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(214,181,112,0.15),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.025)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.025)_50%,rgba(255,255,255,0.025)_75%,transparent_75%)] bg-[length:auto,48px_48px]" />

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 26, rotateX: 4 }}
        animate={successful && !reduceMotion
          ? { opacity: [1, 1, 0], scale: [1, 1.02, 1.16], y: [0, 0, -16] }
          : { opacity: 1, scale: 1, y: 0, rotateX: 0 }}
        transition={successful && !reduceMotion
          ? { duration: 2.35, times: [0, 0.7, 1], ease: "easeInOut" }
          : { duration: 0.7, ease: "easeOut" }}
        className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[2px] border border-[#d8c8a5] bg-[#f3eddf] shadow-[0_35px_110px_rgba(0,0,0,0.55)]"
        style={{
          backgroundImage: "radial-gradient(rgba(78,57,31,0.06) 0.6px, transparent 0.7px), linear-gradient(100deg, rgba(255,255,255,0.4), transparent 28%, rgba(104,75,35,0.035) 70%, transparent)",
          backgroundSize: "5px 5px, 100% 100%",
        }}
      >
        <div className="pointer-events-none absolute inset-3 border border-[#aa8a4e]/45 sm:inset-5" />
        <div className="pointer-events-none absolute inset-5 border border-[#aa8a4e]/15 sm:inset-7" />

        <div className="relative min-h-[650px] px-7 py-9 sm:min-h-[680px] sm:px-16 sm:py-12">
          <header className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#a17d3d]/50 font-serif text-lg font-semibold tracking-wider text-[#755727] shadow-[inset_0_0_0_4px_rgba(161,125,61,0.08)]">E2D</div>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.38em] text-[#806b47]">Easy2Do × Avv. Francesca Guicciardini</p>
          </header>

          <div className="relative mx-auto mt-9 max-w-xl text-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduceMotion ? 0 : 0.25 }}
              className="relative mx-auto h-24"
            >
              <FountainPen writing={successful} />
              <motion.h1
                initial={reduceMotion ? false : { clipPath: "inset(0 100% 0 0)" }}
                animate={{ clipPath: "inset(0 0% 0 0)" }}
                transition={{ duration: reduceMotion ? 0 : 1.65, delay: 0.55, ease: "easeInOut" }}
                className="pt-7 font-serif text-4xl font-medium italic tracking-wide text-[#17243a] sm:text-5xl"
              >
                {greeting}
              </motion.h1>
              <svg viewBox="0 0 440 24" className="absolute inset-x-0 bottom-0 mx-auto h-7 w-full max-w-md" aria-hidden="true">
                <motion.path
                  d="M18 14C105 9 154 17 224 12c75-6 132 4 199-4"
                  fill="none"
                  stroke="#243a5a"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  initial={{ pathLength: reduceMotion ? 1 : 0, opacity: 0.25 }}
                  animate={{ pathLength: 1, opacity: 0.75 }}
                  transition={{ duration: reduceMotion ? 0 : 1.5, delay: 0.6, ease: "easeInOut" }}
                />
              </svg>
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduceMotion ? 0 : 1.6 }} className="mt-2 font-serif text-lg tracking-wide text-[#625b50]">Area Operativa Riservata</motion.p>
          </div>

          <AnimatePresence mode="wait">
            {!successful ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 12 }}
                animate={stage === "error" && !reduceMotion ? { opacity: 1, x: [0, -5, 4, -2, 0], y: 0 } : { opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ delay: stage === "idle" && !reduceMotion ? 1.7 : 0, duration: 0.45 }}
                className="mx-auto mt-10 max-w-md"
              >
                <form onSubmit={submit} className="space-y-5">
                  <div>
                    <label htmlFor="staff-password" className="block font-serif text-sm font-semibold uppercase tracking-[0.19em] text-[#765d34]">Codice di accesso</label>
                    <div className="relative mt-3">
                      <input
                        id="staff-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          if (stage === "error") setStage("idle");
                        }}
                        autoComplete="current-password"
                        autoFocus
                        required
                        disabled={stage === "checking"}
                        className="w-full border-0 border-b border-[#8f7447]/55 bg-transparent px-1 py-3 pr-12 text-lg tracking-wide text-[#172033] outline-none transition focus:border-[#172f52] focus:ring-0 disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#806b47] transition hover:text-[#172f52]"
                        aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                        aria-pressed={showPassword}
                      >
                        <EyeIcon open={showPassword} />
                      </button>
                      <motion.span
                        className="absolute bottom-0 left-0 h-px bg-[#172f52]"
                        animate={{ width: password ? "100%" : "0%" }}
                        transition={{ duration: 0.35 }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={stage === "checking" || !password}
                    className="w-full border border-[#172f52] bg-[#172f52] px-4 py-3.5 text-xs font-semibold uppercase tracking-[0.22em] text-[#f6f0e3] shadow-[0_8px_24px_rgba(23,47,82,0.16)] transition hover:bg-[#223f66] disabled:cursor-wait disabled:opacity-55"
                  >
                    {stage === "checking" ? "Verifica in corso..." : "Autorizza accesso"}
                  </button>
                </form>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} role="alert" className="mt-5 border border-[#8f3232]/30 bg-[#8f3232]/5 px-4 py-3 text-center">
                      <p className="font-serif text-sm font-semibold uppercase tracking-[0.16em] text-[#8f3232]">Codice non riconosciuto</p>
                      <p className="mt-1 text-xs text-[#795454]">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative mx-auto mt-8 h-52 max-w-lg text-center">
                <FountainPen writing />
                <svg viewBox="0 0 520 150" className="absolute inset-x-0 top-4 mx-auto h-36 w-full" aria-hidden="true">
                  <motion.path
                    d="M44 82c38-46 73-55 86-22 9 22-20 50-34 26-15-27 33-58 55-30 17 22-18 58-34 34-11-16 9-39 29-39 27 0 27 43 6 50 23 8 53-54 75-46 25 9-1 51-21 54-23 4-14-28 11-36 29-11 42 18 45 20 2 1 5 2 8 2"
                    fill="none"
                    stroke="#172f52"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: reduceMotion ? 0 : 1.5, ease: "easeInOut" }}
                  />
                  <motion.path d="M70 112c118-16 251-8 383-19" fill="none" stroke="#b18a42" strokeWidth="1.4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduceMotion ? 0 : 0.8, delay: 1.15 }} />
                </svg>
                <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : 1.3 }} className="pt-32 font-serif text-2xl font-medium italic tracking-wide text-[#172f52]">Accesso autorizzato</motion.p>
                <motion.div initial={{ opacity: 0, scale: 1.6, rotate: -12 }} animate={{ opacity: 0.7, scale: 1, rotate: -7 }} transition={{ delay: reduceMotion ? 0 : 1.45, type: "spring" }} className="absolute right-2 top-20 flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#9d2e2e] text-[9px] font-bold uppercase tracking-[0.12em] text-[#9d2e2e] sm:right-7">
                  <span className="max-w-[58px]">Accesso verificato</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <footer className="absolute inset-x-8 bottom-8 flex items-center justify-center gap-2 text-[9px] font-semibold uppercase tracking-[0.21em] text-[#8c7c61] sm:inset-x-16">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-700" />
            Sistema protetto · Sessione 10 ore
          </footer>
        </div>
      </motion.section>

      <motion.div
        className="pointer-events-none fixed z-50 rounded-full bg-[#172f52]"
        initial={{ width: 8, height: 8, opacity: 0, scale: 0 }}
        animate={successful && !reduceMotion ? { opacity: [0, 0.98, 1], scale: [0, 1, 240] } : { opacity: 0, scale: 0 }}
        transition={{ duration: 1.15, delay: 1.45, ease: [0.7, 0, 0.3, 1] }}
        aria-hidden="true"
      />
    </main>
  );
}
