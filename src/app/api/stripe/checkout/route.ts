/**
 * Stripe Checkout API
 * Creates a Stripe checkout session for client email generation
 *
 * Uses direct HTTP calls to Stripe API (no package required)
 *
 * POST /api/stripe/checkout
 * Body: {
 *   mode: "client" | "lawyer",
 *   customerEmail: string,
 *   clientName: string
 * }
 *
 * Returns: {
 *   sessionId: string,
 *   clientSecret?: string,
 *   url?: string,
 *   error?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_PRICE_ID_CLIENT = process.env.STRIPE_PRICE_ID_CLIENT
const STRIPE_FALLBACK_AMOUNT_CENTS = Number.parseInt(
  process.env.STRIPE_FALLBACK_AMOUNT_CENTS || '500',
  10
)
const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : process.env.BASE_URL || 'http://localhost:3000'

interface CheckoutRequest {
  mode: 'client' | 'lawyer'
  customerEmail?: string
  clientName?: string
  amountCents?: number
}

interface StripeCheckoutResponse {
  id: string
  client_secret?: string
  url?: string
}

/**
 * Create Stripe checkout session using direct API call
 */
async function createStripeCheckoutSession(
  email: string,
  clientName: string,
  amountCents?: number
): Promise<StripeCheckoutResponse> {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured')
  }

  const checkoutData = new URLSearchParams({
    mode: 'payment',
    customer_creation: 'always',
    success_url: `${BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/`,
    'payment_method_types[0]': 'card',
    'line_items[0][quantity]': '1',
  })

  if (email) checkoutData.set('customer_email', email)
  if (clientName) checkoutData.set('client_reference_id', clientName)

  if (amountCents) {
    checkoutData.set('line_items[0][price_data][currency]', 'eur')
    checkoutData.set('line_items[0][price_data][unit_amount]', String(amountCents))
    checkoutData.set(
      'line_items[0][price_data][product_data][name]',
      'Contributo volontario Easy2Do'
    )
  } else if (STRIPE_PRICE_ID_CLIENT) {
    checkoutData.set('line_items[0][price]', STRIPE_PRICE_ID_CLIENT)
  } else {
    checkoutData.set('line_items[0][price_data][currency]', 'eur')
    checkoutData.set('line_items[0][price_data][unit_amount]', String(STRIPE_FALLBACK_AMOUNT_CENTS))
    checkoutData.set(
      'line_items[0][price_data][product_data][name]',
      'Richiesta aggiornamento pratica'
    )
  }

  // Make direct HTTP request to Stripe API
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: checkoutData.toString(),
  })

  if (!response.ok) {
    const errorData = (await response.json()) as { error?: { message: string } }
    throw new Error(errorData.error?.message || `Stripe API error: ${response.status}`)
  }

  const sessionData = (await response.json()) as StripeCheckoutResponse
  return sessionData
}

/**
 * Check payment status using Stripe API
 */
async function getStripeSession(sessionId: string) {
  if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured')

  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
  })
  if (!response.ok) throw new Error(`Stripe API error: ${response.status}`)

  return (await response.json()) as {
    payment_status?: string
    customer_email?: string | null
    customer_details?: { email?: string | null }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate Stripe configuration
    if (!STRIPE_SECRET_KEY) {
      return NextResponse.json(
        {
          error: "Stripe non configurato. Contatta l'amministratore. (STRIPE_SECRET_KEY mancante)",
        },
        { status: 500 }
      )
    }

    const body = (await request.json()) as CheckoutRequest

    // Validate input
    if (!body.mode) {
      return NextResponse.json({ error: 'Parametro mancante: mode' }, { status: 400 })
    }

    if (body.mode !== 'client') {
      return NextResponse.json(
        { error: "Solo modalità 'client' è supportata al momento" },
        { status: 400 }
      )
    }

    if (body.amountCents !== undefined && body.amountCents !== 199) {
      return NextResponse.json({ error: 'Il contributo previsto è di 1,99€.' }, { status: 400 })
    }

    if (!STRIPE_PRICE_ID_CLIENT && !Number.isFinite(STRIPE_FALLBACK_AMOUNT_CENTS)) {
      return NextResponse.json(
        { error: 'Configura STRIPE_PRICE_ID_CLIENT o STRIPE_FALLBACK_AMOUNT_CENTS.' },
        { status: 500 }
      )
    }

    // Create checkout session
    const session = await createStripeCheckoutSession(
      body.customerEmail || '',
      body.clientName || '',
      body.amountCents
    )

    if (!session.url) {
      throw new Error('Stripe session creata senza URL di checkout')
    }

    return NextResponse.json(
      {
        sessionId: session.id,
        clientSecret: session.client_secret,
        url: session.url,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Errore durante la creazione della sessione di pagamento',
      },
      { status: 500 }
    )
  }
}

/**
 * GET handler for checking payment status
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId mancante' }, { status: 400 })
    }

    const session = await getStripeSession(sessionId)
    const paymentStatus = session.payment_status || 'unpaid'

    return NextResponse.json(
      {
        status: paymentStatus,
        id: sessionId,
        paid: paymentStatus === 'paid',
        customerEmail: session.customer_email || session.customer_details?.email || null,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Stripe session check error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Errore durante la verifica della sessione',
      },
      { status: 500 }
    )
  }
}
