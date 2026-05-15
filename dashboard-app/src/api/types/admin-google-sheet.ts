export type AdminGoogleSheetPurpose = 'db-schema' | 'upload-template' | 'operation-reference' | 'test'

export type AdminGoogleSheetAccessMode = 'readonly' | 'readwrite'

export type AdminGoogleSheetShareRole = 'viewer' | 'editor'

export interface AdminGoogleSheetConfigSummary {
  uuid: string
  name: string
  purpose: AdminGoogleSheetPurpose
  serviceAccountEmail: string
  serviceAccountRole: AdminGoogleSheetShareRole
  maskedServiceAccountKey: string
  spreadsheetUrl: string
  spreadsheetId: string
  sheetRange: string
  accessMode: AdminGoogleSheetAccessMode
  isActive: boolean
  note: string | null
  dbUpdatedAt: string
}

export interface CreateAdminGoogleSheetConfigPayload {
  name: string
  purpose: AdminGoogleSheetPurpose
  serviceAccountEmail: string
  serviceAccountRole: AdminGoogleSheetShareRole
  serviceAccountKeyJson: string
  spreadsheetUrl: string
  sheetRange: string
  accessMode: AdminGoogleSheetAccessMode
  isActive: boolean
  note: string | null
}

export interface UpdateAdminGoogleSheetConfigPayload {
  uuid: string
  name: string
  purpose: AdminGoogleSheetPurpose
  serviceAccountEmail: string
  serviceAccountRole: AdminGoogleSheetShareRole
  spreadsheetUrl: string
  sheetRange: string
  accessMode: AdminGoogleSheetAccessMode
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
