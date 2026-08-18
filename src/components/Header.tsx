'use client';

import { motion } from 'framer-motion';

export function Header() {
  const logout = async () => {
    await fetch('/api/staff-logout', { method: 'POST' });
    window.location.assign('/login');
  };

  return (
    <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="sticky top-0 z-40 border-b border-slate-700/70 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/10 font-serif text-sm font-semibold text-amber-300">E2D</div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight text-white">Easy Procura</p>
            <p className="hidden truncate text-[11px] text-slate-500 sm:block">Avv. Francesca Guicciardini</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 text-xs text-slate-400 md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Area operativa protetta
        </div>
        <button type="button" onClick={logout} className="shrink-0 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:bg-white/5 hover:text-white">Esci</button>
      </div>
    </motion.header>
  );
}
