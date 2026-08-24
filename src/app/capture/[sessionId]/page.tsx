'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { PUBLIC_ERROR_MESSAGE } from '@/lib/security'

export default function CapturePage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const searchParams = useSearchParams()
  const [submitToken, setSubmitToken] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

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

  const selectPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    if (!selected) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
    setMessage(null)
  }

  const sendPhoto = async () => {
    if (!file) return
    setIsSending(true)
    setMessage(null)
    try {
      const body = new FormData()
      body.append('file', file)
      if (submitToken) {
        body.append('submitToken', submitToken)
      }
      const response = await fetch(`/api/capture-sessions/${sessionId}`, {
        method: 'POST',
        body,
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(result.error || 'Invio non riuscito.')
      setSent(true)
    } catch (error) {
      console.error('Capture upload error:', error)
      setMessage(PUBLIC_ERROR_MESSAGE)
    } finally {
      setIsSending(false)
    }
  }

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-center">
        <div className="max-w-sm rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8">
          <div className="mb-4 text-5xl">✓</div>
          <h1 className="text-xl font-semibold text-white">Foto inviata</h1>
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

  return (
    <main className="min-h-screen bg-slate-900 px-5 py-8 text-white">
      <div className="mx-auto max-w-md">
        <h1 className="text-center text-2xl font-semibold">Fotografa il documento</h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Inquadra tutto il documento con buona luce.
        </p>

        {previewUrl ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-700 bg-black p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Anteprima documento"
              className="max-h-[58vh] w-full object-contain"
            />
          </div>
        ) : (
          <div className="mt-6 flex h-72 items-center justify-center rounded-2xl border-2 border-dashed border-slate-600 bg-slate-800/60 text-sm text-slate-400">
            Nessuna foto
          </div>
        )}

        <div className="mt-5 space-y-3">
          <label className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-sky-600 px-4 py-4 font-medium transition hover:bg-sky-500">
            {file ? 'Ripeti foto' : 'Apri fotocamera'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={selectPhoto}
              className="sr-only"
            />
          </label>
          {file && (
            <button
              type="button"
              onClick={sendPhoto}
              disabled={isSending}
              className="w-full rounded-xl bg-emerald-600 px-4 py-4 font-medium transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {isSending ? 'Invio in corso...' : 'Usa questa foto'}
            </button>
          )}
        </div>
        {message && <p className="mt-4 text-center text-sm text-red-300">{message}</p>}
      </div>
    </main>
  )
}
