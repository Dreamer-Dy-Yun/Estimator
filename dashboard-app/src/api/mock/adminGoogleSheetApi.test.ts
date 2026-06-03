import type { AdminGoogleSheetConfigSummary } from '..'
import { afterEach, describe, expect, it } from 'vitest'
import { ALL_COMPANY_UUID } from '../types'
import { mockAdminGoogleSheetApi } from './adminGoogleSheetApi'
import { mockAuthApi } from './authApi'
import { MOCK_HANA_COMPANY_UUID, MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE, MOCK_T1_COMPANY_UUID } from './mockCompanyScope'

describe('mockAdminGoogleSheetApi', () : void => {
  afterEach(async () : Promise<void> => {
    await mockAuthApi.logout()
  })

  it('stores google sheet configs in one company scope without exposing raw service account keys', async () : Promise<void> => {
    await mockAuthApi.login({ loginId: 'mock-admin', password: 'admin' })

    const created: AdminGoogleSheetConfigSummary = await mockAdminGoogleSheetApi.createAdminGoogleSheetConfig({
      companyUuid: MOCK_HANA_COMPANY_UUID,
      name: '테스트 시트',
      purpose: 'test',
      serviceAccountKeyJson: '{"client_email":"sheet-test@mock.iam.gserviceaccount.com","private_key":"secret-value"}',
      spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/test-sheet-id/edit',
      isActive: true,
      note: '테스트',
    })

    const configs: AdminGoogleSheetConfigSummary[] = await mockAdminGoogleSheetApi.getAdminGoogleSheetConfigs({ companyUuid: MOCK_HANA_COMPANY_UUID })

    expect(created.companyUuid).toBe(MOCK_HANA_COMPANY_UUID)
    expect(created.companyName).toBe('한아INT')
    expect(created.spreadsheetId).toBe('test-sheet-id')
    expect(created.serviceAccountEmail).toBe('sheet-test@mock.iam.gserviceaccount.com')
    expect(configs.some((config: AdminGoogleSheetConfigSummary) : boolean => config.uuid === created.uuid)).toBe(true)
    expect(JSON.stringify(configs)).not.toContain('secret-value')
  })

  it('filters google sheet configs by company scope', async () : Promise<void> => {
    await mockAuthApi.login({ loginId: 'mock-admin', password: 'admin' })

    const hanaConfigs: AdminGoogleSheetConfigSummary[] = await mockAdminGoogleSheetApi.getAdminGoogleSheetConfigs({ companyUuid: MOCK_HANA_COMPANY_UUID })
    const t1Configs: AdminGoogleSheetConfigSummary[] = await mockAdminGoogleSheetApi.getAdminGoogleSheetConfigs({ companyUuid: MOCK_T1_COMPANY_UUID })
    const allConfigs: AdminGoogleSheetConfigSummary[] = await mockAdminGoogleSheetApi.getAdminGoogleSheetConfigs({ companyUuid: ALL_COMPANY_UUID })

    expect(hanaConfigs.every((config: AdminGoogleSheetConfigSummary) : boolean => config.companyUuid === MOCK_HANA_COMPANY_UUID)).toBe(true)
    expect(t1Configs.every((config: AdminGoogleSheetConfigSummary) : boolean => config.companyUuid === MOCK_T1_COMPANY_UUID)).toBe(true)
    expect(allConfigs.length).toBeGreaterThanOrEqual(hanaConfigs.length + t1Configs.length)
  })

  it('rejects google sheet mutations without a concrete company scope', async () : Promise<void> => {
    await mockAuthApi.login({ loginId: 'mock-admin', password: 'admin' })

    await expect(mockAdminGoogleSheetApi.createAdminGoogleSheetConfig({
      companyUuid: ALL_COMPANY_UUID,
      name: '전체 시트',
      purpose: 'test',
      serviceAccountKeyJson: '{"client_email":"all-sheet@mock.iam.gserviceaccount.com"}',
      spreadsheetUrl: 'all-sheet-id',
      isActive: true,
      note: null,
    })).rejects.toThrow(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
  })

  it('deletes google sheet configs by uuid and company scope', async () : Promise<void> => {
    await mockAuthApi.login({ loginId: 'mock-admin', password: 'admin' })

    const created: AdminGoogleSheetConfigSummary = await mockAdminGoogleSheetApi.createAdminGoogleSheetConfig({
      companyUuid: MOCK_T1_COMPANY_UUID,
      name: '삭제 테스트 시트',
      purpose: 'test',
      serviceAccountKeyJson: '{"client_email":"delete-sheet@mock.iam.gserviceaccount.com","private_key":"delete-secret"}',
      spreadsheetUrl: 'delete-sheet-id',
      isActive: true,
      note: null,
    })

    await expect(mockAdminGoogleSheetApi.deleteAdminGoogleSheetConfig(created.uuid, { companyUuid: MOCK_HANA_COMPANY_UUID }))
      .rejects.toThrow('구글 시트 설정을 찾을 수 없습니다.')

    await mockAdminGoogleSheetApi.deleteAdminGoogleSheetConfig(created.uuid, { companyUuid: MOCK_T1_COMPANY_UUID })
    const configs: AdminGoogleSheetConfigSummary[] = await mockAdminGoogleSheetApi.getAdminGoogleSheetConfigs({ companyUuid: MOCK_T1_COMPANY_UUID })

    expect(configs.some((config: AdminGoogleSheetConfigSummary) : boolean => config.uuid === created.uuid)).toBe(false)
  })
})
