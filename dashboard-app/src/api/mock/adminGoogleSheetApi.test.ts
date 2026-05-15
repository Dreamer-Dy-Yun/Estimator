import { afterEach, describe, expect, it } from 'vitest'
import { mockAdminGoogleSheetApi } from './adminGoogleSheetApi'
import { mockAuthApi } from './authApi'

describe('mockAdminGoogleSheetApi', () => {
  afterEach(async () => {
    await mockAuthApi.logout()
  })

  it('stores google sheet configs without exposing raw service account keys', async () => {
    await mockAuthApi.login({ loginId: 'mock-admin', password: 'admin' })

    const created = await mockAdminGoogleSheetApi.createAdminGoogleSheetConfig({
      name: '테스트 시트',
      purpose: 'test',
      serviceAccountEmail: 'sheet-test@mock.iam.gserviceaccount.com',
      serviceAccountRole: 'viewer',
      serviceAccountKeyJson: '{"client_email":"sheet-test@mock.iam.gserviceaccount.com","private_key":"secret-value"}',
      spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/test-sheet-id/edit',
      sheetRange: 'SKU!A1:Z',
      accessMode: 'readonly',
      isActive: true,
      note: '테스트',
    })

    const configs = await mockAdminGoogleSheetApi.getAdminGoogleSheetConfigs()

    expect(created.spreadsheetId).toBe('test-sheet-id')
    expect(configs.some((config) => config.uuid === created.uuid)).toBe(true)
    expect(JSON.stringify(configs)).not.toContain('secret-value')
  })

  it('deletes google sheet configs by uuid', async () => {
    await mockAuthApi.login({ loginId: 'mock-admin', password: 'admin' })

    const created = await mockAdminGoogleSheetApi.createAdminGoogleSheetConfig({
      name: '삭제 테스트 시트',
      purpose: 'test',
      serviceAccountEmail: 'delete-sheet@mock.iam.gserviceaccount.com',
      serviceAccountRole: 'viewer',
      serviceAccountKeyJson: '{"private_key":"delete-secret"}',
      spreadsheetUrl: 'delete-sheet-id',
      sheetRange: 'Sheet1!A1:Z',
      accessMode: 'readonly',
      isActive: true,
      note: null,
    })

    await mockAdminGoogleSheetApi.deleteAdminGoogleSheetConfig(created.uuid)
    const configs = await mockAdminGoogleSheetApi.getAdminGoogleSheetConfigs()

    expect(configs.some((config) => config.uuid === created.uuid)).toBe(false)
  })
})
