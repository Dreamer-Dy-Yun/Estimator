import type {
  AdminApi,
  AdminApiKeySummary,
  AdminApiKeyTestResult,
  CreateAdminApiKeyPayload,
  RotateAdminApiKeyPayload,
  UpdateAdminApiKeyPayload,
} from '../types'
import { assertMockAdminSession } from './authApi'
import { sleep } from './utils'

const MOCK_UPDATED_AT = '2026-05-06T00:00:00.000Z'

let mockAdminApiKeys: AdminApiKeySummary[] = [
  {
    uuid: '00000000-0000-4000-8000-100000000001',
    name: 'GPT AI 코멘트',
    provider: 'openai',
    purpose: 'ai-comment',
    model: 'gpt-4.1-mini',
    maskedKey: 'sk-...mock',
    isActive: true,
    baseUrl: null,
    projectId: 'proj_mock',
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

function cleanText(value: string | null | undefined) {
  const text = value?.trim()
  return text ? text : null
}

function maskPlainKey(plainKey: string) {
  const clean = plainKey.trim()
  if (!clean) return 'key-...empty'
  const prefix = clean.includes('-') ? clean.slice(0, clean.indexOf('-')) : 'key'
  const last4 = clean.slice(-4)
  return `${prefix}-...${last4}`
}

function findApiKey(uuid: string) {
  return mockAdminApiKeys.find((apiKey) => apiKey.uuid === uuid) ?? null
}

function sortApiKeys(apiKeys: AdminApiKeySummary[]) {
  return [...apiKeys].sort((a, b) => a.name.localeCompare(b.name))
}

export const mockAdminApi: AdminApi = {
  getAdminApiKeys: async (): Promise<AdminApiKeySummary[]> => {
    await sleep(80)
    assertMockAdminSession()
    return sortApiKeys(mockAdminApiKeys)
  },
  createAdminApiKey: async (payload: CreateAdminApiKeyPayload): Promise<AdminApiKeySummary> => {
    await sleep(120)
    assertMockAdminSession()
    const now = new Date().toISOString()
    const apiKey: AdminApiKeySummary = {
      uuid: createMockUuid(),
      name: payload.name.trim() || '새 API 키',
      provider: payload.provider,
      purpose: payload.purpose,
      model: payload.model.trim() || 'default-model',
      maskedKey: maskPlainKey(payload.plainKey),
      isActive: payload.isActive,
      baseUrl: cleanText(payload.baseUrl),
      projectId: cleanText(payload.projectId),
      note: cleanText(payload.note),
      lastUsedAt: null,
      lastTestedAt: null,
      lastTestStatus: 'untested',
      dbUpdatedAt: now,
    }
    mockAdminApiKeys = [...mockAdminApiKeys, apiKey]
    return apiKey
  },
  updateAdminApiKey: async (payload: UpdateAdminApiKeyPayload): Promise<AdminApiKeySummary> => {
    await sleep(110)
    assertMockAdminSession()
    const target = findApiKey(payload.uuid)
    if (!target) throw new Error('API 키를 찾을 수 없습니다.')

    const nextApiKey: AdminApiKeySummary = {
      ...target,
      name: payload.name.trim() || target.name,
      provider: payload.provider,
      purpose: payload.purpose,
      model: payload.model.trim() || target.model,
      isActive: payload.isActive,
      baseUrl: cleanText(payload.baseUrl),
      projectId: cleanText(payload.projectId),
      note: cleanText(payload.note),
      dbUpdatedAt: new Date().toISOString(),
    }
    mockAdminApiKeys = mockAdminApiKeys.map((apiKey) => (apiKey.uuid === payload.uuid ? nextApiKey : apiKey))
    return nextApiKey
  },
  rotateAdminApiKey: async (payload: RotateAdminApiKeyPayload): Promise<AdminApiKeySummary> => {
    await sleep(110)
    assertMockAdminSession()
    const target = findApiKey(payload.uuid)
    if (!target) throw new Error('API 키를 찾을 수 없습니다.')

    const nextApiKey: AdminApiKeySummary = {
      ...target,
      maskedKey: maskPlainKey(payload.plainKey),
      lastTestedAt: null,
      lastTestStatus: 'untested',
      dbUpdatedAt: new Date().toISOString(),
    }
    mockAdminApiKeys = mockAdminApiKeys.map((apiKey) => (apiKey.uuid === payload.uuid ? nextApiKey : apiKey))
    return nextApiKey
  },
  testAdminApiKey: async (keyUuid: string): Promise<AdminApiKeyTestResult> => {
    await sleep(180)
    assertMockAdminSession()
    const target = findApiKey(keyUuid)
    if (!target) throw new Error('API 키를 찾을 수 없습니다.')

    const testedAt = new Date().toISOString()
    const status = target.isActive ? 'success' : 'failed'
    const result: AdminApiKeyTestResult = {
      uuid: keyUuid,
      status,
      message: target.isActive ? 'mock 연결 테스트 성공' : '비활성 키는 테스트할 수 없습니다.',
      testedAt,
    }
    mockAdminApiKeys = mockAdminApiKeys.map((apiKey) =>
      apiKey.uuid === keyUuid
        ? {
            ...apiKey,
            lastTestedAt: testedAt,
            lastTestStatus: status,
            dbUpdatedAt: testedAt,
          }
        : apiKey,
    )
    return result
  },
}
