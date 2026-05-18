import { expect, test } from '@playwright/test'
import { collectRuntimeErrors, expectNoRuntimeErrors, loginWithDefaultMockUser } from './helpers/app'

test('header inventory arrival collection shows summary toast', async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page)

  await loginWithDefaultMockUser(page, '/dashboard/self')

  await page.getByRole('button', { name: '입고예정일 수집' }).click()

  await expect(page.getByText(/입고예정일 \d+건 수집 완료/)).toBeVisible()
  await expectNoRuntimeErrors(runtimeErrors)
})
