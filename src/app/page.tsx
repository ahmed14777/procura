'use client'

import { useState, useCallback, useRef, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { ProcuraForm } from '@/components/ProcuraForm'
import { ResultsPanel } from '@/components/ResultsPanel'
import { resolvePec, type PecResolutionResult } from '@/lib/pecResolver'
import { generateEmail, type GeneratedEmail } from '@/lib/emailGenerator'
import { downloadAutodichiarazionePdf, downloadProcuraPdf } from '@/lib/pdfGenerator'
import type { ProcuraFormData } from '@/lib/schema'
import { downloadCompletePracticePdf } from '@/lib/completePracticePdf'
import { PUBLIC_AUTH_ERROR_MESSAGE, PUBLIC_ERROR_MESSAGE } from '@/lib/security'
import { CLIENT_CONTRIBUTION } from '@/config/business'
import { HOME_PAGE_COPY } from '@/config/content'

/**
 * Main Page Component - Procura Francesca
 *
 * Default mode: Client form (email + payment)
 * With sidebar button to login as lawyer for full features
 */
export default function Home() {
  const [showLawyerModal, setShowLawyerModal] = useState(false)
  const [isLawyer, setIsLawyer] = useState(false)
  const [modeTransition, setModeTransition] = useState<'idle' | 'toLawyer' | 'toClient'>('idle')
  const [lawyerPassword, setLawyerPassword] = useState('')
  const [lawyerError, setLawyerError] = useState<string | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  // State for results
  const [pecResult, setPecResult] = useState<PecResolutionResult | null>(null)
  const [email, setEmail] = useState<GeneratedEmail | null>(null)
  const [currentFormData, setCurrentFormData] = useState<ProcuraFormData | null>(null)
  const [currentClientSignature, setCurrentClientSignature] = useState<string | null>(null)
  const [currentSourceDocument, setCurrentSourceDocument] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contributionEuro = CLIENT_CONTRIBUTION.euro
  const [clientPhone, setClientPhone] = useState('')
  const checkoutOpeningRef = useRef(false)

  /**
   * Handle "Scarica solo procura PDF" action
   * Only generates and downloads the PDF
   */
  const handlePdfOnly = useCallback(async (data: ProcuraFormData, clientSignature?: string) => {
    setIsLoading(true)
    setError(null)

    // Clear previous results when using PDF only mode
    setPecResult(null)
    setEmail(null)

    try {
      await downloadProcuraPdf(data, undefined, clientSignature)
      setCurrentFormData(data)
      setCurrentClientSignature(clientSignature || null)
      setCurrentSourceDocument(null)
    } catch (err) {
      console.error('PDF generation error:', err)
      setError('Errore durante la generazione del PDF. Riprova.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleAutodichiarazionePdf = useCallback(async (data: ProcuraFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      await downloadAutodichiarazionePdf(data)
      setCurrentFormData(data)
      setCurrentSourceDocument(null)
    } catch (err) {
      console.error('Autodichiarazione PDF generation error:', err)
      setError("Errore durante la generazione dell'autodichiarazione PDF. Riprova.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Handle "Genera tutto" action
   * Generates PDF + resolves PEC + generates email
   */
  const handleGenerateAll = useCallback(
    async (data: ProcuraFormData, clientSignature: string | undefined, sourceDocument: File) => {
      setIsLoading(true)
      setError(null)

      try {
        // 1. Resolve PEC
        const pecResolution = resolvePec(data.sedeSelezionata)

        if (!pecResolution.success) {
          setError(pecResolution.error)
          setPecResult(null)
          setEmail(null)
          return
        }

        setPecResult(pecResolution)

        // 2. Generate email
        const generatedEmail = generateEmail(data, pecResolution.commissione)
        setEmail(generatedEmail)

        // 3. Generate one PDF containing the source document and signed Procura
        await downloadCompletePracticePdf(data, sourceDocument, clientSignature)

        setCurrentFormData(data)
        setCurrentClientSignature(clientSignature || null)
        setCurrentSourceDocument(sourceDocument)
      } catch (err) {
        console.error('Generation error:', err)
        setError('Errore durante la generazione. Riprova.')
      } finally {
        setIsLoading(false)
      }
    },
    []
  )
  /**
   * Handle "Simula PEC" action
   * Only resolves PEC without generating PDF or email
   */
  const handleSimulate = useCallback((sedeId: string) => {
    setError(null)

    const pecResolution = resolvePec(sedeId)

    if (!pecResolution.success) {
      setError(pecResolution.error)
      setPecResult(null)
      setEmail(null)
      return
    }

    // نعرض PEC فقط
    setPecResult(pecResolution)

    // نمسح أي Email سابق
    setEmail(null)
  }, [])

  const handleNewPractice = useCallback(() => {
    setPecResult(null)
    setEmail(null)
    setCurrentFormData(null)
    setCurrentClientSignature(null)
    setCurrentSourceDocument(null)
    setError(null)
    setIsLoading(false)
    setIsDownloading(false)
  }, [])

  const handleReturnToClientMode = useCallback(() => {
    setModeTransition('toClient')
    window.setTimeout(() => {
      setIsLawyer(false)
      setShowLawyerModal(false)
      setLawyerPassword('')
      setLawyerError(null)
      handleNewPractice()
      setModeTransition('idle')
    }, 480)
  }, [handleNewPractice])

  /**
   * Handle manual PDF download from results panel
   */
  const handleDownloadPdf = useCallback(async () => {
    if (!currentFormData) return

    setIsDownloading(true)
    try {
      if (currentSourceDocument) {
        await downloadCompletePracticePdf(
          currentFormData,
          currentSourceDocument,
          currentClientSignature || undefined
        )
      } else {
        await downloadProcuraPdf(currentFormData, undefined, currentClientSignature || undefined)
      }
    } catch (err) {
      console.error('PDF download error:', err)
    } finally {
      setIsDownloading(false)
    }
  }, [currentFormData, currentClientSignature, currentSourceDocument])

  /**
   * Handle lawyer login
   */
  const handleLawyerLogin = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setIsAuthenticating(true)
      setLawyerError(null)

      try {
        const response = await fetch('/api/staff-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: lawyerPassword }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Credenziali non valide')
        }

        // Success - smart transition to reserved area
        setModeTransition('toLawyer')
        setShowLawyerModal(false)
        setLawyerPassword('')
        window.setTimeout(() => {
          setIsLawyer(true)
          setModeTransition('idle')
        }, 540)
      } catch (err) {
        console.error('Authentication error:', err)
        setLawyerError(PUBLIC_AUTH_ERROR_MESSAGE)
      } finally {
        setIsAuthenticating(false)
      }
    },
    [lawyerPassword]
  )

  const startClientPayment = async () => {
    if (checkoutOpeningRef.current) return
    checkoutOpeningRef.current = true
    const phone = clientPhone.trim()
    if (!phone) {
      setError('اكتب رقم الهاتف الأول / Inserisci prima il numero di telefono.')
      checkoutOpeningRef.current = false
      return
    }
    const amountEuro = Number(contributionEuro)
    if (amountEuro !== 1.99) {
      setError('اختار مساهمة من الخيارات المتاحة / Scegli uno dei contributi disponibili.')
      checkoutOpeningRef.current = false
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const pendingRequest = JSON.stringify({
        formData: { telefono: phone },
        documentFileName: 'documento.pdf',
      })
      sessionStorage.setItem('pendingClientRequest', pendingRequest)
      localStorage.setItem('pendingClientRequest', pendingRequest)
      sessionStorage.removeItem('postPaymentFormData')
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'client',
          clientPhone: phone,
          amountCents: Math.round(amountEuro * 100),
        }),
      })
      const result = (await response.json()) as { sessionId?: string; url?: string; error?: string }
      if (!response.ok || !result.sessionId || !result.url) {
        throw new Error(result.error || 'Errore nella creazione della sessione di pagamento')
      }
      sessionStorage.setItem('stripeSessionId', result.sessionId)
      window.location.href = result.url
    } catch (err) {
      console.error('Payment initialization error:', err)
      setError(PUBLIC_ERROR_MESSAGE)
      setIsLoading(false)
      checkoutOpeningRef.current = false
    }
  }

  return (
    <div
      className={`min-h-screen flex flex-col relative overflow-hidden ${
        isLawyer
          ? 'bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_42%,#0b1120_100%)]'
          : 'bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_42%,#0b1120_100%)]'
      }`}
    >
      {/* Header */}
      <Header
        role={isLawyer ? 'lawyer' : 'client'}
        onOpenReservedAccess={!isLawyer ? () => setShowLawyerModal(true) : undefined}
        onLogoutSuccess={isLawyer ? handleReturnToClientMode : undefined}
      />

      {/* Main Content */}
      <main
        className={`flex-1 mx-auto w-full px-3 py-4 sm:px-6 sm:py-7 ${
          isLawyer ? 'max-w-7xl' : 'max-w-5xl'
        }`}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className={`grid gap-5 h-full ${
            isLawyer && (pecResult || email)
              ? 'xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]'
              : 'grid-cols-1'
          }`}
        >
          {/* Left Side - Form */}
          <div className="min-w-0">
            {isLawyer ? (
              <ProcuraForm
                onSubmitPdfOnly={handlePdfOnly}
                onSubmitAutodichiarazione={handleAutodichiarazionePdf}
                onSubmitAll={handleGenerateAll}
                onSimulate={handleSimulate}
                onNewPractice={handleNewPractice}
                isLoading={isLoading || modeTransition !== 'idle'}
                role="lawyer"
              />
            ) : (
              <div className="rounded-2xl border border-slate-700/60 bg-slate-800/65 p-6 shadow-xl backdrop-blur-sm sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-amber-300">
                  {HOME_PAGE_COPY.brand}
                </p>
                <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                  {HOME_PAGE_COPY.titleAr}
                </h1>
                <p className="mt-1 text-base font-medium text-amber-200">
                  {HOME_PAGE_COPY.subtitleIt}
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  {HOME_PAGE_COPY.descriptionAr}
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  {HOME_PAGE_COPY.descriptionIt}
                </p>
                <div className="mt-6 border-y border-slate-700/70 py-3 text-sm text-slate-300">
                  <span className="font-semibold text-amber-200">{HOME_PAGE_COPY.roleHeading}</span>{' '}
                  {HOME_PAGE_COPY.roleBodyAr}
                  <span className="mt-1 block text-slate-400">{HOME_PAGE_COPY.roleBodyIt}</span>
                </div>
                <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-amber-100">
                        {HOME_PAGE_COPY.contributionHeading}
                      </p>
                      <p className="mt-1 text-xs text-slate-300">
                        {HOME_PAGE_COPY.contributionBodyAr}
                        <br />
                        {HOME_PAGE_COPY.contributionBodyIt}
                      </p>
                    </div>
                    <span className="shrink-0 text-base font-semibold text-amber-200">
                      {CLIENT_CONTRIBUTION.euro}€
                    </span>
                  </div>
                </div>
                <label className="mt-6 block text-sm font-medium text-slate-300">
                  {HOME_PAGE_COPY.phoneLabel}
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(event) => setClientPhone(event.target.value)}
                    placeholder={HOME_PAGE_COPY.phonePlaceholder}
                    autoComplete="tel"
                    required
                    className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-3 text-slate-100 outline-none transition focus:border-amber-400"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void startClientPayment()}
                  disabled={isLoading}
                  className="mt-6 w-full rounded-lg bg-amber-500 px-4 py-3.5 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60"
                >
                  {isLoading ? HOME_PAGE_COPY.ctaLoading : HOME_PAGE_COPY.ctaIdle}
                </button>
                <p className="mt-3 text-center text-xs text-slate-400">
                  {HOME_PAGE_COPY.bottomNoteAr}
                  <br />
                  {HOME_PAGE_COPY.bottomNoteIt}
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 rounded-lg border p-4 ${
                  isLawyer ? 'bg-red-500/10 border-red-500/20' : 'border-rose-400/30 bg-rose-50/80'
                }`}
              >
                <div className="flex items-start gap-3">
                  <svg
                    className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                      isLawyer ? 'text-red-400' : 'text-rose-500'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className={`text-sm ${isLawyer ? 'text-red-300' : 'text-rose-700'}`}>
                    {error}
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Side - Results (only for lawyers) */}
          {isLawyer && (pecResult || email) && (
            <div className="min-w-0">
              <ResultsPanel
                pecResult={pecResult}
                email={email}
                onDownloadPdf={handleDownloadPdf}
                isDownloading={isDownloading}
              />
            </div>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Role Switch Transition Overlay */}
      <AnimatePresence>
        {modeTransition !== 'idle' && (
          <motion.div
            key={modeTransition}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 14 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="w-[min(92vw,420px)] rounded-2xl border border-slate-600/60 bg-slate-900/90 p-6 text-center shadow-2xl"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
                className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-amber-300/40 border-t-amber-300"
              />
              <p className="text-base font-semibold text-white">
                {modeTransition === 'toLawyer'
                  ? 'Accesso riservato in preparazione...'
                  : 'Ritorno alla modalita cliente...'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {modeTransition === 'toLawyer'
                  ? 'Stiamo attivando strumenti operativi avanzati.'
                  : 'Sessione riservata chiusa correttamente.'}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lawyer Login Modal */}
      <AnimatePresence>
        {showLawyerModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLawyerModal(false)}
              className="fixed inset-0 z-40 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),rgba(0,0,0,0.78))] backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 34, rotateX: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              transition={{ type: 'spring', damping: 16, stiffness: 190 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
            >
              <div className="relative overflow-hidden rounded-2xl border border-amber-300/35 bg-[linear-gradient(155deg,rgba(10,22,40,0.95),rgba(20,29,46,0.95))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.58)]">
                <motion.div
                  aria-hidden="true"
                  initial={{ x: '-130%' }}
                  animate={{ x: '130%' }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                  className="pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-amber-200/20 to-transparent"
                />

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/80">
                      Area Riservata
                    </p>
                    <h2 className="text-2xl font-bold text-white">Accesso Professionale</h2>
                  </div>
                  <button
                    onClick={() => setShowLawyerModal(false)}
                    className="rounded-full border border-slate-600/60 px-2 py-1 text-gray-400 transition hover:border-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleLawyerLogin} className="space-y-4">
                  {/* Password Field */}
                  <div>
                    <label className="block text-sm font-semibold text-amber-50/90 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={lawyerPassword}
                      onChange={(e) => setLawyerPassword(e.target.value)}
                      disabled={isAuthenticating}
                      className="w-full rounded-xl border border-amber-300/25 bg-slate-900/80 px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-300/70 focus:ring-2 focus:ring-amber-200/20 disabled:opacity-50"
                      placeholder="Inserisci la password"
                    />
                  </div>

                  {/* Error Message */}
                  {lawyerError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-sm"
                    >
                      ⚠️ {lawyerError}
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isAuthenticating || !lawyerPassword}
                    className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-200 px-4 py-3 font-semibold uppercase tracking-wide text-slate-900 shadow-lg shadow-amber-300/20 transition hover:from-amber-200 hover:via-yellow-200 hover:to-amber-100 disabled:opacity-50"
                  >
                    {isAuthenticating ? 'Autenticazione...' : 'Accedi'}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
