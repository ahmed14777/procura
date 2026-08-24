'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import type { ProcuraFormData } from '@/lib/schema'
import { ProcuraForm } from '@/components/ProcuraForm'
import { PUBLIC_ERROR_MESSAGE } from '@/lib/security'

/**
 * Success Page Content - After Stripe Payment
 * Displays the email draft ready to send
 */
function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session_id')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [emailData, setEmailData] = useState<{
    emailHtml: string
    emailText: string
    subject: string
    senderName: string
    recipientEmail: string
    commissione: string
  } | null>(null)
  const [pendingRequest, setPendingRequest] = useState<{
    formData: Partial<ProcuraFormData>
    documentFileName: string
  } | null>(null)
  const [isPreparingRequest, setIsPreparingRequest] = useState(false)
  const emailRef = useRef<HTMLDivElement>(null)

  const startNewRequest = () => {
    if (!window.confirm('هل تريد بدء طلب جديد؟')) return
    sessionStorage.removeItem('pendingClientRequest')
    sessionStorage.removeItem('postPaymentFormData')
    sessionStorage.removeItem('stripeSessionId')
    localStorage.removeItem('pendingClientRequest')
    localStorage.removeItem('completedClientRequest')
    router.push('/')
  }

  /**
   * Verify payment and load email data
   */
  useEffect(() => {
    const verifyPayment = async () => {
      try {
        if (!sessionId) {
          throw new Error('Session ID mancante')
        }

        // Verify session with backend
        const response = await fetch(`/api/stripe/checkout?sessionId=${sessionId}`)
        const result = (await response.json()) as {
          status?: string
          error?: string
          customerEmail?: string | null
          clientPhone?: string | null
        }

        if (!response.ok || result.status !== 'paid') {
          throw new Error(result.error || 'Pagamento non verificato')
        }

        const savedCompleted = localStorage.getItem('completedClientRequest')
        if (savedCompleted) {
          const completed = JSON.parse(savedCompleted) as {
            sessionId: string
            emailData: typeof emailData
          }
          if (completed.sessionId === sessionId && completed.emailData) {
            setEmailData(completed.emailData)
            setIsLoading(false)
            return
          }
        }

        const storedRequest =
          sessionStorage.getItem('pendingClientRequest') ||
          localStorage.getItem('pendingClientRequest')
        const stored = storedRequest
          ? (JSON.parse(storedRequest) as {
              formData: Partial<ProcuraFormData>
              documentFileName: string
            })
          : {
              formData: { telefono: result.clientPhone || '' },
              documentFileName: 'documento.pdf',
            }
        if (!stored.formData.telefono) throw new Error('Dati della richiesta non trovati')
        setPendingRequest({
          ...stored,
          formData: {
            ...stored.formData,
            email: result.customerEmail || stored.formData.email || '',
          },
        })
      } catch (err) {
        console.error('Payment verification error:', err)
        setError(PUBLIC_ERROR_MESSAGE)
      } finally {
        setIsLoading(false)
      }
    }

    verifyPayment()
  }, [sessionId])

  const handlePaidRequest = useCallback(
    async (data: ProcuraFormData, _signature: string | undefined, sourceDocument: File) => {
      setIsPreparingRequest(true)
      setError(null)
      try {
        if (!sessionId) throw new Error('Sessione pagamento mancante')

        const response = await fetch('/api/generate-client-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formData: data,
            documentFileName: sourceDocument.name,
            paymentSessionId: sessionId,
          }),
        })
        const result = await response.json()
        if (!response.ok)
          throw new Error(result.error || 'Errore nella preparazione della richiesta')
        setEmailData(result)
        localStorage.setItem(
          'completedClientRequest',
          JSON.stringify({ sessionId, emailData: result })
        )
        sessionStorage.removeItem('pendingClientRequest')
        sessionStorage.removeItem('postPaymentFormData')
        localStorage.removeItem('pendingClientRequest')
      } catch (err) {
        console.error('Client request preparation error:', err)
        setError(PUBLIC_ERROR_MESSAGE)
      } finally {
        setIsPreparingRequest(false)
      }
    },
    [sessionId]
  )

  /**
   * Copy email to clipboard
   */
  /**
   * Generate mailto link and open email
   */
  const openEmailClient = useCallback(() => {
    if (!emailData) return

    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    if (isMobile) {
      window.alert('قبل الإرسال: نزّل ملف الـPDF وأرفقه في تطبيق البريد، ثم اضغط إرسال.')
    }

    const mailtoLink = `mailto:${encodeURIComponent(emailData.recipientEmail)}?subject=${encodeURIComponent(
      emailData.subject
    )}&body=${encodeURIComponent(emailData.emailText)}`

    window.open(mailtoLink)
  }, [emailData])

  if (isLoading) {
    return (
      <>
        <Header clientPaid />
        <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="inline-block"
            >
              <svg
                className="h-12 w-12 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </motion.div>
            <p className="mt-4 text-slate-300">Verifica in corso...</p>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (error && !pendingRequest) {
    return (
      <>
        <Header clientPaid />
        <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full rounded-lg border border-red-400/30 bg-red-500/10 p-6"
          >
            <h1 className="text-2xl font-bold text-red-200 mb-4">Errore</h1>
            <p className="text-red-100 mb-6">{error}</p>
            <a
              href="/client"
              className="inline-block w-full text-center rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold transition hover:bg-blue-700"
            >
              Torna indietro
            </a>
          </motion.div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header clientPaid />
      <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-4xl">
          {/* Success Message */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <div className="mb-4 flex justify-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="h-16 w-16 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center"
              >
                <svg
                  className="h-8 w-8 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </motion.div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">
              {emailData ? 'Richiesta pronta!' : 'Pagamento effettuato!'}
            </h1>
            <p className="text-slate-300">
              {emailData
                ? 'Il documento e i dati sono pronti per l’invio'
                : 'Ora carica il documento per preparare la richiesta'}
            </p>
          </motion.div>

          {pendingRequest && !emailData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-2xl border border-slate-700/60 bg-slate-800/65 p-6 text-center"
            >
              {error && <p className="mb-4 text-sm text-red-300">{error}</p>}
              <ProcuraForm
                onSubmitPdfOnly={() => {}}
                onSubmitAutodichiarazione={() => {}}
                onSubmitAll={handlePaidRequest}
                onSimulate={() => {}}
                onNewPractice={() => {}}
                isLoading={isPreparingRequest}
                role="client"
                clientPaid
                initialFormData={pendingRequest.formData}
              />
            </motion.div>
          )}

          {/* Email Preview */}
          {emailData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-slate-700/60 bg-slate-800/65 p-6 backdrop-blur-sm mb-6"
            >
              <div className="mb-6 pb-6 border-b border-slate-700/60">
                <h2 className="text-xl font-semibold text-white mb-2">
                  Subject: {emailData.subject}
                </h2>
                <p className="text-slate-400">From: {emailData.senderName}</p>
                <p className="mt-2 text-sm text-amber-200">
                  To: {emailData.commissione} · {emailData.recipientEmail}
                </p>
              </div>

              {/* Email Preview */}
              <div
                ref={emailRef}
                className="mb-6 rounded-lg bg-white text-slate-900 p-6 overflow-auto max-h-[600px]"
                dangerouslySetInnerHTML={{ __html: emailData.emailHtml }}
              />

              <div className="mb-6 rounded-lg border border-amber-400/40 bg-amber-400/10 p-4">
                <p className="text-sm font-semibold text-amber-100">
                  مبروك، طلبك جاهز / Complimenti, la richiesta è pronta
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  أرفق نسخة من الإقامة فقط، ثم اضغط إرسال.
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Allega solo una copia del permesso di soggiorno, poi premi Invia.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={openEmailClient}
                  className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Apri Email / فتح البريد
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Info Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-4 mb-6"
          >
            <p className="text-blue-200 text-sm">
              <strong>اكتملت الخطوات / Procedura completata:</strong> أرفق نسخة من الإقامة فقط ثم
              اضغط إرسال.
            </p>
          </motion.div>

          {/* Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center gap-4"
          >
            <button
              type="button"
              onClick={startNewRequest}
              className="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              طلب جديد / Nuova richiesta
            </button>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  )
}

/**
 * Loading fallback for Suspense
 */
function LoadingFallback() {
  return (
    <>
      <Header clientPaid />
      <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 text-blue-400"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      </main>
      <Footer />
    </>
  )
}

/**
 * Success Page - After Stripe Payment
 * Wrapped with Suspense to handle useSearchParams
 */
export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PaymentSuccessContent />
    </Suspense>
  )
}
