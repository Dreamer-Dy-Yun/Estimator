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
