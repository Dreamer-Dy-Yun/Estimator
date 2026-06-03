import type { AdminGptKeySummary, AdminGptKeyTestResult } from '..'
import { afterEach, describe, expect, it } from 'vitest'
import { mockAdminGptKeyApi } from './adminGptKeyApi'
import { mockAuthApi } from './authApi'

describe('api/mock adminGptKeyApi behavior', () : void => {
  afterEach(async () : Promise<void> => {
    await mockAuthApi.logout()
  })

  it('keeps raw GPT keys out of returned admin GPT key summaries', async () : Promise<void> => {
    await mockAuthApi.login({ loginId: 'mock-admin', password: 'admin' })

    const created: AdminGptKeySummary = await mockAdminGptKeyApi.createAdminGptKey({
      name: '테스트 키',
      purpose: 'ai-comment',
      model: 'gpt-test',
      plainKey: 'sk-secret-value-1234',
      isActive: true,
      note: '테스트',
    })

    expect(created.maskedKey).toBe('sk-...1234')
    expect(JSON.stringify(created)).not.toContain('secret-value')

    const gptKeys: AdminGptKeySummary[] = await mockAdminGptKeyApi.getAdminGptKeys()
    expect(JSON.stringify(gptKeys)).not.toContain('secret-value')
  })

  it('updates metadata, replaces the key preview, and records test status', async () : Promise<void> => {
    await mockAuthApi.login({ loginId: 'mock-admin', password: 'admin' })

    const created: AdminGptKeySummary = await mockAdminGptKeyApi.createAdminGptKey({
      name: '교체 대상',
      purpose: 'all',
      model: 'gpt-old',
      plainKey: 'sk-old-0000',
      isActive: true,
      note: null,
    })
    const updated: AdminGptKeySummary = await mockAdminGptKeyApi.updateAdminGptKey({
      uuid: created.uuid,
      name: '변경 대상',
      purpose: 'test',
      model: 'gpt-test',
      isActive: true,
      note: '메모',
      plainKey: 'sk-new-9999',
    })
    const result: AdminGptKeyTestResult = await mockAdminGptKeyApi.testAdminGptKey(created.uuid)
    await mockAdminGptKeyApi.deleteAdminGptKey(created.uuid)
    const gptKeys: AdminGptKeySummary[] = await mockAdminGptKeyApi.getAdminGptKeys()

    expect(updated).toMatchObject({
      name: '변경 대상',
      purpose: 'test',
      model: 'gpt-test',
      note: '메모',
    })
    expect(updated.maskedKey).toBe('sk-...9999')
    expect(result.status).toBe('success')
    expect(gptKeys.some((gptKey: AdminGptKeySummary) : boolean => gptKey.uuid === created.uuid)).toBe(false)
  })
})
