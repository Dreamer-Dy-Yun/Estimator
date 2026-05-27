import { expect, test } from '@playwright/test'
import { collectRuntimeErrors, expectNoRuntimeErrors, loginWithDefaultMockUser } from './helpers/app'

test('@candidate @analysis 분석 리스트에서 선택 상품 후보군 담기 모달을 열 수 있다', async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page)

  await loginWithDefaultMockUser(page, '/dashboard/competitor')
  const firstRowCheckbox = page.locator('tbody input[type="checkbox"]').first()
  await expect(firstRowCheckbox).toBeVisible()
  await firstRowCheckbox.check()

  const bulkAddButton = page.getByRole('button', { name: '선택한 물품을 후보군으로' })
  await expect(bulkAddButton).toBeEnabled()
  await bulkAddButton.click()

  const dialog = page.getByRole('dialog', { name: '선택 상품 후보군 담기' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('선택 상품 1개')).toBeVisible()
  await dialog.getByRole('button', { name: '취소' }).click()
  await expect(dialog).toBeHidden()

  await expectNoRuntimeErrors(runtimeErrors)
})
