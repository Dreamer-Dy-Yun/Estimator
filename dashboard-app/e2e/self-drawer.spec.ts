import { expect, test } from '@playwright/test'
import { collectRuntimeErrors, expectNoRuntimeErrors, loginWithDefaultMockUser } from './helpers/app'

test('@smoke @drawer self analysis drawer opens and closes', async ({ page }: PlaywrightTestArgs & PlaywrightTestOptions & PlaywrightWorkerArgs & PlaywrightWorkerOptions) : Promise<void> => {
  const runtimeErrors: string[] = collectRuntimeErrors(page)

  await loginWithDefaultMockUser(page, '/dashboard/self')
  const firstRow: Locator = page.locator('tbody tr').first()
  await expect(firstRow).toBeVisible()

  await firstRow.click()
  await expect(page.getByRole('complementary')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('complementary')).toBeHidden()

  await expectNoRuntimeErrors(runtimeErrors)
})
