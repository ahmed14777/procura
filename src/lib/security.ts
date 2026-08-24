export const PUBLIC_ERROR_MESSAGE = 'Si è verificato un errore inatteso. Riprova.'
export const PUBLIC_AUTH_ERROR_MESSAGE = 'Accesso non riuscito. Riprova.'

type SecurityMeta = Record<string, string | number | boolean | null | undefined>

export function createSecurityErrorReference(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function logSecurityError(
  context: string,
  error: unknown,
  reference: string,
  meta?: SecurityMeta
) {
  const safeError =
    error instanceof Error ? { name: error.name, message: error.message } : { value: String(error) }

  console.error(`[security] ${context}`, {
    reference,
    ...meta,
    error: safeError,
  })
}

export function applySecurityHeaders(headers: Headers) {
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'SAMEORIGIN')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
}
