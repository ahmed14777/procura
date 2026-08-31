import { NextResponse } from 'next/server'
import { CodiceFiscaleUtils } from '@marketto/codice-fiscale-utils'
import belfioreConnector from '@marketto/belfiore-connector-embedded'
import { isCodiceFiscaleFormallyValid } from '@/lib/codiceFiscale'
import {
  PUBLIC_ERROR_MESSAGE,
  createSecurityErrorReference,
  logSecurityError,
} from '@/lib/security'

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
    numeroVestanet: { type: 'string' },
    multiplePeople: {
      type: 'boolean',
      description:
        'True when the document clearly contains personal data for more than one person.',
    },
    uncertainFields: {
      type: 'array',
      items: {
        type: 'string',
        enum: [
          'nome',
          'cognome',
          'dataNascita',
          'luogoNascita',
          'codiceFiscale',
          'telefono',
          'email',
          'numeroVestanet',
        ],
      },
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
    'multiplePeople',
    'uncertainFields',
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

export async function extractDocumentData(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    const reference = createSecurityErrorReference()
    logSecurityError(
      'extract-document:missing-api-key',
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
        max_output_tokens: 450,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `Extract only clearly visible personal data for one person. Never invent text. Return an empty string for missing fields.

If the document clearly contains personal data for more than one person, set multiplePeople to true. Otherwise set it to false. Add a field name to uncertainFields only when its visible value is ambiguous or low-confidence; do not mark fields that are simply absent.

For nome and cognome, prefer explicit labels and machine-readable data. Cognome/Surname/Nom identifies cognome; Nome/Given names/Prénoms identifies nome. When reliable labels are absent, surname is commonly printed first. Preserve compound names and surnames. Normalize birth date to YYYY-MM-DD and codice fiscale to uppercase.

For luogoNascita return the COUNTRY only. Return Italia for an Italian city, otherwise the foreign country name. Use a reliable codice fiscale birth-place code when available.

Search the entire document for numeroVestanet. It is commonly labelled ID and contains exactly two letters plus digits. ID is a label, not part of the value. For example, ID MI876365 means MI876365. Never confuse it with passport, identity-card, pratica, protocollo or codice fiscale numbers. Return it uppercase without spaces.`,
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
    if (extracted.multiplePeople === true) {
      return NextResponse.json(
        {
          error: 'Il documento contiene dati di più persone. Carica un file per una sola persona.',
        },
        { status: 422 }
      )
    }
    extracted.numeroVestanet = normalizeVestanet(extracted.numeroVestanet)
    extracted.luogoNascita = await normalizeBirthCountry(extracted)
    return NextResponse.json({ data: extracted })
  } catch (error) {
    const reference = createSecurityErrorReference()
    logSecurityError('extract-document', error, reference)
    return NextResponse.json(
      { error: PUBLIC_ERROR_MESSAGE, reference },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
