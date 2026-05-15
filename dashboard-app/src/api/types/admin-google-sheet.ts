export type AdminGoogleSheetPurpose = 'db-schema' | 'upload-template' | 'operation-reference' | 'test'

export interface AdminGoogleSheetConfigSummary {
  uuid: string
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

export interface CreateAdminGoogleSheetConfigPayload {
  name: string
  purpose: AdminGoogleSheetPurpose
  serviceAccountKeyJson: string
  spreadsheetUrl: string
  isActive: boolean
  note: string | null
}

export interface UpdateAdminGoogleSheetConfigPayload {
  uuid: string
  name: string
  purpose: AdminGoogleSheetPurpose
  spreadsheetUrl: string
  isActive: boolean
  note: string | null
  serviceAccountKeyJson?: string
}

export interface AdminGoogleSheetApi {
  getAdminGoogleSheetConfigs(): Promise<AdminGoogleSheetConfigSummary[]>
  createAdminGoogleSheetConfig(
    payload: CreateAdminGoogleSheetConfigPayload,
  ): Promise<AdminGoogleSheetConfigSummary>
  updateAdminGoogleSheetConfig(
    payload: UpdateAdminGoogleSheetConfigPayload,
  ): Promise<AdminGoogleSheetConfigSummary>
  deleteAdminGoogleSheetConfig(configUuid: string): Promise<void>
}
