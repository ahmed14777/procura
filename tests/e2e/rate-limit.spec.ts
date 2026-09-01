import { expect, test } from '@playwright/test'
import { hasStaffPassword } from './helpers/auth'

test.describe('Rate limiting', () => {
  test.skip(!hasStaffPassword(), 'STAFF_ACCESS_PASSWORD is required for login rate-limit test.')

  test('blocks repeated invalid staff-login attempts from same source', async ({ request }) => {
    const source = `198.51.100.${Math.floor(Math.random() * 200) + 10}`

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await request.post('/api/staff-login', {
        headers: { 'x-forwarded-for': source },
        data: { password: `wrong-password-${attempt}` },
      })

      if (attempt < 5) {
        expect(response.status()).toBe(401)
      } else {
        expect(response.status()).toBe(429)
      }
    }

    const blockedResponse = await request.post('/api/staff-login', {
      headers: { 'x-forwarded-for': source },
      data: { password: 'another-wrong-password' },
    })
    expect(blockedResponse.status()).toBe(429)
  })

  test('limits excessive stripe status polling requests', async ({ request }) => {
    const source = `203.0.113.${Math.floor(Math.random() * 200) + 10}`
    let lastStatus = 0

    for (let attempt = 1; attempt <= 31; attempt += 1) {
      const response = await request.get('/api/stripe/checkout', {
        headers: { 'x-forwarded-for': source },
      })
      lastStatus = response.status()

      if (attempt <= 30) {
        expect(response.status()).toBe(400)
      }
    }

    expect(lastStatus).toBe(429)
  })
})
