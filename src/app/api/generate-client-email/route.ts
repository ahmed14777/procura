/**
 * Generate Client Email Draft API
 * Converts form data and document into an email-ready HTML format
 *
 * POST /api/generate-client-email
 * Body: {
 *   formData: ProcuraFormData,
 *   documentFileName: string,
 *   documentBase64?: string
 * }
 *
 * Returns: {
 *   emailHtml: string,
 *   emailText: string,
 *   subject: string,
 *   recipientEmail: string,
 *   pdfUrl?: string,
 *   error?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import type { ProcuraFormData } from '@/lib/schema'
import { resolvePec } from '@/lib/pecResolver'
import {
  PUBLIC_ERROR_MESSAGE,
  createSecurityErrorReference,
  logSecurityError,
} from '@/lib/security'

interface EmailGenerationRequest {
  formData: ProcuraFormData
  documentFileName: string
  paymentSessionId: string
  documentBase64?: string // Base64-encoded document
}

interface EmailGenerationResponse {
  emailHtml: string
  emailText: string
  subject: string
  senderName: string
  recipientEmail: string
  commissione: string
  pdfUrl?: string
  error?: string
}

function getRegularInstitutionEmail(pec: string): string {
  return pec.replace(/@pec\.interno\.it$/i, '@interno.it')
}

async function isPaidStripeSession(sessionId: string): Promise<boolean> {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY not configured')
  }

  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${stripeSecretKey}` },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Stripe API error: ${response.status}`)
  }

  const session = (await response.json()) as { payment_status?: string }
  return session.payment_status === 'paid'
}

/**
 * Generate HTML email template for client requests
 */
