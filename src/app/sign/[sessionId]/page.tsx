'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { PUBLIC_ERROR_MESSAGE } from '@/lib/security'

export default function SignaturePage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const searchParams = useSearchParams()
  const [submitToken, setSubmitToken] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const [clientName, setClientName] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!sent) return
    const timeout = window.setTimeout(() => window.close(), 1200)
    return () => window.clearTimeout(timeout)
  }, [sent])

  useEffect(() => {
    const fallbackFromQuery = searchParams.get('submitToken')
    if (fallbackFromQuery) {
      setSubmitToken(fallbackFromQuery)
      return
    }

    const hash = window.location.hash
    const raw = hash.startsWith('#') ? hash.slice(1) : hash
    const params = new URLSearchParams(raw)
    const fromHash = params.get('st')
    setSubmitToken(fromHash)
  }, [searchParams])

  useEffect(() => {
    fetch(`/api/signature-sessions/${sessionId}`, { cache: 'no-store' })
      .then(async (response) => {
        const result = (await response.json()) as { clientName?: string; error?: string }
        if (!response.ok) {
          setUnavailable(true)
          throw new Error(result.error || 'Sessione non disponibile.')
        }
        setClientName(result.clientName || '')
      })
      .catch((error) => {
        console.error('Signature session fetch error:', error)
        setMessage(PUBLIC_ERROR_MESSAGE)
      })
  }, [sessionId])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = width * ratio
    canvas.height = height * ratio
    const context = canvas.getContext('2d')
    context?.scale(ratio, ratio)
    if (context) {
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.lineWidth = 2.5
      context.strokeStyle = '#0f172a'
    }
  }, [])

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drawingRef.current = true
    const context = event.currentTarget.getContext('2d')
    const { x, y } = point(event)
    context?.beginPath()
    context?.moveTo(x, y)
  }

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const context = event.currentTarget.getContext('2d')
    const { x, y } = point(event)
    context?.lineTo(x, y)
    context?.stroke()
    setHasSignature(true)
  }

  const stopDrawing = () => {
    drawingRef.current = false
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const confirmSignature = async () => {
    const canvas = canvasRef.current
    if (!canvas || !hasSignature || !accepted) return
    setIsSending(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/signature-sessions/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: canvas.toDataURL('image/png'), accepted, submitToken }),
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(result.error || 'Invio non riuscito.')
      setSent(true)
    } catch (error) {
      console.error('Signature submit error:', error)
      setMessage(PUBLIC_ERROR_MESSAGE)
    } finally {
      setIsSending(false)
    }
  }

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-center">
        <div className="max-w-sm rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-white">
          <div className="mb-4 text-5xl">✓</div>
          <h1 className="text-xl font-semibold">Firma inviata</h1>
          <p className="mt-2 text-sm text-slate-300">
            La pagina si chiuderà automaticamente. Se resta aperta, puoi chiuderla e tornare al
            computer.
          </p>
          <button
            type="button"
            onClick={() => window.close()}
            className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white"
          >
            Chiudi pagina
          </button>
        </div>
      </main>
    )
  }

  if (unavailable) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-center">
        <div className="max-w-sm rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-white">
          <div className="mb-4 text-5xl">✓</div>
          <h1 className="text-xl font-semibold">Link non più valido</h1>
          <p className="mt-2 text-sm text-slate-300">
            La firma è già stata inviata oppure la sessione è scaduta.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-900 px-5 py-8 text-white">
      <div className="mx-auto max-w-md">
        <h1 className="text-center text-2xl font-semibold">Firma la Procura</h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Cliente: {clientName || 'Caricamento...'}
        </p>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
          <div className="flex items-center justify-between gap-3 border-b border-slate-700 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">Leggi la Procura completa</p>
              <p className="mt-1 text-xs text-slate-400">Scorri il documento prima di firmare.</p>
            </div>
            <a
              href={`/api/signature-sessions/${sessionId}/document`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-lg border border-sky-400/40 px-3 py-2 text-xs font-medium text-sky-200"
            >
              Apri PDF
            </a>
          </div>
          <iframe
            src={`/api/signature-sessions/${sessionId}/document`}
            title="Procura da leggere e firmare"
            className="h-[58vh] min-h-[430px] w-full bg-white"
          />
        </section>

        <p className="mt-6 text-sm font-medium text-slate-200">Firma nel riquadro:</p>
        <div className="mt-2 rounded-2xl border border-slate-700 bg-white p-2">
          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            className="h-64 w-full touch-none rounded-xl"
            aria-label="Area firma"
          />
        </div>
        <button
          type="button"
          onClick={clearSignature}
          className="mt-2 w-full rounded-lg border border-slate-600 py-2 text-sm text-slate-300"
        >
          Cancella firma
        </button>

        <label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-1 h-5 w-5"
          />
          <span>Confermo di aver letto e approvato la Procura.</span>
        </label>

        <button
          type="button"
          onClick={confirmSignature}
          disabled={!hasSignature || !accepted || isSending || !clientName}
          className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-4 font-medium transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSending ? 'Invio in corso...' : 'Conferma firma'}
        </button>
        {message && <p className="mt-4 text-center text-sm text-red-300">{message}</p>}
      </div>
    </main>
  )
}
