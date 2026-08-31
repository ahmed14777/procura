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
import {
  PUBLIC_ERROR_MESSAGE,
  createSecurityErrorReference,
  logSecurityError,
} from '@/lib/security'
import { consumeRateLimit } from '@/lib/rateLimit'
import { PROJECT_BRANDING } from '@/config/content'
import { CLIENT_CONTRIBUTION } from '@/config/business'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_PRICE_ID_CLIENT = process.env.STRIPE_PRICE_ID_CLIENT
const STRIPE_FALLBACK_AMOUNT_CENTS = Number.parseInt(
  process.env.STRIPE_FALLBACK_AMOUNT_CENTS || '500',
  10
)
interface CheckoutRequest {
  mode: 'client' | 'lawyer'
  customerEmail?: string
  clientName?: string
  clientPhone?: string
  amountCents?: number
}

interface StripeCheckoutResponse {
  id: string
  client_secret?: string
  url?: string
}

function getCheckoutBaseUrl(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' && process.env.BASE_URL) {
    return process.env.BASE_URL.replace(/\/$/, '')
  }

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const host = forwardedHost || request.headers.get('host') || 'localhost:3000'
  const protocol =
    request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '')

  return `${protocol}://${host}`
}

/**
 * Create Stripe checkout session using direct API call
 */
async function createStripeCheckoutSession(
  email: string,
  clientName: string,
  clientPhone: string,
  amountCents: number | undefined,
  baseUrl: string
): Promise<StripeCheckoutResponse> {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured')
  }

  const checkoutData = new URLSearchParams({
    mode: 'payment',
    customer_creation: 'always',
    success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/`,
    'payment_method_types[0]': 'card',
    'line_items[0][quantity]': '1',
  })

  if (email) checkoutData.set('customer_email', email)
  if (clientName) checkoutData.set('client_reference_id', clientName)
  if (clientPhone) checkoutData.set('metadata[client_phone]', clientPhone)

  if (amountCents) {
    checkoutData.set('line_items[0][price_data][currency]', 'eur')
    checkoutData.set('line_items[0][price_data][unit_amount]', String(amountCents))
    checkoutData.set(
      'line_items[0][price_data][product_data][name]',
      PROJECT_BRANDING.stripeContributionProductName
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
    metadata?: { client_phone?: string }
  }
}

export async function POST(request: NextRequest) {
  const rateLimit = await consumeRateLimit({
    request,
    bucket: 'stripe-checkout-post',
    limit: 10,
    windowSeconds: 10 * 60,
  })

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Troppe richieste. Riprova tra poco.',
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

  try {
    // Validate Stripe configuration
    if (!STRIPE_SECRET_KEY) {
      const reference = createSecurityErrorReference()
      logSecurityError(
        'stripe-checkout:POST:missing-secret',
        new Error('STRIPE_SECRET_KEY missing'),
        reference
      )
      return NextResponse.json(
        {
          error: PUBLIC_ERROR_MESSAGE,
          reference,
        },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
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

    if (body.amountCents !== undefined && body.amountCents !== CLIENT_CONTRIBUTION.cents) {
      return NextResponse.json(
        { error: `Il contributo previsto è di ${CLIENT_CONTRIBUTION.euro}€.` },
        { status: 400 }
      )
    }

    if (!STRIPE_PRICE_ID_CLIENT && !Number.isFinite(STRIPE_FALLBACK_AMOUNT_CENTS)) {
      const reference = createSecurityErrorReference()
      logSecurityError(
        'stripe-checkout:POST:missing-pricing-config',
        new Error('Stripe pricing not configured'),
        reference
      )
      return NextResponse.json(
        { error: PUBLIC_ERROR_MESSAGE, reference },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // Create checkout session
    const session = await createStripeCheckoutSession(
      body.customerEmail || '',
      body.clientName || '',
      body.clientPhone || '',
      body.amountCents,
      getCheckoutBaseUrl(request)
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
    const reference = createSecurityErrorReference()
    logSecurityError('stripe-checkout:POST', error, reference)
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

/**
 * GET handler for checking payment status
 */
export async function GET(request: NextRequest) {
  const rateLimit = await consumeRateLimit({
    request,
    bucket: 'stripe-checkout-get',
    limit: 30,
    windowSeconds: 10 * 60,
  })

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Troppe richieste. Riprova tra poco.',
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
        clientPhone: session.metadata?.client_phone || null,
      },
      { status: 200 }
    )
  } catch (error) {
    const reference = createSecurityErrorReference()
    logSecurityError('stripe-checkout:GET', error, reference)
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
