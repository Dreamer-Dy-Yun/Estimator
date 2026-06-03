import { expect, type Page } from '@playwright/test'

export function collectRuntimeErrors(page: Page) : string[] {
  const errors: string[] = []
  page.on('console', (message: ConsoleMessage) : void => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error: Error) : void => {
    errors.push(error.message)
  })
  return errors
}

export async function loginWithDefaultMockUser(page: Page, targetPath: string = '/dashboard/self') : Promise<void> {
  await page.goto(targetPath)

  const loginButton: Locator = page.getByRole('button', { name: '로그인' })
  const logoutButton: Locator = page.getByRole('button', { name: '로그아웃' })
  if (!(await logoutButton.isVisible())) {
    await expect(loginButton).toBeVisible({ timeout: 15000 })
    await loginButton.click()
  }

  await expect(logoutButton).toBeVisible({ timeout: 15000 })
}

export async function expectNoRuntimeErrors(errors: string[]) : Promise<void> {
  expect(errors).toEqual([])
}
