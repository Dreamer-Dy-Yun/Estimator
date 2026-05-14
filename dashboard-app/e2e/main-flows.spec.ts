import { expect, test } from '@playwright/test'
import { collectRuntimeErrors, expectNoRuntimeErrors, loginWithDefaultMockUser } from './helpers/app'

test.describe('주요 업무 흐름', () => {
  test('로그인 후 주요 탭과 관리자 하위 탭을 이동할 수 있다', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page)

    await loginWithDefaultMockUser(page, '/dashboard/self')
    await expect(page).toHaveURL(/\/dashboard\/self$/)
    await expect(page.getByRole('link', { name: '자사 분석' })).toBeVisible()
    await expect(page.getByText('총 판매액')).toBeVisible()

    await page.getByRole('link', { name: '경쟁사 분석' }).click()
    await expect(page).toHaveURL(/\/dashboard\/competitor$/)
    await expect(page.getByText('경쟁·자사 판매량 비교')).toBeVisible()

    await page.getByRole('link', { name: '오더 후보군' }).click()
    await expect(page).toHaveURL(/\/dashboard\/snapshot-confirm$/)
    await expect(page.getByText('엑셀 업로드')).toBeVisible()

    await page.getByRole('link', { name: '관리자' }).click()
    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.getByRole('button', { name: '사용자 관리' })).toBeVisible()

    await page.getByRole('button', { name: 'GPT 키 관리' }).click()
    await expect(page.getByRole('heading', { name: 'GPT 키' })).toBeVisible()

    await expectNoRuntimeErrors(runtimeErrors)
  })

  test('자사 분석 리스트에서 1차 드로워를 열고 닫을 수 있다', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page)

    await loginWithDefaultMockUser(page, '/dashboard/self')
    const firstRow = page.locator('tbody tr').first()
    await expect(firstRow).toBeVisible()

    await firstRow.click()
    await expect(page.getByText('상품 인사이트')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByText('상품 인사이트')).toBeHidden()

    await expectNoRuntimeErrors(runtimeErrors)
  })

  test('분석 리스트에서 선택 상품 후보군 담기 모달을 열 수 있다', async ({ page }) => {
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

  test('오더 후보군 상세에서 데이터 참조 기간과 추천 진입 버튼을 확인할 수 있다', async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page)

    await loginWithDefaultMockUser(page, '/dashboard/snapshot-confirm')
    await expect(page.getByText('엑셀 업로드')).toBeVisible()

    const firstStashOpenButton = page.locator('button', { hasText: '등록 상품' }).first()
    await expect(firstStashOpenButton).toBeVisible()
    await firstStashOpenButton.click()

    const detailDialog = page.getByRole('dialog')
    await expect(detailDialog.getByLabel('데이터 참조 기간')).toBeVisible()
    await expect(detailDialog.getByRole('button', { name: '추천 보기' })).toBeVisible()
    await detailDialog.getByRole('button', { name: '닫기' }).click()
    await expect(detailDialog).toBeHidden()

    await expectNoRuntimeErrors(runtimeErrors)
  })

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
    await dialog.getByRole('button', { name: '닫기' }).last().click()
    await expect(dialog).toBeHidden()

    await expectNoRuntimeErrors(runtimeErrors)
  })
})
