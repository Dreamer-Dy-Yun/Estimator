import { expect, type Page } from '@playwright/test'

export function collectRuntimeErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => {
    errors.push(error.message)
  })
  return errors
}

export async function loginWithDefaultMockUser(page: Page, targetPath = '/dashboard/self') {
  await page.goto(targetPath)

  const loginButton = page.getByRole('button', { name: '로그인' })
  const logoutButton = page.getByRole('button', { name: '로그아웃' })
  if (!(await logoutButton.isVisible())) {
    await expect(loginButton).toBeVisible({ timeout: 15000 })
    await loginButton.click()
  }

  await expect(logoutButton).toBeVisible({ timeout: 15000 })
}

export async function expectNoRuntimeErrors(errors: string[]) {
  expect(errors).toEqual([])
}
