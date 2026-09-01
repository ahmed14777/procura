import { expect, test } from '@playwright/test'
import { CLIENT_CONTRIBUTION } from '../../src/config/business'
import { getEnvValue } from './helpers/auth'

const runLiveStripe = process.env.E2E_STRIPE_LIVE === '1'
const stripeSecret = getEnvValue('STRIPE_SECRET_KEY')

function randomSourceIp() {
  return `203.0.113.${Math.floor(Math.random() * 200) + 10}`
}

test.describe('Stripe live integration @live', () => {
  test.skip(
    !runLiveStripe || !stripeSecret,
    'Set E2E_STRIPE_LIVE=1 and STRIPE_SECRET_KEY to run live Stripe integration tests.'
  )

  test('creates checkout session and retrieves payment status', async ({ request }) => {
    const source = randomSourceIp()
    const checkoutResponse = await request.post('/api/stripe/checkout', {
      headers: { 'x-forwarded-for': source },
      data: {
        mode: 'client',
        customerEmail: `qa+${Date.now()}@example.com`,
        clientName: 'QA Live Stripe',
        clientPhone: '+393331112233',
        amountCents: CLIENT_CONTRIBUTION.cents,
      },
    })

    expect(checkoutResponse.status()).toBe(200)
    const checkoutData = (await checkoutResponse.json()) as { sessionId: string; url?: string }
    expect(checkoutData.sessionId).toMatch(/^cs_/)
    expect(checkoutData.url).toBeTruthy()

    const statusResponse = await request.get(
      `/api/stripe/checkout?sessionId=${encodeURIComponent(checkoutData.sessionId)}`,
      {
        headers: { 'x-forwarded-for': source },
      }
    )

    expect(statusResponse.status()).toBe(200)
    const statusData = (await statusResponse.json()) as {
      id: string
      status: string
      paid: boolean
    }

    expect(statusData.id).toBe(checkoutData.sessionId)
    expect(typeof statusData.status).toBe('string')
    expect(typeof statusData.paid).toBe('boolean')
  })

  test('rejects generate-client-email when payment is not completed', async ({ request }) => {
    const source = randomSourceIp()
    const checkoutResponse = await request.post('/api/stripe/checkout', {
      headers: { 'x-forwarded-for': source },
      data: {
        mode: 'client',
        customerEmail: `qa+mail-${Date.now()}@example.com`,
        clientName: 'QA Email Payment Check',
        clientPhone: '+393331112233',
        amountCents: CLIENT_CONTRIBUTION.cents,
      },
    })

    expect(checkoutResponse.status()).toBe(200)
    const checkoutData = (await checkoutResponse.json()) as { sessionId: string }

    const emailResponse = await request.post('/api/generate-client-email', {
      headers: { 'x-forwarded-for': source },
      data: {
        formData: { placeholder: true },
        documentFileName: 'document.pdf',
        paymentSessionId: checkoutData.sessionId,
      },
    })

    expect(emailResponse.status()).toBe(402)
    await expect(emailResponse.json()).resolves.toMatchObject({
      error: 'Pagamento non verificato.',
    })
  })
})
