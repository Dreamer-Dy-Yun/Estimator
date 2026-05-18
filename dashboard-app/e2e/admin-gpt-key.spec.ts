import { expect, test } from '@playwright/test'
import { collectRuntimeErrors, expectNoRuntimeErrors, loginWithDefaultMockUser } from './helpers/app'

test('관리자 GPT 키 행을 열어 상세 팝업을 확인할 수 있다', async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page)

  await loginWithDefaultMockUser(page, '/admin')
  await page.getByRole('button', { name: 'GPT 키 관리' }).click()
  await expect(page.getByRole('heading', { name: 'GPT 키' })).toBeVisible()

  const firstGptKeyRow = page.locator('button', { hasText: 'GPT AI 코멘트' }).first()
  await expect(firstGptKeyRow).toBeVisible()
  await firstGptKeyRow.click()

  const dialog = page.getByRole('dialog', { name: '상세 설정' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('이름')).toBeVisible()
  await expect(dialog.getByLabel('새 GPT API 키')).toBeVisible()
  await expect(dialog.getByRole('button', { name: '변경' })).toBeVisible()
  await dialog.getByRole('button', { name: '닫기' }).last().click()
  await expect(dialog).toBeHidden()

  await expectNoRuntimeErrors(runtimeErrors)
})
