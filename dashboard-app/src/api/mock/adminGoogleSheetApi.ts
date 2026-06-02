import type {
  AdminGoogleSheetApi,
  AdminGoogleSheetConfigSummary,
  CompanyScopeParams,
  CreateAdminGoogleSheetConfigPayload,
  UpdateAdminGoogleSheetConfigPayload,
} from '../types'
import { cleanMockNote, createMockUuid, runMockAdminAction, touchMockRecord } from './authApi'
import {
  isMockRecordInCompanyScope,
  getMockMutationCompanyUuid,
  MOCK_COMPANIES,
  MOCK_HANA_COMPANY_UUID,
  MOCK_T1_COMPANY_UUID,
} from './mockCompanyScope'

const MOCK_UPDATED_AT = '2026-05-06T00:00:00.000Z'
const SHEET_CONFIG_NOT_FOUND = '구글 시트 설정을 찾을 수 없습니다.'
const DEFAULT_CONFIG_NAME = '새 구글 시트'

let mockAdminGoogleSheetConfigs: AdminGoogleSheetConfigSummary[] = [
  {
    uuid: '00000000-0000-4000-8000-200000000001',
    companyUuid: MOCK_HANA_COMPANY_UUID,
    companyName: '한아INT',
    name: '한아INT DB 설계 시트',
    purpose: 'db-schema',
    serviceAccountEmail: 'hana-sheets@mock-project.iam.gserviceaccount.com',
    maskedServiceAccountKey: 'json-...eets',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1-14eYq7JyJnZCr9u7Awvc0QRSLOdamGpiUnh4R68Cz8/edit?gid=0#gid=0',
    spreadsheetId: '1-14eYq7JyJnZCr9u7Awvc0QRSLOdamGpiUnh4R68Cz8',
    isActive: true,
    note: '한아INT 기준 DB 테이블 정의 참조 설정',
    dbUpdatedAt: MOCK_UPDATED_AT,
  },
  {
    uuid: '00000000-0000-4000-8000-200000000002',
    companyUuid: MOCK_T1_COMPANY_UUID,
    companyName: 'T1글로벌',
    name: 'T1글로벌 입고예정일 시트',
    purpose: 'upload-template',
    serviceAccountEmail: 't1-sheets@mock-project.iam.gserviceaccount.com',
    maskedServiceAccountKey: 'json-...eets',
    spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/t1-global-inbound-sheet/edit',
    spreadsheetId: 't1-global-inbound-sheet',
    isActive: true,
    note: 'T1글로벌 기준 입고예정일 수집 설정',
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

function getCompanyName(companyUuid: string) {
  const company = MOCK_COMPANIES.find((candidate) => candidate.uuid === companyUuid)
  if (!company) throw new Error('회사 정보를 찾을 수 없습니다.')
  return company.name
}

function maskServiceAccountKey(clientEmail: string) {
  const [name] = clientEmail.split('@')
  return `json-...${name.slice(-4)}`
}

function requireConfig(uuid: string, companyUuid?: string) {
  const target = mockAdminGoogleSheetConfigs.find((config) => (
    config.uuid === uuid && (!companyUuid || config.companyUuid === companyUuid)
  ))
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
  fallbackName = DEFAULT_CONFIG_NAME,
) {
  const companyUuid = getMockMutationCompanyUuid(payload.companyUuid)
  const spreadsheetUrl = payload.spreadsheetUrl.trim()
  return {
    companyUuid,
    companyName: getCompanyName(companyUuid),
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
  getAdminGoogleSheetConfigs: (params?: CompanyScopeParams) =>
    runMockAdminAction(80, () => [...mockAdminGoogleSheetConfigs]
      .filter((config) => isMockRecordInCompanyScope(config.companyUuid, params))
      .sort((a, b) => a.companyName.localeCompare(b.companyName, 'ko') || a.name.localeCompare(b.name, 'ko'))),
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
      const mutationCompanyUuid = getMockMutationCompanyUuid(payload.companyUuid)
      const target = requireConfig(payload.uuid)
      const serviceAccountEmail = payload.serviceAccountKeyJson?.trim()
        ? parseServiceAccountEmail(payload.serviceAccountKeyJson)
        : target.serviceAccountEmail
      return saveConfig({ ...target, ...buildConfigPatch(payload, serviceAccountEmail, target.name), companyUuid: mutationCompanyUuid })
    }),
  deleteAdminGoogleSheetConfig: (configUuid: string, params) =>
    runMockAdminAction(100, () => {
      const companyUuid = getMockMutationCompanyUuid(params.companyUuid)
      requireConfig(configUuid, companyUuid)
      mockAdminGoogleSheetConfigs = mockAdminGoogleSheetConfigs.filter((config) => config.uuid !== configUuid)
    }),
}
