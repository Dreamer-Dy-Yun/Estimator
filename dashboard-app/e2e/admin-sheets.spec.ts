import { expect, test } from '@playwright/test'
import { collectRuntimeErrors, expectNoRuntimeErrors, loginWithDefaultMockUser } from './helpers/app'

test('admin google sheet detail dialog opens and closes', async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page)

  await loginWithDefaultMockUser(page, '/admin')
  await page.getByRole('button', { name: '구글 시트 관리' }).click()
  await expect(page.getByRole('heading', { name: '구글 시트' })).toBeVisible()

  const firstGoogleSheetRow = page.locator('button', { hasText: 'han-a-sheets@mock-project' }).first()
  await expect(firstGoogleSheetRow).toBeVisible()
  await firstGoogleSheetRow.click()

  const dialog = page.getByRole('dialog', { name: '상세 설정' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('이름')).toBeVisible()
  await expect(dialog.getByLabel('시트 주소')).toBeVisible()
  await expect(dialog.getByText('서비스 계정 JSON')).toBeVisible()
  await expect(dialog.getByRole('button', { name: '변경' })).toBeVisible()
  await dialog.getByRole('button', { name: '닫기' }).last().click()
  await expect(dialog).toBeHidden()

  await expectNoRuntimeErrors(runtimeErrors)
})
