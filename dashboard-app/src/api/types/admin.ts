export type AdminApiKeyPurpose = 'ai-comment' | 'candidate-recommendation' | 'test' | 'all'

export type AdminApiKeyTestStatus = 'untested' | 'success' | 'failed'

export interface AdminApiKeySummary {
  uuid: string
  name: string
  purpose: AdminApiKeyPurpose
  model: string
  maskedKey: string
  isActive: boolean
  note: string | null
  lastUsedAt: string | null
  lastTestedAt: string | null
  lastTestStatus: AdminApiKeyTestStatus
  dbUpdatedAt: string
}

export interface CreateAdminApiKeyPayload {
  name: string
  purpose: AdminApiKeyPurpose
  model: string
  plainKey: string
  isActive: boolean
  note: string | null
}

export interface UpdateAdminApiKeyPayload {
  uuid: string
  name: string
  purpose: AdminApiKeyPurpose
  model: string
  isActive: boolean
  note: string | null
}

export interface RotateAdminApiKeyPayload {
  uuid: string
  plainKey: string
}

export interface AdminApiKeyTestResult {
  uuid: string
  status: AdminApiKeyTestStatus
  message: string
  testedAt: string
}

export interface AdminApi {
  getAdminApiKeys(): Promise<AdminApiKeySummary[]>
  createAdminApiKey(payload: CreateAdminApiKeyPayload): Promise<AdminApiKeySummary>
  updateAdminApiKey(payload: UpdateAdminApiKeyPayload): Promise<AdminApiKeySummary>
  rotateAdminApiKey(payload: RotateAdminApiKeyPayload): Promise<AdminApiKeySummary>
  testAdminApiKey(keyUuid: string): Promise<AdminApiKeyTestResult>
}
