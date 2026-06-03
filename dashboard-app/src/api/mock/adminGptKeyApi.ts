import type { AdminGptKeyApi, AdminGptKeySummary, AdminGptKeyTestResult, CreateAdminGptKeyPayload, RotateAdminGptKeyPayload, UpdateAdminGptKeyPayload } from '../types'
import { cleanMockNote, createMockUuid, runMockAdminAction, touchMockRecord } from './authApi'

const MOCK_UPDATED_AT = '2026-05-06T00:00:00.000Z' as const
const GPT_KEY_NOT_FOUND = 'GPT 키를 찾을 수 없습니다.' as const

let mockAdminGptKeys: AdminGptKeySummary[] = [
  {
    uuid: '00000000-0000-4000-8000-100000000001',
    name: 'AI 코멘트용 GPT 키',
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

function maskPlainKey(plainKey: string) : string {
  const clean: string = plainKey.trim()
  if (!clean) return 'key-...empty'
  const prefix: string = clean.includes('-') ? clean.slice(0, clean.indexOf('-')) : 'key'
  return `${prefix}-...${clean.slice(-4)}`
}

function requireGptKey(uuid: string) : AdminGptKeySummary {
  const target: AdminGptKeySummary | undefined = mockAdminGptKeys.find((gptKey: AdminGptKeySummary) : boolean => gptKey.uuid === uuid)
  if (!target) throw new Error(GPT_KEY_NOT_FOUND)
  return target
}

function saveGptKey(nextGptKey: AdminGptKeySummary) : AdminGptKeySummary {
  mockAdminGptKeys = mockAdminGptKeys.map((gptKey: AdminGptKeySummary) : AdminGptKeySummary => (gptKey.uuid === nextGptKey.uuid ? nextGptKey : gptKey))
  return nextGptKey
}

const markUntested: (plainKey: string) => { maskedKey: string; lastTestedAt: null; lastTestStatus: 'untested'; } = (plainKey: string) : { maskedKey: string; lastTestedAt: null; lastTestStatus: 'untested'; } => ({
  maskedKey: maskPlainKey(plainKey),
  lastTestedAt: null,
  lastTestStatus: 'untested' as const,
})

export const mockAdminGptKeyApi: AdminGptKeyApi = {
  getAdminGptKeys: () : Promise<AdminGptKeySummary[]> =>
    runMockAdminAction(80, () : AdminGptKeySummary[] => [...mockAdminGptKeys].sort((a: AdminGptKeySummary, b: AdminGptKeySummary) : number => a.name.localeCompare(b.name))),
  createAdminGptKey: (payload: CreateAdminGptKeyPayload) : Promise<AdminGptKeySummary> =>
    runMockAdminAction(120, () : AdminGptKeySummary => {
      const gptKey: AdminGptKeySummary = {
        uuid: createMockUuid(),
        name: payload.name.trim() || '새 GPT 키',
        purpose: payload.purpose,
        model: payload.model.trim() || 'default-model',
        ...markUntested(payload.plainKey),
        isActive: payload.isActive,
        note: cleanMockNote(payload.note),
        lastUsedAt: null,
        dbUpdatedAt: touchMockRecord(),
      }
      mockAdminGptKeys = [...mockAdminGptKeys, gptKey]
      return gptKey
    }),
  updateAdminGptKey: (payload: UpdateAdminGptKeyPayload) : Promise<AdminGptKeySummary> =>
    runMockAdminAction(110, () : AdminGptKeySummary => {
      const target: AdminGptKeySummary = requireGptKey(payload.uuid)
      const plainKey: string | undefined = payload.plainKey?.trim()
      return saveGptKey({
        ...target,
        name: payload.name.trim() || target.name,
        purpose: payload.purpose,
        model: payload.model.trim() || target.model,
        ...(plainKey ? markUntested(plainKey) : {}),
        isActive: payload.isActive,
        note: cleanMockNote(payload.note),
        dbUpdatedAt: touchMockRecord(),
      })
    }),
  rotateAdminGptKey: (payload: RotateAdminGptKeyPayload) : Promise<AdminGptKeySummary> =>
    runMockAdminAction(110, () : AdminGptKeySummary => saveGptKey({ ...requireGptKey(payload.uuid), ...markUntested(payload.plainKey), dbUpdatedAt: touchMockRecord() })),
  testAdminGptKey: (keyUuid: string): Promise<AdminGptKeyTestResult> =>
    runMockAdminAction(180, () : { uuid: string; status: 'success' | 'failed'; message: string; testedAt: string; } => {
      const target: AdminGptKeySummary = requireGptKey(keyUuid)
      const testedAt: string = touchMockRecord()
      const status: 'success' | 'failed' = target.isActive ? 'success' : 'failed'
      saveGptKey({ ...target, lastTestedAt: testedAt, lastTestStatus: status, dbUpdatedAt: testedAt })
      return {
        uuid: keyUuid,
        status,
        message: target.isActive ? 'mock 연결 테스트 성공' : '비활성 키는 테스트할 수 없습니다.',
        testedAt,
      }
    }),
  deleteAdminGptKey: (keyUuid: string) : Promise<void> =>
    runMockAdminAction(110, () : void => {
      requireGptKey(keyUuid)
      mockAdminGptKeys = mockAdminGptKeys.filter((gptKey: AdminGptKeySummary) : boolean => gptKey.uuid !== keyUuid)
    }),
}
