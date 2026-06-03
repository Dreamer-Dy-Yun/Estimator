import { expect, test } from '@playwright/test'
import { collectRuntimeErrors, expectNoRuntimeErrors, loginWithDefaultMockUser } from './helpers/app'

test('@smoke @navigation 로그인 후 주요 라우트와 관리자 탭을 이동할 수 있다', async ({ page }: PlaywrightTestArgs & PlaywrightTestOptions & PlaywrightWorkerArgs & PlaywrightWorkerOptions) : Promise<void> => {
  const runtimeErrors: string[] = collectRuntimeErrors(page)

  await loginWithDefaultMockUser(page, '/dashboard/self')
  await expect(page).toHaveURL(/\/dashboard\/self$/)
  await expect(page.getByRole('link', { name: '자사 분석' })).toBeVisible()
  await expect(page.getByText('총 판매액')).toBeVisible()

  await page.getByRole('link', { name: '경쟁사 분석' }).click()
  await expect(page).toHaveURL(/\/dashboard\/competitor$/)
  await expect(page.getByText(/경쟁사·.+ 판매량 비교/)).toBeVisible()

  await page.getByRole('link', { name: '오더 후보군' }).click()
  await expect(page).toHaveURL(/\/dashboard\/snapshot-confirm$/)
  await expect(page.getByText('엑셀 업로드')).toBeVisible()

  await page.getByRole('link', { name: '관리자' }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('button', { name: '사용자 관리' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'GPT 키 관리' })).toBeVisible()
  await expect(page.getByRole('button', { name: '구글 시트 관리' })).toBeVisible()

  await expectNoRuntimeErrors(runtimeErrors)
})
