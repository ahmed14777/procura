import type { ProcuraFormData, TipoRichiesta } from '@/lib/schema'
import { LAWYER_PROFILE } from '@/config/business'
import { EMAIL_GENERATOR_COPY } from '@/config/content'

/**
 * Email Generator Module
 *
 * Generates professional and legally correct PEC subject and body
 * suitable for communication with Italian public administration.
 *
 * The generated text is:
 * - Short
 * - Professional
 * - Clear
 * - Focused on getting a fast reply
 */
function capitalizeFirst(value: string): string {
  if (!value) return ''
  const v = value.trim()
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase()
}
export interface GeneratedEmail {
  subject: string
  body: string
}

/**
 * Request type labels in Italian
 */
const TIPO_RICHIESTA_LABELS: Record<TipoRichiesta, string> = EMAIL_GENERATOR_COPY.requestTypeLabels

/**
 * Legal references by request type
 * Note: We use only generic references without article/law numbers
 */
const RIFERIMENTI_NORMATIVI: Record<TipoRichiesta, string> = EMAIL_GENERATOR_COPY.legalReferences

/**
 * Generates the email subject line
 * Format: [Tipo richiesta] – Nome Cognome – pratica VESTANET n. XXXXX (if present)
 *
 * @param data - The form data
 * @returns Formatted subject line
 */
export function generateSubject(data: ProcuraFormData): string {
  const tipoLabel = TIPO_RICHIESTA_LABELS[data.tipoRichiesta]
  const nomeCompleto = `${capitalizeFirst(data.nome)} ${capitalizeFirst(data.cognome)}`

  let subject = `${tipoLabel} – ${nomeCompleto}`

  // Add Vestanet number if present
  if (data.numeroVestanet && data.numeroVestanet.trim() !== '') {
    subject += ` – pratica VESTANET n. ${data.numeroVestanet}`
  }

  return subject
}

/**
 * Generates the email body text
 * The body is professional, concise, and appropriate for PA communication
 *
 * @param data - The form data
 * @param commissione - The competent commission name
 * @returns Formatted email body
 */
export function generateBody(data: ProcuraFormData, commissione: string): string {
  const nomeCompleto = `${capitalizeFirst(data.nome)} ${capitalizeFirst(data.cognome)}`
  const riferimento = RIFERIMENTI_NORMATIVI[data.tipoRichiesta]

  const lines: string[] = [
    `Alla Commissione Territoriale di ${commissione}`,
    '',
    `La sottoscritta ${LAWYER_PROFILE.fullName}, del Foro di ${LAWYER_PROFILE.barAssociation},`,
    `in qualità di difensore del Sig./della Sig.ra ${nomeCompleto},`,
    `nato/a a ${data.luogoNascita} il ${formatDate(data.dataNascita)}${data.codiceFiscale ? `, C.F. ${data.codiceFiscale.toUpperCase()}` : ''},`,
    `giusta procura alle liti regolarmente conferita ed allegata alla presente,`,
  ]

  if (data.numeroVestanet?.trim()) {
    lines.push(`con riferimento alla posizione VESTANET n. ${data.numeroVestanet},`)
  }

  lines.push('', ` ${riferimento},`, '')

  if (data.tipoRichiesta === 'asilo') {
    lines.push(...EMAIL_GENERATOR_COPY.askClauseAsilo)
  } else {
    lines.push(...EMAIL_GENERATOR_COPY.askClauseAccesso)
  }

  lines.push(
    '',
    'Si richiede che ogni comunicazione inerente al procedimento sia trasmessa',
    `a mezzo PEC all’indirizzo ${LAWYER_PROFILE.pec}`,
    `nonché mediante raccomandata A/R presso lo studio in ${LAWYER_PROFILE.officeAddressLong}.`,
    '',
    'Si allegano:',
    ...EMAIL_GENERATOR_COPY.attachments,
    '',
    'Distinti saluti.',
    '',
    LAWYER_PROFILE.fullName,
    `Foro di ${LAWYER_PROFILE.barAssociation}`
  )

  return lines.join('\n')
}

/**
 * Generates both subject and body in one call
 *
 * @param data - The form data
 * @param commissione - The competent commission name
 * @returns Object with subject and body
 */
export function generateEmail(data: ProcuraFormData, commissione: string): GeneratedEmail {
  return {
    subject: generateSubject(data),
    body: generateBody(data, commissione),
  }
}

/**
 * Formats a date string (YYYY-MM-DD) to Italian format (DD/MM/YYYY)
 */
function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-')
  return `${day}/${month}/${year}`
}
