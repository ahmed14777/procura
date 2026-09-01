import { expect, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

function readEnvValue(key: string) {
  const envPath = resolve(process.cwd(), '.env.local')
  if (!existsSync(envPath)) return ''

  const content = readFileSync(envPath, 'utf8')
  const line = content.split(/\r?\n/).find((entry) => entry.trim().startsWith(`${key}=`))

  if (!line) return ''
  const value = line.slice(line.indexOf('=') + 1).trim()
  return value.replace(/^['"]|['"]$/g, '')
}

export function getEnvValue(key: string) {
  return process.env[key] || readEnvValue(key)
}

export const staffPassword = getEnvValue('STAFF_ACCESS_PASSWORD')
export const adminPassword = getEnvValue('ADMIN_ACCESS_PASSWORD')

export function hasStaffPassword() {
  return staffPassword.length > 0
}

export function hasAdminPassword() {
  return adminPassword.length > 0
}

export async function loginWithPassword(page: Page, password: string) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Accesso riservato' }).click()
  await expect(page.getByRole('heading', { name: 'Accesso Professionale' })).toBeVisible()
  await page.locator('input[type="password"][placeholder="Inserisci la password"]').fill(password)
  await page.getByRole('button', { name: 'Accedi' }).click()
  await expect(page.getByRole('button', { name: 'Esci' })).toBeVisible()
}
