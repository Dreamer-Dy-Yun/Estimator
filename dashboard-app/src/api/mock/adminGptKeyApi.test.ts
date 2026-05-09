import { afterEach, describe, expect, it } from 'vitest'
import { mockAdminGptKeyApi } from './adminGptKeyApi'
import { mockAuthApi } from './authApi'

describe('api/mock adminGptKeyApi behavior', () => {
  afterEach(async () => {
    await mockAuthApi.logout()
  })

  it('keeps raw GPT keys out of returned admin GPT key summaries', async () => {
    await mockAuthApi.login({ loginId: 'mock-admin', password: 'admin' })

    const created = await mockAdminGptKeyApi.createAdminGptKey({
      name: '테스트 키',
      purpose: 'ai-comment',
      model: 'gpt-test',
      plainKey: 'sk-secret-value-1234',
      isActive: true,
      note: '테스트',
    })

    expect(created.maskedKey).toBe('sk-...1234')
    expect(JSON.stringify(created)).not.toContain('secret-value')

    const gptKeys = await mockAdminGptKeyApi.getAdminGptKeys()
    expect(JSON.stringify(gptKeys)).not.toContain('secret-value')
  })

  it('updates metadata, rotates the key preview, and records test status', async () => {
    await mockAuthApi.login({ loginId: 'mock-admin', password: 'admin' })

    const created = await mockAdminGptKeyApi.createAdminGptKey({
      name: '교체 대상',
      purpose: 'all',
      model: 'gpt-old',
      plainKey: 'sk-old-0000',
      isActive: true,
      note: null,
    })
    const updated = await mockAdminGptKeyApi.updateAdminGptKey({
      uuid: created.uuid,
      name: '변경 대상',
      purpose: 'test',
      model: 'gpt-test',
      isActive: true,
      note: '메모',
    })
    const rotated = await mockAdminGptKeyApi.rotateAdminGptKey({
      uuid: created.uuid,
      plainKey: 'sk-new-9999',
    })
    const result = await mockAdminGptKeyApi.testAdminGptKey(created.uuid)

    expect(updated).toMatchObject({
      name: '변경 대상',
      purpose: 'test',
      model: 'gpt-test',
      note: '메모',
    })
    expect(rotated.maskedKey).toBe('sk-...9999')
    expect(result.status).toBe('success')
  })
})
