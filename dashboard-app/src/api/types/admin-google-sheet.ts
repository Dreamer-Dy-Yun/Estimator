import type { CompanyMutationScopeParams, CompanyScopeParams } from './company'

export type AdminGoogleSheetPurpose = 'db-schema' | 'upload-template' | 'operation-reference' | 'test'

export interface AdminGoogleSheetConfigSummary {
  uuid: string
  companyUuid: string
  companyName: string
  name: string
  purpose: AdminGoogleSheetPurpose
  serviceAccountEmail: string
  maskedServiceAccountKey: string
  spreadsheetUrl: string
  spreadsheetId: string
  isActive: boolean
  note: string | null
  dbUpdatedAt: string
}

export interface CreateAdminGoogleSheetConfigPayload extends CompanyMutationScopeParams {
  name: string
  purpose: AdminGoogleSheetPurpose
  serviceAccountKeyJson: string
  spreadsheetUrl: string
  isActive: boolean
  note: string | null
}

export interface UpdateAdminGoogleSheetConfigPayload extends CompanyMutationScopeParams {
  uuid: string
  name: string
  purpose: AdminGoogleSheetPurpose
  spreadsheetUrl: string
  isActive: boolean
  note: string | null
  serviceAccountKeyJson?: string
}

export interface AdminGoogleSheetApi {
  getAdminGoogleSheetConfigs(params?: CompanyScopeParams): Promise<AdminGoogleSheetConfigSummary[]>
  createAdminGoogleSheetConfig(
    payload: CreateAdminGoogleSheetConfigPayload,
  ): Promise<AdminGoogleSheetConfigSummary>
  updateAdminGoogleSheetConfig(
    payload: UpdateAdminGoogleSheetConfigPayload,
  ): Promise<AdminGoogleSheetConfigSummary>
  deleteAdminGoogleSheetConfig(configUuid: string, params: CompanyMutationScopeParams): Promise<void>
}
