'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface License {
  id: string
  name: string
  active: boolean
  createdAt: string
  lastUsedAt: string
  lastStatus: string
  totalUsage: number
  usageToday: number
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleString('it-IT') : 'Mai'
}

export default function ExtensionLicensesPage() {
  const router = useRouter()
  const [licenses, setLicenses] = useState<License[]>([])
  const [name, setName] = useState('')
  const [newToken, setNewToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revealedTokens, setRevealedTokens] = useState<Record<string, string>>({})
  const [revealingId, setRevealingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [savingEditId, setSavingEditId] = useState<string | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [verifyFeedback, setVerifyFeedback] = useState<{ ok: boolean; message: string } | null>(
    null
  )

  const loadLicenses = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/extension-licenses', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Impossibile caricare le licenze.')
      setLicenses(data.licenses || [])
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Errore inatteso.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/extension-licenses', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Impossibile caricare le licenze.')
        return data
      })
      .then((data) => {
        if (!cancelled) {
          setLicenses(data.licenses || [])
          setError('')
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Errore inatteso.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const createLicense = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    const response = await fetch('/api/extension-licenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await response.json()
    if (!response.ok) {
      setError(data.error || 'Impossibile creare la licenza.')
      return
    }
    setNewToken(data.token)
    setVerifyCode(data.token)
    setName('')
    await loadLicenses()
  }

  const startEdit = (license: License) => {
    setError('')
    setEditingId(license.id)
    setEditingName(license.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const saveEdit = async (license: License) => {
    const normalizedName = editingName.trim()
    if (!normalizedName || normalizedName.length > 80) {
      setError('Nome licenza non valido.')
      return
    }

    setError('')
    setSavingEditId(license.id)
    try {
      const response = await fetch(`/api/extension-licenses/${license.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: normalizedName }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Impossibile aggiornare la licenza.')

      await loadLicenses()
      cancelEdit()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Errore inatteso.')
    } finally {
      setSavingEditId(null)
    }
  }

  const setActive = async (license: License, active: boolean) => {
    const response = await fetch(`/api/extension-licenses/${license.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    })
    if (!response.ok) {
      const data = await response.json()
      setError(data.error || 'Impossibile aggiornare la licenza.')
      return
    }
    await loadLicenses()
  }

  const revealToken = async (license: License) => {
    setError('')
    setRevealingId(license.id)
    try {
      const response = await fetch(`/api/extension-licenses/${license.id}/reveal`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Impossibile recuperare il codice.')
      setRevealedTokens((current) => ({ ...current, [license.id]: data.token }))
    } catch (revealError) {
      setError(revealError instanceof Error ? revealError.message : 'Errore inatteso.')
    } finally {
      setRevealingId(null)
    }
  }

  const deleteLicense = async (license: License) => {
    const confirmed = window.confirm(`Eliminare la licenza \"${license.name}\"?`)
    if (!confirmed) return

    setError('')
    setDeletingId(license.id)
    try {
      const response = await fetch(`/api/extension-licenses/${license.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Impossibile eliminare la licenza.')

      setRevealedTokens((current) => {
        const next = { ...current }
        delete next[license.id]
        return next
      })
      await loadLicenses()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Errore inatteso.')
    } finally {
      setDeletingId(null)
    }
  }

  const verifyActivationCode = async (event: FormEvent) => {
    event.preventDefault()
    const token = verifyCode.trim()
    if (!token) {
      setVerifyFeedback({ ok: false, message: 'Inserisci prima un codice.' })
      return
    }

    setError('')
    setVerifyingCode(true)
    setVerifyFeedback(null)
    try {
      const response = await fetch('/api/extension-licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await response.json()

      if (!response.ok) {
        setVerifyFeedback({ ok: false, message: data.error || 'Codice non valido.' })
        return
      }

      setVerifyFeedback({
        ok: true,
        message: `Codice valido: ${data.name} | Oggi: ${data.usageToday}/100 | Residuo: ${data.remaining}`,
      })
    } catch {
      setVerifyFeedback({ ok: false, message: 'Errore durante la verifica del codice.' })
    } finally {
      setVerifyingCode(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-3 py-6 text-slate-100 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase text-amber-300">Easy2Do</p>
            <h1 className="mt-1 text-2xl font-semibold">Licenze estensione</h1>
          </div>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500 sm:w-auto"
          >
            Torna al servizio
          </button>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div>
            <h2 className="text-lg font-semibold">Nuova licenza</h2>
            <form onSubmit={createLicense} className="mt-4 space-y-3">
              <label className="block text-sm text-slate-300">
                Nome utente o postazione
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={80}
                  required
                  className="mt-2 w-full border border-slate-700 bg-slate-900 px-3 py-2.5 outline-none focus:border-amber-300"
                />
              </label>
              <button
                type="submit"
                className="w-full bg-amber-400 px-4 py-2.5 font-semibold text-slate-950 hover:bg-amber-300"
              >
                Crea licenza
              </button>
            </form>

            {newToken && (
              <div className="mt-5 border border-amber-300/40 bg-amber-300/10 p-4">
                <strong className="text-sm text-amber-200">Copia ora il codice</strong>
                <p className="mt-1 text-xs text-slate-300">Non sarà mostrato una seconda volta.</p>
                <textarea
                  readOnly
                  value={newToken}
                  rows={4}
                  className="mt-3 w-full resize-none border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(newToken)}
                  className="mt-2 border border-amber-300/50 px-3 py-2 text-xs font-semibold text-amber-200"
                >
                  Copia codice
                </button>
              </div>
            )}

            <div className="mt-5 border border-slate-800 bg-slate-900/40 p-4">
              <h3 className="text-sm font-semibold text-slate-100">Verifica codice attivazione</h3>
              <form onSubmit={verifyActivationCode} className="mt-3 space-y-3">
                <textarea
                  value={verifyCode}
                  onChange={(event) => setVerifyCode(event.target.value)}
                  rows={3}
                  className="w-full resize-none border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-200 outline-none focus:border-amber-300"
                  placeholder="Incolla qui il codice e2d_..."
                />
                <button
                  type="submit"
                  disabled={verifyingCode}
                  className="w-full border border-amber-300/50 px-3 py-2 text-xs font-semibold text-amber-200 disabled:opacity-50"
                >
                  {verifyingCode ? 'Verifica…' : 'Verifica'}
                </button>
              </form>
              {verifyFeedback && (
                <p
                  className={`mt-3 border p-3 text-xs ${
                    verifyFeedback.ok
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                      : 'border-red-500/40 bg-red-500/10 text-red-200'
                  }`}
                >
                  <span className="break-words">{verifyFeedback.message}</span>
                </p>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Licenze create</h2>
              <span className="text-xs text-slate-400">Limite: 100 documenti al giorno</span>
            </div>
            {error && (
              <p className="mt-3 border border-red-500/40 bg-red-500/10 p-3 text-sm">{error}</p>
            )}
            {loading ? (
              <p className="mt-5 text-sm text-slate-400">Caricamento...</p>
            ) : licenses.length === 0 ? (
              <p className="mt-5 border border-slate-800 p-5 text-sm text-slate-400">
                Nessuna licenza creata.
              </p>
            ) : (
              <>
                <div className="mt-4 space-y-3 md:hidden">
                  {licenses.map((license) => (
                    <article
                      key={license.id}
                      className="border border-slate-800 bg-slate-900/40 p-4"
                    >
                      {editingId === license.id ? (
                        <input
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          maxLength={80}
                          className="w-full border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm outline-none focus:border-amber-300"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-slate-100">{license.name}</p>
                      )}

                      {revealedTokens[license.id] && (
                        <div className="mt-2 rounded border border-slate-800 bg-slate-950 p-2">
                          <code className="block break-all text-[11px] text-amber-200">
                            {revealedTokens[license.id]}
                          </code>
                          <button
                            type="button"
                            onClick={() =>
                              void navigator.clipboard.writeText(revealedTokens[license.id])
                            }
                            className="mt-2 text-[11px] text-amber-300 underline"
                          >
                            Copia
                          </button>
                        </div>
                      )}

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <span className="text-slate-400">Stato</span>
                        <span className={license.active ? 'text-emerald-300' : 'text-red-300'}>
                          {license.active ? 'Attiva' : 'Disattivata'}
                        </span>
                        <span className="text-slate-400">Oggi</span>
                        <span>{license.usageToday}/100</span>
                        <span className="text-slate-400">Totale</span>
                        <span>{license.totalUsage}</span>
                        <span className="text-slate-400">Ultimo utilizzo</span>
                        <span className="text-[11px] text-slate-300">
                          {formatDate(license.lastUsedAt)}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {editingId === license.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void saveEdit(license)}
                              disabled={savingEditId === license.id}
                              className="border border-emerald-500/60 px-3 py-2 text-xs text-emerald-200 hover:border-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
                            >
                              {savingEditId === license.id ? 'Salvo…' : 'Salva'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={savingEditId === license.id}
                              className="border border-slate-700 px-3 py-2 text-xs hover:border-slate-500 disabled:opacity-50"
                            >
                              Annulla
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => void revealToken(license)}
                              disabled={revealingId === license.id || deletingId === license.id}
                              className="border border-slate-700 px-3 py-2 text-xs hover:border-slate-500 disabled:opacity-50"
                            >
                              {revealingId === license.id ? 'Recupero…' : 'Mostra codice'}
                            </button>
                            <button
                              type="button"
                              onClick={() => startEdit(license)}
                              disabled={deletingId === license.id}
                              className="border border-slate-700 px-3 py-2 text-xs hover:border-slate-500 disabled:opacity-50"
                            >
                              Modifica
                            </button>
                            <button
                              type="button"
                              onClick={() => void setActive(license, !license.active)}
                              disabled={deletingId === license.id}
                              className="border border-slate-700 px-3 py-2 text-xs hover:border-slate-500 disabled:opacity-50"
                            >
                              {license.active ? 'Disattiva' : 'Riattiva'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteLicense(license)}
                              disabled={deletingId === license.id}
                              className="border border-red-500/60 px-3 py-2 text-xs text-red-200 hover:border-red-400 hover:bg-red-500/10 disabled:opacity-50"
                            >
                              {deletingId === license.id ? 'Elimino…' : 'Elimina'}
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-4 hidden overflow-x-auto border border-slate-800 md:block">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="bg-slate-900 text-xs text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Nome</th>
                        <th className="px-4 py-3">Stato</th>
                        <th className="px-4 py-3">Oggi</th>
                        <th className="px-4 py-3">Totale</th>
                        <th className="px-4 py-3">Ultimo utilizzo</th>
                        <th className="px-4 py-3">Azione</th>
                      </tr>
                    </thead>
                    <tbody>
                      {licenses.map((license) => (
                        <tr key={license.id} className="border-t border-slate-800">
                          <td className="px-4 py-3 font-medium">
                            {editingId === license.id ? (
                              <input
                                value={editingName}
                                onChange={(event) => setEditingName(event.target.value)}
                                maxLength={80}
                                className="w-full border border-slate-700 bg-slate-900 px-2 py-1 text-sm outline-none focus:border-amber-300"
                              />
                            ) : (
                              <div>{license.name}</div>
                            )}
                            {revealedTokens[license.id] && (
                              <div className="mt-2 flex items-center gap-2">
                                <code className="max-w-[220px] truncate rounded bg-slate-900 px-2 py-1 text-[11px] text-amber-200">
                                  {revealedTokens[license.id]}
                                </code>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void navigator.clipboard.writeText(revealedTokens[license.id])
                                  }
                                  className="text-[11px] text-amber-300 underline"
                                >
                                  Copia
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={license.active ? 'text-emerald-300' : 'text-red-300'}>
                              {license.active ? 'Attiva' : 'Disattivata'}
                            </span>
                          </td>
                          <td className="px-4 py-3">{license.usageToday}/100</td>
                          <td className="px-4 py-3">{license.totalUsage}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">
                            {formatDate(license.lastUsedAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {editingId === license.id ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => void saveEdit(license)}
                                    disabled={savingEditId === license.id}
                                    className="border border-emerald-500/60 px-3 py-1.5 text-xs text-emerald-200 hover:border-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
                                  >
                                    {savingEditId === license.id ? 'Salvo…' : 'Salva'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    disabled={savingEditId === license.id}
                                    className="border border-slate-700 px-3 py-1.5 text-xs hover:border-slate-500 disabled:opacity-50"
                                  >
                                    Annulla
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => void revealToken(license)}
                                    disabled={
                                      revealingId === license.id || deletingId === license.id
                                    }
                                    className="border border-slate-700 px-3 py-1.5 text-xs hover:border-slate-500 disabled:opacity-50"
                                  >
                                    {revealingId === license.id ? 'Recupero…' : 'Mostra codice'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => startEdit(license)}
                                    disabled={deletingId === license.id}
                                    className="border border-slate-700 px-3 py-1.5 text-xs hover:border-slate-500 disabled:opacity-50"
                                  >
                                    Modifica
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void setActive(license, !license.active)}
                                    disabled={deletingId === license.id}
                                    className="border border-slate-700 px-3 py-1.5 text-xs hover:border-slate-500 disabled:opacity-50"
                                  >
                                    {license.active ? 'Disattiva' : 'Riattiva'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void deleteLicense(license)}
                                    disabled={deletingId === license.id}
                                    className="border border-red-500/60 px-3 py-1.5 text-xs text-red-200 hover:border-red-400 hover:bg-red-500/10 disabled:opacity-50"
                                  >
                                    {deletingId === license.id ? 'Elimino…' : 'Elimina'}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
