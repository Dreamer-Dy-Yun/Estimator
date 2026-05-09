export type AdminGptKeyPurpose = 'ai-comment' | 'candidate-recommendation' | 'test' | 'all'

export type AdminGptKeyTestStatus = 'untested' | 'success' | 'failed'

export interface AdminGptKeySummary {
  uuid: string
  name: string
  purpose: AdminGptKeyPurpose
  model: string
  maskedKey: string
  isActive: boolean
  note: string | null
  lastUsedAt: string | null
  lastTestedAt: string | null
  lastTestStatus: AdminGptKeyTestStatus
  dbUpdatedAt: string
}

export interface CreateAdminGptKeyPayload {
  name: string
  purpose: AdminGptKeyPurpose
  model: string
  plainKey: string
  isActive: boolean
  note: string | null
}

export interface UpdateAdminGptKeyPayload {
  uuid: string
  name: string
  purpose: AdminGptKeyPurpose
  model: string
  isActive: boolean
  note: string | null
}

export interface RotateAdminGptKeyPayload {
  uuid: string
  plainKey: string
}

export interface AdminGptKeyTestResult {
  uuid: string
  status: AdminGptKeyTestStatus
  message: string
  testedAt: string
}

export interface AdminGptKeyApi {
  getAdminGptKeys(): Promise<AdminGptKeySummary[]>
  createAdminGptKey(payload: CreateAdminGptKeyPayload): Promise<AdminGptKeySummary>
  updateAdminGptKey(payload: UpdateAdminGptKeyPayload): Promise<AdminGptKeySummary>
  rotateAdminGptKey(payload: RotateAdminGptKeyPayload): Promise<AdminGptKeySummary>
  testAdminGptKey(keyUuid: string): Promise<AdminGptKeyTestResult>
}
