import {
  ApiClientError,
  classifyApiFailureStatus,
  isApiErrorResponse,
  readApiErrorCode,
} from '../types/api-error'
import type { ApiFailureKind } from '../types/api-error'

export type ApiQueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (string | number | boolean)[]

export type ApiQueryParams = Record<string, ApiQueryValue>

export type ApiRequestOptions = Omit<RequestInit, 'body'> & { query?: ApiQueryParams; body?: BodyInit | object | null }

export type ApiAdapterMode = 'mock' | 'http'

function createApiClientError(
  kind: ApiFailureKind,
  message: string,
  code: string,
  metadata: Omit<ConstructorParameters<typeof ApiClientError>[2], 'code'> = {},
): ApiClientError {
  return new ApiClientError(kind, message, { ...metadata, code })
}

export class ApiHttpError extends ApiClientError {
  readonly status: number
  readonly body: unknown

  constructor(
    status: number,
    message: string,
    body: unknown,
    kind: ApiFailureKind = classifyApiFailureStatus(status),
    code: string | undefined = readApiErrorCode(body),
  ) {
    super(kind, message, { body, code, status })
    this.name = 'ApiHttpError'
    this.status = status
    this.body = body
  }
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'
export const API_ADAPTER_MODE: ApiAdapterMode =
  String(import.meta.env.VITE_USE_MOCK_API ?? 'true').toLowerCase() === 'false' ? 'http' : 'mock'
export const USE_MOCK_API = API_ADAPTER_MODE === 'mock'

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

function readErrorName(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('name' in error)) return undefined
  const name = (error as { name?: unknown }).name
  return typeof name === 'string' ? name : undefined
}

function classifyTransportFailure(error: unknown): ApiFailureKind {
  const name = readErrorName(error)
  if (name === 'AbortError' || name === 'TimeoutError') return 'timeout'
  return 'network'
}

function createTransportFailure(
  error: unknown,
  timeoutMessage: string,
  networkMessage: string,
  timeoutCode: string,
  networkCode: string,
  status?: number,
): ApiClientError {
  const kind = classifyTransportFailure(error)
  return createApiClientError(kind, kind === 'timeout' ? timeoutMessage : networkMessage, kind === 'timeout' ? timeoutCode : networkCode, {
    cause: error,
    ...(status == null ? {} : { status }),
  })
}

function createFetchFailure(error: unknown): ApiClientError {
  return createTransportFailure(
    error,
    'API 요청 시간이 초과되었습니다.',
    'API 서버에 연결하지 못했습니다.',
    'REQUEST_TIMEOUT',
    'NETWORK_ERROR',
  )
}
function createResponseReadFailure(error: unknown, status: number): ApiClientError {
  return createTransportFailure(
    error,
    'API 응답 수신 시간이 초과되었습니다.',
    'API 응답 본문을 읽지 못했습니다.',
    'RESPONSE_TIMEOUT',
    'RESPONSE_READ_FAILED',
    status,
  )
}
function createResponseParseFailure(error: unknown, status: number, body: string): ApiClientError {
  return createApiClientError('parse', 'API 응답 JSON을 해석하지 못했습니다.', 'RESPONSE_PARSE_FAILED', {
    body,
    cause: error,
    status,
  })
}
async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined
  let text: string
  try {
    text = await response.text()
  } catch (error) {
    throw createResponseReadFailure(error, response.status)
  }
  if (!text) return undefined
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return text
  try {
    return JSON.parse(text) as unknown
  } catch (error) {
    throw createResponseParseFailure(error, response.status, text)
  }
}

function getHttpFallbackMessage(status: number, statusText: string): string {
  if (status === 401) return '로그인이 만료되었습니다. 다시 로그인해 주세요.'
  if (status === 403) return '권한이 없습니다.'
  if (status === 408 || status === 504) return '요청 시간이 초과되었습니다.'
  if (status === 422) return '요청 값을 확인해 주세요.'
  if (status >= 500 && status <= 599) return '서버 오류가 발생했습니다.'
  return statusText || 'API 요청에 실패했습니다.'
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
  let url: string
  let requestBody: BodyInit | undefined
  let headers: Headers

  try {
    url = buildApiUrl(path, options.query)
    requestBody = prepareBody(options.body)
    headers = prepareHeaders(options)
  } catch (error) {
    throw createApiClientError('client', 'API 요청을 생성하지 못했습니다.', 'REQUEST_CREATE_FAILED', {
      cause: error,
    })
  }

  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      body: requestBody,
      credentials: options.credentials ?? 'include',
      headers,
    })
  } catch (error) {
    throw createFetchFailure(error)
  }

  const responseBody = await readResponseBody(response)
  if (!response.ok) {
    throw new ApiHttpError(
      response.status,
      getErrorMessage(responseBody, getHttpFallbackMessage(response.status, response.statusText)),
      responseBody,
    )
  }
  return responseBody as T
}

export type ApiEventStreamSubscription = { close: () => void }
export type ApiEventStreamOptions = { onError?: (error: ApiClientError) => void }

function createStreamFailure(
  kind: ApiFailureKind,
  message: string,
  code: string,
  cause: unknown,
  body?: string,
): ApiClientError {
  return createApiClientError(kind, message, code, { body, cause })
}
export function openApiEventStream<T>(
  path: string,
  query: ApiQueryParams | undefined,
  listener: (event: T) => void,
  options: ApiEventStreamOptions = {},
): ApiEventStreamSubscription {
  let eventSource: EventSource
  try {
    eventSource = new EventSource(buildApiUrl(path, query), { withCredentials: true })
  } catch (error) {
    throw createStreamFailure('network', '스트림 연결을 시작하지 못했습니다.', 'SSE_OPEN_FAILED', error)
  }
  eventSource.onmessage = (message) => {
    if (!message.data) return
    let parsed: T
    try {
      parsed = JSON.parse(message.data) as T
    } catch (error) {
      eventSource.close()
      options.onError?.(createStreamFailure(
        'stream-protocol',
        '스트림 메시지를 해석하지 못했습니다.',
        'SSE_MESSAGE_PARSE_FAILED',
        error,
        message.data,
      ))
      return
    }
    listener(parsed)
  }
  eventSource.onerror = (event) => {
    options.onError?.(createStreamFailure('network', '스트림 연결에 실패했습니다.', 'SSE_CONNECTION_ERROR', event))
  }
  return {
    close: () => eventSource.close(),
  }
}
