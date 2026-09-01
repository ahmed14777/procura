import { expect, test } from '@playwright/test'
import { adminPassword, hasAdminPassword, loginWithPassword } from './helpers/auth'

test.describe('Admin license management', () => {
  test.skip(!hasAdminPassword(), 'ADMIN_ACCESS_PASSWORD is required for license management tests.')

  test('creates and toggles a license from admin page', async ({ page }) => {
    const label = `QA-${Date.now()}`

    await loginWithPassword(page, adminPassword)
    await page.getByRole('button', { name: 'Licenze estensione' }).click()
    await expect(page.getByRole('heading', { name: 'Licenze estensione' })).toBeVisible()

    await page.getByLabel('Nome utente o postazione').fill(label)
    await page.getByRole('button', { name: 'Crea licenza' }).click()

    const tokenBox = page.locator('textarea[readonly]')
    await expect(tokenBox).toBeVisible()
    await expect(tokenBox).not.toHaveValue('')

    const row = page.locator('tr', { hasText: label })
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: 'Mostra codice' }).click()
    await expect(row.getByRole('button', { name: 'Copia' })).toBeVisible()

    await row.getByRole('button', { name: 'Disattiva' }).click()
    await expect(row).toContainText('Disattivata')

    await row.getByRole('button', { name: 'Riattiva' }).click()
    await expect(row).toContainText('Attiva')

    page.once('dialog', (dialog) => {
      void dialog.accept()
    })
    await row.getByRole('button', { name: 'Elimina' }).click()
    await expect(page.locator('tr', { hasText: label })).toHaveCount(0)
  })
})
