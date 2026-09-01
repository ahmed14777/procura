import { expect, test } from '@playwright/test'

test.describe('Admin guard checks', () => {
  test('redirects unauthenticated users from admin page', async ({ page }) => {
    await page.goto('/extension-licenses')
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('button', { name: 'Accesso riservato' })).toBeVisible()
  })

  test('blocks unauthenticated admin API requests', async ({ request }) => {
    const response = await request.get('/api/extension-licenses')
    expect(response.status()).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      error: expect.any(String),
    })
  })

  test('blocks unauthenticated write actions on admin license APIs', async ({ request }) => {
    const createResponse = await request.post('/api/extension-licenses', {
      data: { name: 'blocked-without-admin' },
    })
    expect(createResponse.status()).toBe(401)

    const licenseId = '00000000-0000-0000-0000-000000000000'
    const patchResponse = await request.patch(`/api/extension-licenses/${licenseId}`, {
      data: { active: false },
    })
    expect(patchResponse.status()).toBe(401)

    const revealResponse = await request.post(`/api/extension-licenses/${licenseId}/reveal`)
    expect(revealResponse.status()).toBe(401)

    const verifyResponse = await request.post('/api/extension-licenses/verify', {
      data: { token: 'e2d_invalid' },
    })
    expect(verifyResponse.status()).toBe(401)

    const deleteResponse = await request.delete(`/api/extension-licenses/${licenseId}`)
    expect(deleteResponse.status()).toBe(401)
  })

  test('validates Stripe status endpoint input without calling external services', async ({
    request,
  }) => {
    const response = await request.get('/api/stripe/checkout')
    expect(response.status()).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'sessionId mancante',
    })
  })

  test('validates generate-client-email required fields', async ({ request }) => {
    const response = await request.post('/api/generate-client-email', {
      data: {},
    })
    expect(response.status()).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Parametri mancanti.',
    })
  })
})
