import { classifyApiFailureStatus, isApiErrorResponse, readApiErrorCode } from '../types/api-error'
import type { ApiFailureKind } from '../types/api-error'

export type ApiQueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (string | number | boolean)[]

export type ApiQueryParams = Record<string, ApiQueryValue>

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  query?: ApiQueryParams
  body?: BodyInit | object | null
}

export class ApiHttpError extends Error {
  readonly status: number
  readonly body: unknown
  readonly kind: ApiFailureKind
  readonly code?: string

  constructor(
    status: number,
    message: string,
    body: unknown,
    kind: ApiFailureKind = classifyApiFailureStatus(status),
    code: string | undefined = readApiErrorCode(body),
  ) {
    super(message)
    this.name = 'ApiHttpError'
    this.status = status
    this.body = body
    this.kind = kind
    if (code) this.code = code
  }
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'
export const USE_MOCK_API = String(import.meta.env.VITE_USE_MOCK_API ?? 'true').toLowerCase() !== 'false'

function appendQueryParam(searchParams: URLSearchParams, key: string, value: ApiQueryValue) {
  if (value == null || value === '') return
  if (Array.isArray(value)) {
    for (const item of value) searchParams.append(key, String(item))
    return
  }
  searchParams.set(key, String(value))
}

export function buildApiUrl(path: string, query?: ApiQueryParams): string {
  const base = `${API_BASE_URL.replace(/\/+$/, '')}/`
  const normalizedPath = path.replace(/^\/+/, '')
  const url = new URL(normalizedPath, base)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      appendQueryParam(url.searchParams, key, value)
    }
  }
  return url.toString()
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined
  const text = await response.text()
  if (!text) return undefined
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return text
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function getErrorMessage(body: unknown, fallback: string): string {
  if (isApiErrorResponse(body)) {
    const message = body.message.trim()
    if (message) return message
  }
  if (typeof body === 'string' && body.trim()) return body
  return fallback
}

function prepareBody(body: ApiRequestOptions['body']): BodyInit | undefined {
  if (body == null) return undefined
  if (body instanceof FormData) return body
  if (body instanceof Blob) return body
  if (body instanceof URLSearchParams) return body
  if (typeof body === 'string') return body
  return JSON.stringify(body)
}

function prepareHeaders(options: ApiRequestOptions): Headers {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  const body = options.body
  if (body && !(body instanceof FormData) && !(body instanceof Blob) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return headers
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await fetch(buildApiUrl(path, options.query), {
    ...options,
    body: prepareBody(options.body),
    credentials: options.credentials ?? 'include',
    headers: prepareHeaders(options),
  })
  const body = await readResponseBody(response)
  if (!response.ok) {
    throw new ApiHttpError(response.status, getErrorMessage(body, response.statusText), body)
  }
  return body as T
}

export interface ApiEventStreamSubscription {
  close: () => void
}

export interface ApiEventStreamOptions {
  onError?: (event: Event) => void
}

export function openApiEventStream<T>(
  path: string,
  query: ApiQueryParams | undefined,
  listener: (event: T) => void,
  options: ApiEventStreamOptions = {},
): ApiEventStreamSubscription {
  const eventSource = new EventSource(buildApiUrl(path, query), { withCredentials: true })
  eventSource.onmessage = (message) => {
    if (!message.data) return
    listener(JSON.parse(message.data) as T)
  }
  eventSource.onerror = (event) => {
    options.onError?.(event)
  }
  return {
    close: () => eventSource.close(),
  }
}
