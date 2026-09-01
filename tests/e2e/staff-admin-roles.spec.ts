import { expect, test } from '@playwright/test'
import {
  adminPassword,
  hasAdminPassword,
  hasStaffPassword,
  loginWithPassword,
  staffPassword,
} from './helpers/auth'

test.describe('Role-based access', () => {
  test.skip(!hasStaffPassword(), 'STAFF_ACCESS_PASSWORD is required for role tests.')

  test('staff login does not expose admin controls', async ({ page }) => {
    await loginWithPassword(page, staffPassword)
    await expect(page.getByRole('button', { name: 'Licenze estensione' })).toHaveCount(0)

    const response = await page.request.get('/api/staff-session')
    expect(response.status()).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      authenticated: true,
      isAdmin: false,
    })
  })

  test('staff cannot open admin license page directly', async ({ page }) => {
    await loginWithPassword(page, staffPassword)
    await page.goto('/extension-licenses')
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('button', { name: 'Esci' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Licenze estensione' })).toHaveCount(0)
  })

  test.skip(!hasAdminPassword(), 'ADMIN_ACCESS_PASSWORD is required for admin tests.')

  test('admin login exposes admin controls and page access', async ({ page }) => {
    await loginWithPassword(page, adminPassword)
    await expect(page.getByRole('button', { name: 'Licenze estensione' })).toBeVisible()

    await page.getByRole('button', { name: 'Licenze estensione' }).click()
    await expect(page).toHaveURL(/\/extension-licenses$/)
    await expect(page.getByRole('heading', { name: 'Licenze estensione' })).toBeVisible()

    const response = await page.request.get('/api/extension-licenses')
    expect(response.status()).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      licenses: expect.any(Array),
    })
  })

  test('admin role persists after page reload', async ({ page }) => {
    test.skip(
      !hasAdminPassword(),
      'ADMIN_ACCESS_PASSWORD is required for session persistence test.'
    )

    await loginWithPassword(page, adminPassword)
    await expect(page.getByRole('button', { name: 'Licenze estensione' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('button', { name: 'Licenze estensione' })).toBeVisible()

    const response = await page.request.get('/api/staff-session')
    expect(response.status()).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      authenticated: true,
      isAdmin: true,
    })
  })

  test('logout clears staff/admin session cookies', async ({ page }) => {
    test.skip(!hasAdminPassword(), 'ADMIN_ACCESS_PASSWORD is required for logout test.')

    await loginWithPassword(page, adminPassword)
    await expect(page.getByRole('button', { name: 'Licenze estensione' })).toBeVisible()

    await page.getByRole('button', { name: 'Esci' }).click()
    await expect(page.getByRole('button', { name: 'Accesso riservato' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Licenze estensione' })).toHaveCount(0)

    const response = await page.request.get('/api/staff-session')
    expect(response.status()).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      authenticated: false,
      isAdmin: false,
    })
  })
})
