import { expect, test } from '@playwright/test'
import { collectRuntimeErrors, expectNoRuntimeErrors, loginWithDefaultMockUser } from './helpers/app'

test('오더 후보군 상세에서 조회 카드, 작업 카드, 추천 진입을 확인할 수 있다', async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page)

  await loginWithDefaultMockUser(page, '/dashboard/snapshot-confirm')
  await expect(page.getByText('엑셀 업로드')).toBeVisible()

  const firstStashOpenButton = page.locator('button', { hasText: '등록 상품' }).first()
  await expect(firstStashOpenButton).toBeVisible()
  await firstStashOpenButton.click()

  const detailDialog = page.getByRole('dialog')
  await expect(detailDialog.getByText('조회 데이터 기간')).toBeVisible()
  await expect(detailDialog.getByLabel('데이터 참조 시작일')).toBeVisible()
  await expect(detailDialog.getByLabel('데이터 참조 종료일')).toBeVisible()
  await expect(detailDialog.getByRole('button', { name: '조회' })).toBeVisible()
  await expect(detailDialog.getByRole('button', { name: '상세 일괄확정' })).toBeDisabled()
  await expect(detailDialog.getByRole('button', { name: '상세확정 일괄해제' })).toBeVisible()
  await expect(detailDialog.getByRole('button', { name: '추천 보기' })).toBeVisible()

  await detailDialog.getByRole('button', { name: '닫기' }).click()
  await expect(detailDialog).toBeHidden()

  await expectNoRuntimeErrors(runtimeErrors)
})
