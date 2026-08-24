import { NextResponse } from 'next/server'
import { CodiceFiscaleUtils } from '@marketto/codice-fiscale-utils'
import belfioreConnector from '@marketto/belfiore-connector-embedded'
import { isCodiceFiscaleFormallyValid } from '@/lib/codiceFiscale'
import {
  PUBLIC_ERROR_MESSAGE,
  createSecurityErrorReference,
  logSecurityError,
} from '@/lib/security'
import { consumeRateLimit } from '@/lib/rateLimit'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
const codiceFiscaleUtils = new CodiceFiscaleUtils(belfioreConnector)

const extractionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    nome: { type: 'string' },
    cognome: { type: 'string' },
    dataNascita: { type: 'string', description: 'YYYY-MM-DD, or empty' },
    luogoNascita: { type: 'string' },
    codiceFiscale: { type: 'string' },
    telefono: { type: 'string' },
    email: { type: 'string' },
    numeroVestanet: {
      type: 'string',
      description:
        'Vestanet code printed after the label ID. Example: ID MI876365 means numeroVestanet is MI876365. ID is only a label and must not be included. Preserve the two letters and every following digit.',
    },
  },
  required: [
    'nome',
    'cognome',
    'dataNascita',
    'luogoNascita',
    'codiceFiscale',
    'telefono',
    'email',
    'numeroVestanet',
  ],
} as const

function getOutputText(response: unknown): string | null {
  if (!response || typeof response !== 'object') return null
  const candidate = response as {
    output_text?: string
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
  }

  if (candidate.output_text) return candidate.output_text

  for (const item of candidate.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && content.text) return content.text
    }
  }
  return null
}

function normalizeVestanet(value: unknown) {
  if (typeof value !== 'string') return ''
  const normalized = value.trim().toUpperCase()
  const afterId = normalized.match(/\bID\s*[:.#-]?\s*([A-Z]{2})[\s-]*(\d+)\b/)
  if (afterId) return `${afterId[1]}${afterId[2]}`
  const code = normalized.match(/\b([A-Z]{2})[\s-]*(\d+)\b/)
  return code ? `${code[1]}${code[2]}` : ''
}

async function normalizeBirthCountry(extracted: Record<string, unknown>) {
  const currentPlace =
    typeof extracted.luogoNascita === 'string' ? extracted.luogoNascita.trim() : ''
  const codiceFiscale =
    typeof extracted.codiceFiscale === 'string' ? extracted.codiceFiscale.trim().toUpperCase() : ''

  if (codiceFiscale && isCodiceFiscaleFormallyValid(codiceFiscale)) {
    const birthPlace = await codiceFiscaleUtils.parser.cfToBirthPlace(codiceFiscale)
    if (birthPlace?.iso3166) return birthPlace.name
    if (birthPlace?.province) return 'Italia'
  }

  if (currentPlace) {
    const parsedPlace = await codiceFiscaleUtils.parser.parsePlace(currentPlace)
    if (parsedPlace?.iso3166) return parsedPlace.name
    if (parsedPlace?.province) return 'Italia'

    if (currentPlace.includes(',')) {
      const parts = currentPlace
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
      if (parts.length > 1) return parts[parts.length - 1]
    }
  }

  return currentPlace
}

export async function POST(request: Request) {
  const rateLimit = await consumeRateLimit({
    request,
    bucket: 'extract-document',
    limit: 5,
    windowSeconds: 5 * 60,
  })

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Hai inviato troppe richieste. Riprova tra poco.',
      },
      {
        status: 429,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': String(rateLimit.retryAfterSeconds),
        },
      }
    )
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    const reference = createSecurityErrorReference()
    logSecurityError(
      'extract-document:POST:missing-api-key',
      new Error('OPENAI_API_KEY missing'),
      reference
    )
    return NextResponse.json(
      { error: PUBLIC_ERROR_MESSAGE, reference },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Seleziona un documento.' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Formato non supportato. Usa PDF, JPG, PNG o WEBP.' },
        { status: 415 }
      )
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Il file deve avere una dimensione massima di 10 MB.' },
        { status: 413 }
      )
    }

    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
    const documentInput =
      file.type === 'application/pdf'
        ? {
            type: 'input_file',
            filename: file.name,
            file_data: `data:${file.type};base64,${base64}`,
          }
        : { type: 'input_image', image_url: `data:${file.type};base64,${base64}`, detail: 'high' }

    const openAIResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_DOCUMENT_MODEL || 'gpt-4.1-mini',
        store: false,
        max_output_tokens: 350,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `Extract only clearly visible personal data. Never invent text. Return an empty string for missing fields.

For nome and cognome, first use explicit document labels and machine-readable data when available: Cognome/Surname/Nom identifies cognome; Nome/Given names/Prénoms identifies nome. If the labels are absent or unclear, apply this document convention: the surname is commonly printed first. When two separate uppercase name lines are shown, treat the first line as cognome and the second line as nome. When both are uppercase on one line and no reliable separator or label exists, interpret the first part as cognome only when the document layout clearly follows surname-first order; otherwise leave uncertain values empty. Preserve compound names and surnames without dropping words.

Normalize birth date to YYYY-MM-DD and codice fiscale to uppercase.

For luogoNascita return the COUNTRY only (not city):
- If the document shows a city in Italy, return "Italia".
- If the document shows a foreign city/country, return the country name only (for example "Marocco", "Egitto", "Pakistan").
- If codice fiscale is visible and reliable, use its birth-place code to infer the country.

IMPORTANT — search the entire document specifically for numeroVestanet even when the document contains many other fields. It is commonly printed with the label "ID", followed by a space and then a code made of exactly two letters plus digits. "ID" is the field label, not part of the value. Examples:
- Printed "ID MI876365" → return numeroVestanet "MI876365"
- Printed "ID: RM 123456" → return numeroVestanet "RM123456"
- Printed "ID TO98765" → return numeroVestanet "TO98765"
Never return only the digits and never return the leading label ID. Do not confuse it with passport, identity-card, pratica, protocollo or codice fiscale numbers. Return it uppercase without spaces. If no ID-labelled two-letter-plus-digits code is visible, then consider another clearly labelled Vestanet reference; otherwise return an empty string.`,
              },
              documentInput,
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'document_personal_data',
            strict: true,
            schema: extractionSchema,
          },
        },
      }),
    })

    if (!openAIResponse.ok) {
      const requestId = openAIResponse.headers.get('x-request-id')
      console.error('OpenAI document extraction failed', openAIResponse.status, requestId)
      return NextResponse.json(
        { error: 'Impossibile analizzare il documento. Riprova.' },
        { status: 502 }
      )
    }

    const responseBody: unknown = await openAIResponse.json()
    const outputText = getOutputText(responseBody)
    if (!outputText) {
      return NextResponse.json({ error: 'Nessun dato leggibile trovato.' }, { status: 422 })
    }

    const extracted = JSON.parse(outputText) as Record<string, unknown>
    extracted.numeroVestanet = normalizeVestanet(extracted.numeroVestanet)
    extracted.luogoNascita = await normalizeBirthCountry(extracted)
    return NextResponse.json({ data: extracted })
  } catch (error) {
    const reference = createSecurityErrorReference()
    logSecurityError('extract-document:POST', error, reference)
    return NextResponse.json(
      { error: PUBLIC_ERROR_MESSAGE, reference },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
