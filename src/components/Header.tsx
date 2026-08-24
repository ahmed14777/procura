'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  role?: 'client' | 'lawyer'
  clientPaid?: boolean
  onOpenReservedAccess?: () => void
  onLogoutSuccess?: () => void
}

export function Header({
  role = 'client',
  clientPaid = false,
  onOpenReservedAccess,
  onLogoutSuccess,
}: HeaderProps) {
  const router = useRouter()
  const isLawyer = role === 'lawyer'

  const logout = async () => {
    await fetch('/api/staff-logout', { method: 'POST' })
    if (onLogoutSuccess) {
      onLogoutSuccess()
      return
    }
    router.push('/')
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`sticky top-0 z-40 backdrop-blur-xl ${
        isLawyer
          ? 'border-b border-slate-700/70 bg-slate-950/90'
          : 'border-b border-slate-700/70 bg-slate-950/90'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-[4.5rem] sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex shrink-0 items-center justify-center rounded-xl border font-serif font-semibold tracking-[0.03em] ${
              isLawyer
                ? 'h-9 w-9 border-amber-400/30 bg-amber-400/10 text-sm text-amber-300'
                : 'h-9 w-9 border-amber-400/30 bg-amber-400/10 text-sm text-amber-300'
            }`}
          >
            E2D
          </div>
          <div className="min-w-0">
            <p
              className={`truncate text-base font-semibold tracking-tight ${
                isLawyer ? 'text-white' : 'text-white'
              }`}
            >
              {isLawyer ? 'Easy2Do - Area Operativa' : 'Easy2Do - Servizio Clienti'}
            </p>
            <p
              className={`hidden truncate text-[11px] sm:block ${
                isLawyer ? 'text-slate-500' : 'text-slate-500'
              }`}
            >
              {isLawyer ? 'Modalita riservata attiva' : 'Richiesta aggiornamenti pratica'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLawyer ? (
            <>
              <div className="hidden items-center gap-2 text-xs text-slate-400 md:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Area riservata attiva
              </div>
              <button
                type="button"
                onClick={logout}
                className="shrink-0 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:bg-white/5 hover:text-white"
              >
                Esci
              </button>
            </>
          ) : (
            onOpenReservedAccess &&
            !clientPaid && (
              <button
                type="button"
                onClick={onOpenReservedAccess}
                className="shrink-0 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:bg-white/5 hover:text-white"
              >
                Accesso riservato
              </button>
            )
          )}
        </div>
      </div>
    </motion.header>
  )
}
