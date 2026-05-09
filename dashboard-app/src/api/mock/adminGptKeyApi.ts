import type {
  AdminGptKeyApi,
  AdminGptKeySummary,
  AdminGptKeyTestResult,
  CreateAdminGptKeyPayload,
  RotateAdminGptKeyPayload,
  UpdateAdminGptKeyPayload,
} from '../types'
import { assertMockAdminSession } from './authApi'
import { sleep } from './utils'

const MOCK_UPDATED_AT = '2026-05-06T00:00:00.000Z'

let mockAdminGptKeys: AdminGptKeySummary[] = [
  {
    uuid: '00000000-0000-4000-8000-100000000001',
    name: 'GPT AI 코멘트',
    purpose: 'ai-comment',
    model: 'gpt-4.1-mini',
    maskedKey: 'sk-...mock',
    isActive: true,
    note: '후보군 AI 코멘트용 목업 키',
    lastUsedAt: '2026-05-08T09:30:00.000Z',
    lastTestedAt: MOCK_UPDATED_AT,
    lastTestStatus: 'success',
    dbUpdatedAt: MOCK_UPDATED_AT,
  },
]

function createMockUuid() {
  return globalThis.crypto?.randomUUID?.() ?? `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`
}

function maskPlainKey(plainKey: string) {
  const clean = plainKey.trim()
  if (!clean) return 'key-...empty'
  const prefix = clean.includes('-') ? clean.slice(0, clean.indexOf('-')) : 'key'
  const last4 = clean.slice(-4)
  return `${prefix}-...${last4}`
}

function cleanNote(note: string | null) {
  return note?.trim() || null
}

function findGptKey(uuid: string) {
  return mockAdminGptKeys.find((gptKey) => gptKey.uuid === uuid) ?? null
}

function sortGptKeys(gptKeys: AdminGptKeySummary[]) {
  return [...gptKeys].sort((a, b) => a.name.localeCompare(b.name))
}

export const mockAdminGptKeyApi: AdminGptKeyApi = {
  getAdminGptKeys: async (): Promise<AdminGptKeySummary[]> => {
    await sleep(80)
    assertMockAdminSession()
    return sortGptKeys(mockAdminGptKeys)
  },
  createAdminGptKey: async (payload: CreateAdminGptKeyPayload): Promise<AdminGptKeySummary> => {
    await sleep(120)
    assertMockAdminSession()
    const now = new Date().toISOString()
    const gptKey: AdminGptKeySummary = {
      uuid: createMockUuid(),
      name: payload.name.trim() || '새 GPT 키',
      purpose: payload.purpose,
      model: payload.model.trim() || 'default-model',
      maskedKey: maskPlainKey(payload.plainKey),
      isActive: payload.isActive,
      note: cleanNote(payload.note),
      lastUsedAt: null,
      lastTestedAt: null,
      lastTestStatus: 'untested',
      dbUpdatedAt: now,
    }
    mockAdminGptKeys = [...mockAdminGptKeys, gptKey]
    return gptKey
  },
  updateAdminGptKey: async (payload: UpdateAdminGptKeyPayload): Promise<AdminGptKeySummary> => {
    await sleep(110)
    assertMockAdminSession()
    const target = findGptKey(payload.uuid)
    if (!target) throw new Error('GPT 키를 찾을 수 없습니다.')

    const nextGptKey: AdminGptKeySummary = {
      ...target,
      name: payload.name.trim() || target.name,
      purpose: payload.purpose,
      model: payload.model.trim() || target.model,
      isActive: payload.isActive,
      note: cleanNote(payload.note),
      dbUpdatedAt: new Date().toISOString(),
    }
    mockAdminGptKeys = mockAdminGptKeys.map((gptKey) => (gptKey.uuid === payload.uuid ? nextGptKey : gptKey))
    return nextGptKey
  },
  rotateAdminGptKey: async (payload: RotateAdminGptKeyPayload): Promise<AdminGptKeySummary> => {
    await sleep(110)
    assertMockAdminSession()
    const target = findGptKey(payload.uuid)
    if (!target) throw new Error('GPT 키를 찾을 수 없습니다.')

    const nextGptKey: AdminGptKeySummary = {
      ...target,
      maskedKey: maskPlainKey(payload.plainKey),
      lastTestedAt: null,
      lastTestStatus: 'untested',
      dbUpdatedAt: new Date().toISOString(),
    }
    mockAdminGptKeys = mockAdminGptKeys.map((gptKey) => (gptKey.uuid === payload.uuid ? nextGptKey : gptKey))
    return nextGptKey
  },
  testAdminGptKey: async (keyUuid: string): Promise<AdminGptKeyTestResult> => {
    await sleep(180)
    assertMockAdminSession()
    const target = findGptKey(keyUuid)
    if (!target) throw new Error('GPT 키를 찾을 수 없습니다.')

    const testedAt = new Date().toISOString()
    const status = target.isActive ? 'success' : 'failed'
    const result: AdminGptKeyTestResult = {
      uuid: keyUuid,
      status,
      message: target.isActive ? 'mock 연결 테스트 성공' : '비활성 키는 테스트할 수 없습니다.',
      testedAt,
    }
    mockAdminGptKeys = mockAdminGptKeys.map((gptKey) =>
      gptKey.uuid === keyUuid
        ? {
            ...gptKey,
            lastTestedAt: testedAt,
            lastTestStatus: status,
            dbUpdatedAt: testedAt,
          }
        : gptKey,
    )
    return result
  },
}
