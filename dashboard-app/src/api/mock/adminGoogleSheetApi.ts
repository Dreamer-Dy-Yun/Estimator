import type { AdminGoogleSheetApi, AdminGoogleSheetConfigSummary, CreateAdminGoogleSheetConfigPayload, UpdateAdminGoogleSheetConfigPayload } from '../types'
import { cleanMockNote, createMockUuid, runMockAdminAction, touchMockRecord } from './authApi'

const MOCK_UPDATED_AT = '2026-05-06T00:00:00.000Z'
const SHEET_CONFIG_NOT_FOUND = '구글 시트 설정을 찾을 수 없습니다.'

let mockAdminGoogleSheetConfigs: AdminGoogleSheetConfigSummary[] = [
  {
    uuid: '00000000-0000-4000-8000-200000000001',
    name: 'DB 설계 시트',
    purpose: 'db-schema',
    serviceAccountEmail: 'han-a-sheets@mock-project.iam.gserviceaccount.com',
    maskedServiceAccountKey: 'json-...mock',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1-14eYq7JyJnZCr9u7Awvc0QRSLOdamGpiUnh4R68Cz8/edit?gid=0#gid=0',
    spreadsheetId: '1-14eYq7JyJnZCr9u7Awvc0QRSLOdamGpiUnh4R68Cz8',
    isActive: true,
    note: 'DB 테이블 정의 참조용 목업 설정',
    dbUpdatedAt: MOCK_UPDATED_AT,
  },
]

const extractSpreadsheetId = (spreadsheetUrl: string) => spreadsheetUrl.match(/\/spreadsheets\/d\/([^/]+)/)?.[1] ?? spreadsheetUrl.trim()

function parseServiceAccountEmail(serviceAccountKeyJson: string) {
  const clean = serviceAccountKeyJson.trim()
  if (!clean) throw new Error('서비스 계정 JSON 키 파일이 필요합니다.')
  try {
    const clientEmail = (JSON.parse(clean) as { client_email?: unknown }).client_email
    if (typeof clientEmail === 'string' && clientEmail.trim()) return clientEmail.trim()
  } catch {
    throw new Error('서비스 계정 JSON 키 파일 형식이 올바르지 않습니다.')
  }
  throw new Error('서비스 계정 JSON 안에서 client_email을 찾을 수 없습니다.')
}

function maskServiceAccountKey(clientEmail: string) {
  const [name] = clientEmail.split('@')
  return `json-...${name.slice(-4)}`
}

function requireConfig(uuid: string) {
  const target = mockAdminGoogleSheetConfigs.find((config) => config.uuid === uuid)
  if (!target) throw new Error(SHEET_CONFIG_NOT_FOUND)
  return target
}

function saveConfig(nextConfig: AdminGoogleSheetConfigSummary) {
  mockAdminGoogleSheetConfigs = mockAdminGoogleSheetConfigs.map((config) => (config.uuid === nextConfig.uuid ? nextConfig : config))
  return nextConfig
}

function buildConfigPatch(
  payload: CreateAdminGoogleSheetConfigPayload | UpdateAdminGoogleSheetConfigPayload,
  serviceAccountEmail: string,
  fallbackName = '새 구글 시트',
) {
  const spreadsheetUrl = payload.spreadsheetUrl.trim()
  return {
    name: payload.name.trim() || fallbackName,
    purpose: payload.purpose,
    serviceAccountEmail,
    maskedServiceAccountKey: maskServiceAccountKey(serviceAccountEmail),
    spreadsheetUrl,
    spreadsheetId: extractSpreadsheetId(spreadsheetUrl),
    isActive: payload.isActive,
    note: cleanMockNote(payload.note),
    dbUpdatedAt: touchMockRecord(),
  }
}

export const mockAdminGoogleSheetApi: AdminGoogleSheetApi = {
  getAdminGoogleSheetConfigs: () =>
    runMockAdminAction(80, () => [...mockAdminGoogleSheetConfigs].sort((a, b) => a.name.localeCompare(b.name, 'ko'))),
  createAdminGoogleSheetConfig: (payload: CreateAdminGoogleSheetConfigPayload) =>
    runMockAdminAction(120, () => {
      const config = {
        uuid: createMockUuid(),
        ...buildConfigPatch(payload, parseServiceAccountEmail(payload.serviceAccountKeyJson)),
      }
      mockAdminGoogleSheetConfigs = [...mockAdminGoogleSheetConfigs, config]
      return config
    }),
  updateAdminGoogleSheetConfig: (payload: UpdateAdminGoogleSheetConfigPayload) =>
    runMockAdminAction(110, () => {
      const target = requireConfig(payload.uuid)
      const serviceAccountEmail = payload.serviceAccountKeyJson?.trim()
        ? parseServiceAccountEmail(payload.serviceAccountKeyJson)
        : target.serviceAccountEmail
      return saveConfig({ ...target, ...buildConfigPatch(payload, serviceAccountEmail, target.name) })
    }),
  deleteAdminGoogleSheetConfig: (configUuid: string) =>
    runMockAdminAction(100, () => {
      requireConfig(configUuid)
      mockAdminGoogleSheetConfigs = mockAdminGoogleSheetConfigs.filter((config) => config.uuid !== configUuid)
    }),
}
