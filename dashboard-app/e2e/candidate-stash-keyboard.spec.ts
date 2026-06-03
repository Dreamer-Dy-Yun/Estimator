import { expect, test } from '@playwright/test'
import { collectRuntimeErrors, expectNoRuntimeErrors, loginWithDefaultMockUser } from './helpers/app'

test('@candidate @keyboard candidate stash inner list keyboard focus opens drawer', async ({ page }: PlaywrightTestArgs & PlaywrightTestOptions & PlaywrightWorkerArgs & PlaywrightWorkerOptions) : Promise<void> => {
  const runtimeErrors: string[] = collectRuntimeErrors(page)

  await loginWithDefaultMockUser(page, '/dashboard/snapshot-confirm')

  const firstStashOpenButton: Locator = page.locator('button', { hasText: '등록 상품' }).first()
  await expect(firstStashOpenButton).toBeVisible()
  await firstStashOpenButton.click()

  const detailDialog: Locator = page.getByRole('dialog')
  const orderList: Locator = detailDialog.getByRole('list')
  const firstRow: Locator = detailDialog.getByRole('listitem').first()
  await expect(firstRow).toBeVisible()

  await orderList.click({ position: { x: 8, y: 8 } })
  await page.keyboard.press('ArrowDown')
  await expect(firstRow).toHaveAttribute('aria-current', 'true')

  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('complementary')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('complementary')).toBeHidden()

  await expectNoRuntimeErrors(runtimeErrors)
})
