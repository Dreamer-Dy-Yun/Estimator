export type ApiFailureKind =
  | 'authentication'
  | 'permission'
  | 'not-found'
  | 'conflict'
  | 'validation'
  | 'server'
  | 'client'
  | 'unknown'

export interface ApiErrorResponse {
  message: string
  code?: string
  details?: unknown
}

export function isApiErrorResponse(body: unknown): body is ApiErrorResponse {
  if (!body || typeof body !== 'object' || !('message' in body)) return false
  return typeof (body as { message?: unknown }).message === 'string'
}

export function classifyApiFailureStatus(status: number): ApiFailureKind {
  if (status === 401) return 'authentication'
  if (status === 403) return 'permission'
  if (status === 404) return 'not-found'
  if (status === 409) return 'conflict'
  if (status === 422) return 'validation'
  if (status >= 500 && status <= 599) return 'server'
  if (status >= 400 && status <= 499) return 'client'
  return 'unknown'
}

export function readApiErrorCode(body: unknown): string | undefined {
  if (!isApiErrorResponse(body)) return undefined
  const code = body.code
  if (typeof code === 'string' && code.trim()) return code
  return undefined
}
