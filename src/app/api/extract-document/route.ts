import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])

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
        'Complete Vestanet reference including its two-letter prefix and all following digits, for example AB12345. Empty if not clearly visible.',
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

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY non è configurata sul server.' },
      { status: 503 }
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

Normalize birth date to YYYY-MM-DD and codice fiscale to uppercase. numeroVestanet is a case/reference number, not a passport or identity-card number. A valid numeroVestanet starts with exactly two letters followed by digits. The two initial letters are part of the number and must always be preserved: extract AB12345, never only 12345. Return it uppercase and without spaces.`,
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

    return NextResponse.json({ data: JSON.parse(outputText) })
  } catch (error) {
    console.error('Document extraction error', error)
    return NextResponse.json({ error: "Errore durante l'analisi del documento." }, { status: 500 })
  }
}
