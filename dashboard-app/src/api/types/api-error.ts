export type ApiFailureKind =
  | 'network'
  | 'timeout'
  | 'parse'
  | 'auth'
  | 'permission'
  | 'not-found'
  | 'conflict'
  | 'validation'
  | 'server'
  | 'client'
  | 'stream-protocol'
  | 'unknown'

export interface ApiClientErrorOptions {
  code?: string
  status?: number
  body?: unknown
  cause?: unknown
}

export class ApiClientError extends Error {
  readonly kind: ApiFailureKind
  readonly code?: string
  readonly status?: number
  readonly body?: unknown
  readonly cause?: unknown

  constructor(kind: ApiFailureKind, message: string, options: ApiClientErrorOptions = {}) {
    super(message)
    this.name = 'ApiClientError'
    Object.setPrototypeOf(this, new.target.prototype)
    this.kind = kind
    if (options.code) this.code = options.code
    if (options.status !== undefined) this.status = options.status
    if ('body' in options) this.body = options.body
    if (options.cause !== undefined) this.cause = options.cause
  }
}

export interface ApiErrorResponse {
  message: string
  code?: string
  details?: unknown
}

export function isApiErrorResponse(body: unknown): body is ApiErrorResponse {
  if (!body || typeof body !== 'object' || !('message' in body)) return false
  return typeof (body as { message?: unknown }).message === 'string'
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError
}

const DEFAULT_API_ERROR_DISPLAY_MESSAGE = 'API 요청에 실패했습니다.'

const API_ERROR_DISPLAY_MESSAGES: Partial<Record<ApiFailureKind, string>> = {
  auth: '로그인이 필요합니다. 다시 로그인해 주세요.',
  permission: '권한이 없습니다.',
  network: '서버에 연결하지 못했습니다. 네트워크 상태를 확인해 주세요.',
  timeout: '요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.',
  parse: '서버 응답을 해석하지 못했습니다.',
  'stream-protocol': '실시간 응답을 해석하지 못했습니다.',
  validation: '요청 값을 확인해 주세요.',
  server: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  'not-found': '요청한 데이터를 찾을 수 없습니다.',
  conflict: '이미 변경된 데이터입니다. 새로고침 후 다시 시도해 주세요.',
}

function normalizeFallbackMessage(fallback: string): string {
  const normalized = fallback.trim()
  return normalized || DEFAULT_API_ERROR_DISPLAY_MESSAGE
}

export function getApiErrorDisplayMessage(
  error: unknown,
  fallback = DEFAULT_API_ERROR_DISPLAY_MESSAGE,
): string {
  const fallbackMessage = normalizeFallbackMessage(fallback)
  if (!isApiClientError(error)) return fallbackMessage
  return API_ERROR_DISPLAY_MESSAGES[error.kind] ?? fallbackMessage
}

export function classifyApiFailureStatus(status: number): ApiFailureKind {
  if (status === 401) return 'auth'
  if (status === 403) return 'permission'
  if (status === 408 || status === 504) return 'timeout'
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
