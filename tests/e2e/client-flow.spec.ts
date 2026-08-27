import { expect, test } from '@playwright/test'
import { CLIENT_CONTRIBUTION } from '../../src/config/business'

test.describe('Client payment-first flow', () => {
  test('shows the service explanation and requests only a phone number before payment', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(
      page.getByRole('heading', { name: 'إيميل صح لمحكمتك يوفر عليك كتير' })
    ).toBeVisible()
    await expect(page.getByText(`${CLIENT_CONTRIBUTION.euro}€`)).toBeVisible()
    await expect(page.getByLabel('رقم الهاتف / Numero di telefono')).toBeVisible()
    await expect(page.locator('input[name="nome"]')).toHaveCount(0)
    await expect(page.locator('input[type="file"]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'ساهم الآن / Contribuisci ora' })).toBeVisible()

    await expect(page.getByText('دورنا / Il nostro ruolo:')).toBeHidden()
    await page.getByText('التفاصيل / Dettagli del servizio').click()
    await expect(page.getByText('دورنا / Il nostro ruolo:')).toBeVisible()
  })
})