function generateEmailHtml(formData: ProcuraFormData, commissione: string): string {
  const { nome, cognome, codiceFiscale, numeroVestanet, telefono } = formData

  return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px 20px;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 20px;
      color: #333;
    }
    .message {
      background-color: #f9f9f9;
      padding: 15px;
      border-left: 4px solid #1e3c72;
      margin: 20px 0;
      font-size: 14px;
      line-height: 1.8;
    }
    .details-section {
      margin: 25px 0;
    }
    .details-section h3 {
      color: #1e3c72;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      border-bottom: 2px solid #1e3c72;
      padding-bottom: 8px;
    }
    .detail-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
      font-size: 14px;
    }
    .detail-item:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #555;
      min-width: 150px;
    }
    .detail-value {
      color: #333;
      text-align: right;
      word-break: break-all;
    }
    .attachment-info {
      background-color: #f0f7ff;
      border: 1px solid #b3d9ff;
      border-radius: 6px;
      padding: 15px;
      margin: 20px 0;
      font-size: 13px;
      color: #0066cc;
    }
    .attachment-info strong {
      display: block;
      margin-bottom: 8px;
      color: #0052a3;
    }
    .closing {
      margin-top: 25px;
      font-size: 14px;
      color: #555;
      line-height: 1.8;
    }
    .signature {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 13px;
      color: #666;
    }
    .footer {
      background-color: #f5f5f5;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #999;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📧 Richiesta di Aggiornamento</h1>
    </div>

    <div class="content">
      <p class="greeting">Alla cortese attenzione della Commissione Territoriale di ${commissione},</p>

      <div class="message">
        <p>Le scrivo per chiedere gentilmente un aggiornamento sulla mia domanda di asilo.</p>

        <p>Sono in attesa di ulteriori comunicazioni riguardo al fissaggio di un appuntamento per audizione o una decisione relativa alla mia richiesta.</p>

        <p>Sarei molto grato se poteste fornirmi qualsiasi informazione disponibile al riguardo, poiché non ho ancora ricevuto notizie in merito.</p>
      </div>

      <div class="details-section">
        <h3>📋 Riepilogo dei Dati</h3>
        <div class="detail-item">
          <span class="detail-label">1. Nome:</span>
          <span class="detail-value">${nome}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">2. Cognome:</span>
          <span class="detail-value">${cognome}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">3. Codice Fiscale:</span>
          <span class="detail-value">${codiceFiscale}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">4. Vestanet:</span>
          <span class="detail-value">${numeroVestanet}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">5. Telefono:</span>
          <span class="detail-value">${telefono}</span>
        </div>
      </div>

      <div class="attachment-info">
        <strong>📎 Allegato: Documentazione di Supporto</strong>
        Ho allegato alla presente una copia della documentazione di supporto per vostra verifica.
      </div>

      <div class="closing">
        <p>Vi ringrazio di cuore per la vostra attenzione e il vostro tempo.</p>
        <p>Rimango in attesa di un vostro gentile riscontro.</p>
      </div>

      <div class="signature">
        <p><strong>Cordiali saluti,</strong></p>
        <p>${nome} ${cognome}</p>
        <p style="margin: 5px 0; color: #999;">
          <small>Data: ${new Date().toLocaleDateString('it-IT')}</small>
        </p>
      </div>
    </div>

    <div class="footer">
      <p>Questo messaggio è stato generato automaticamente. Si prega di non rispondere direttamente a questa email.</p>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Generate plain text email
 */
function generateEmailText(formData: ProcuraFormData, commissione: string): string {
  const { nome, cognome, codiceFiscale, numeroVestanet, telefono } = formData

  return `
Alla cortese attenzione della Commissione Territoriale di ${commissione},

Le scrivo per chiedere gentilmente un aggiornamento sulla mia domanda di asilo.

Sono in attesa di ulteriori comunicazioni riguardo al fissaggio di un appuntamento per audizione o una decisione relativa alla mia richiesta.

Sarei molto grato se poteste fornirmi qualsiasi informazione disponibile al riguardo, poiché non ho ancora ricevuto notizie in merito.

Riepilogo dei miei dettagli:

1. Nome: ${nome}
2. Cognome: ${cognome}
3. Codice Fiscale: ${codiceFiscale}
4. Vestanet: ${numeroVestanet}
5. Telefono: ${telefono}

Ho allegato alla presente una copia della documentazione di supporto per vostra verifica.

Vi ringrazio di cuore per la vostra attenzione e il vostro tempo.

Rimango in attesa di un vostro gentile riscontro.

Cordiali saluti,
${nome} ${cognome}

---
Data: ${new Date().toLocaleDateString('it-IT')}
  `.trim()
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EmailGenerationRequest

    // Validate input
    if (!body.formData || !body.documentFileName || !body.paymentSessionId) {
      return NextResponse.json({ error: 'Parametri mancanti.' }, { status: 400 })
    }

    const isPaid = await isPaidStripeSession(body.paymentSessionId)
    if (!isPaid) {
      return NextResponse.json({ error: 'Pagamento non verificato.' }, { status: 402 })
    }

    const formData = body.formData
    const pecResolution = resolvePec(formData.sedeSelezionata)
    if (!pecResolution.success) {
      return NextResponse.json({ error: pecResolution.error }, { status: 422 })
    }
    const recipientEmail = getRegularInstitutionEmail(pecResolution.pec)

    // Generate email content
    const emailHtml = generateEmailHtml(formData, pecResolution.commissione)
    const emailText = generateEmailText(formData, pecResolution.commissione)
    const subject = `Richiesta di Aggiornamento - Vestanet: ${formData.numeroVestanet} - ${formData.codiceFiscale}`
    const senderName = `${formData.nome} ${formData.cognome}`

    // Return email data
    const response: EmailGenerationResponse = {
      emailHtml,
      emailText,
      subject,
      senderName,
      recipientEmail,
      commissione: pecResolution.commissione,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    const reference = createSecurityErrorReference()
    logSecurityError('generate-client-email:POST', error, reference)
    return NextResponse.json(
      {
        error: PUBLIC_ERROR_MESSAGE,
        reference,
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }
}
