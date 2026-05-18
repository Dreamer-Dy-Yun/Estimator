import { expect, test } from '@playwright/test'
import { collectRuntimeErrors, expectNoRuntimeErrors, loginWithDefaultMockUser } from './helpers/app'

test('self analysis drawer opens and closes', async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page)

  await loginWithDefaultMockUser(page, '/dashboard/self')
  const firstRow = page.locator('tbody tr').first()
  await expect(firstRow).toBeVisible()

  await firstRow.click()
  await expect(page.getByRole('complementary')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('complementary')).toBeHidden()

  await expectNoRuntimeErrors(runtimeErrors)
})
