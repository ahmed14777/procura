import { expect, test } from '@playwright/test'
import { adminPassword, hasAdminPassword, loginWithPassword } from './helpers/auth'

test.describe('Admin license management', () => {
  test.skip(!hasAdminPassword(), 'ADMIN_ACCESS_PASSWORD is required for license management tests.')

  test('creates, verifies, edits, and toggles a license from admin page', async ({ page }) => {
    const label = `QA-${Date.now()}`
    const updatedLabel = `${label}-mod`

    await loginWithPassword(page, adminPassword)
    await page.getByRole('button', { name: 'Licenze estensione' }).click()
    await expect(page.getByRole('heading', { name: 'Licenze estensione' })).toBeVisible()

    await page.getByLabel('Nome utente o postazione').fill(label)
    await page.getByRole('button', { name: 'Crea licenza' }).click()

    const tokenBox = page.locator('textarea[readonly]')
    await expect(tokenBox).toBeVisible()
    await expect(tokenBox).not.toHaveValue('')
    const createdToken = await tokenBox.inputValue()

    await page.getByPlaceholder('Incolla qui il codice e2d_...').fill(createdToken)
    await page.getByRole('button', { name: 'Verifica' }).click()
    await expect(page.getByText('Codice valido:')).toBeVisible()

    const row = page.locator('tr', { hasText: label })
    await expect(row).toBeVisible()

    await row.getByRole('button', { name: 'Modifica' }).click()
    const inlineEditInput = page.locator('tbody input').first()
    await expect(inlineEditInput).toBeVisible()
    await inlineEditInput.fill(updatedLabel)
    await page.getByRole('button', { name: 'Salva' }).click()
    await expect(page.locator('tr', { hasText: updatedLabel })).toBeVisible()

    const updatedRow = page.locator('tr', { hasText: updatedLabel })
    await expect(updatedRow).toBeVisible()
    await updatedRow.getByRole('button', { name: 'Mostra codice' }).click()
    await expect(updatedRow.getByRole('button', { name: 'Copia' })).toBeVisible()

    await updatedRow.getByRole('button', { name: 'Disattiva' }).click()
    await expect(updatedRow).toContainText('Disattivata')

    await updatedRow.getByRole('button', { name: 'Riattiva' }).click()
    await expect(updatedRow).toContainText('Attiva')

    page.once('dialog', (dialog) => {
      void dialog.accept()
    })
    await updatedRow.getByRole('button', { name: 'Elimina' }).click()
    await expect(page.locator('tr', { hasText: updatedLabel })).toHaveCount(0)
  })
})
