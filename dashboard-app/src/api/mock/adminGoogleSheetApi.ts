import type {
  AdminGoogleSheetApi,
  AdminGoogleSheetConfigSummary,
  CreateAdminGoogleSheetConfigPayload,
  UpdateAdminGoogleSheetConfigPayload,
} from '../types'
import { assertMockAdminSession } from './authApi'
import { sleep } from './utils'

const MOCK_UPDATED_AT = '2026-05-06T00:00:00.000Z'

let mockAdminGoogleSheetConfigs: AdminGoogleSheetConfigSummary[] = [
  {
    uuid: '00000000-0000-4000-8000-200000000001',
    name: 'DB 설계 시트',
    purpose: 'db-schema',
    serviceAccountEmail: 'han-a-sheets@mock-project.iam.gserviceaccount.com',
    serviceAccountRole: 'viewer',
    maskedServiceAccountKey: 'json-...mock',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/mock-spreadsheet-id/edit',
    spreadsheetId: 'mock-spreadsheet-id',
    sheetRange: 'SKU!A1:Z',
    accessMode: 'readonly',
    isActive: true,
    note: 'DB 테이블 정의 참조용 목업 설정',
    dbUpdatedAt: MOCK_UPDATED_AT,
  },
]

function createMockUuid() {
  return globalThis.crypto?.randomUUID?.() ?? `00000000-0000-4000-8000-${String(Date.now()).slice(-12).padStart(12, '0')}`
}

function cleanNote(note: string | null) {
  return note?.trim() || null
}

function extractSpreadsheetId(spreadsheetUrl: string) {
  const match = spreadsheetUrl.match(/\/spreadsheets\/d\/([^/]+)/)
  return match?.[1] ?? spreadsheetUrl.trim()
}

function maskServiceAccountKey(serviceAccountKeyJson: string) {
  const clean = serviceAccountKeyJson.trim()
  if (!clean) return 'json-...empty'
  const clientEmailMatch = clean.match(/"client_email"\s*:\s*"([^"]+)"/)
  const clientEmail = clientEmailMatch?.[1]
  if (clientEmail) {
    const [name] = clientEmail.split('@')
    return `json-...${name.slice(-4)}`
  }
  return `json-...${clean.slice(-4)}`
}

function findConfig(uuid: string) {
  return mockAdminGoogleSheetConfigs.find((config) => config.uuid === uuid) ?? null
}

function sortConfigs(configs: AdminGoogleSheetConfigSummary[]) {
  return [...configs].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}

export const mockAdminGoogleSheetApi: AdminGoogleSheetApi = {
  getAdminGoogleSheetConfigs: async (): Promise<AdminGoogleSheetConfigSummary[]> => {
    await sleep(80)
    assertMockAdminSession()
    return sortConfigs(mockAdminGoogleSheetConfigs)
  },
  createAdminGoogleSheetConfig: async (
    payload: CreateAdminGoogleSheetConfigPayload,
  ): Promise<AdminGoogleSheetConfigSummary> => {
    await sleep(120)
    assertMockAdminSession()
    const now = new Date().toISOString()
    const config: AdminGoogleSheetConfigSummary = {
      uuid: createMockUuid(),
      name: payload.name.trim() || '새 구글 시트',
      purpose: payload.purpose,
      serviceAccountEmail: payload.serviceAccountEmail.trim(),
      serviceAccountRole: payload.serviceAccountRole,
      maskedServiceAccountKey: maskServiceAccountKey(payload.serviceAccountKeyJson),
      spreadsheetUrl: payload.spreadsheetUrl.trim(),
      spreadsheetId: extractSpreadsheetId(payload.spreadsheetUrl),
      sheetRange: payload.sheetRange.trim() || 'Sheet1!A1:Z',
      accessMode: payload.accessMode,
      isActive: payload.isActive,
      note: cleanNote(payload.note),
      dbUpdatedAt: now,
    }
    mockAdminGoogleSheetConfigs = [...mockAdminGoogleSheetConfigs, config]
    return config
  },
  updateAdminGoogleSheetConfig: async (
    payload: UpdateAdminGoogleSheetConfigPayload,
  ): Promise<AdminGoogleSheetConfigSummary> => {
    await sleep(110)
    assertMockAdminSession()
    const target = findConfig(payload.uuid)
    if (!target) throw new Error('구글 시트 설정을 찾을 수 없습니다.')

    const nextKey = payload.serviceAccountKeyJson?.trim()
    const nextConfig: AdminGoogleSheetConfigSummary = {
      ...target,
      name: payload.name.trim() || target.name,
      purpose: payload.purpose,
      serviceAccountEmail: payload.serviceAccountEmail.trim(),
      serviceAccountRole: payload.serviceAccountRole,
      maskedServiceAccountKey: nextKey ? maskServiceAccountKey(nextKey) : target.maskedServiceAccountKey,
      spreadsheetUrl: payload.spreadsheetUrl.trim(),
      spreadsheetId: extractSpreadsheetId(payload.spreadsheetUrl),
      sheetRange: payload.sheetRange.trim() || target.sheetRange,
      accessMode: payload.accessMode,
      isActive: payload.isActive,
      note: cleanNote(payload.note),
      dbUpdatedAt: new Date().toISOString(),
    }
    mockAdminGoogleSheetConfigs = mockAdminGoogleSheetConfigs.map((config) =>
      config.uuid === payload.uuid ? nextConfig : config,
    )
    return nextConfig
  },
  deleteAdminGoogleSheetConfig: async (configUuid: string): Promise<void> => {
    await sleep(100)
    assertMockAdminSession()
    const target = findConfig(configUuid)
    if (!target) throw new Error('구글 시트 설정을 찾을 수 없습니다.')
    mockAdminGoogleSheetConfigs = mockAdminGoogleSheetConfigs.filter((config) => config.uuid !== configUuid)
  },
}
