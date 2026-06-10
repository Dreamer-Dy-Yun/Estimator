import { afterEach, describe, expect, it, vi , type Mock} from 'vitest';
import { ApiClientError } from '../types/api-error'
import { API_ADAPTER_MODE, ApiHttpError, USE_MOCK_API, apiRequest, openApiEventStream } from './httpClient'

const fetchMock: Mock<(...args: unknown[]) => unknown> = vi.fn()

class EventSourceMock {
  static instances: EventSourceMock[] = []

  readonly url: string
  readonly options?: EventSourceInit
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  close: Mock<(...args: unknown[]) => unknown> = vi.fn()

  constructor(url: string, options?: EventSourceInit) {
    this.url = url
    this.options = options
    EventSourceMock.instances.push(this)
  }

  emitMessage(data: string) : void {
    this.onmessage?.({ data } as MessageEvent)
  }

  emitError(event: Event = new Event('error')) : void {
    this.onerror?.(event)
  }
}

function stubEventSource() : void {
  EventSourceMock.instances = []
  vi.stubGlobal('EventSource', EventSourceMock)
}

afterEach(() : void => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  fetchMock.mockReset()
  EventSourceMock.instances = []
})

describe('api adapter mode contract', () : void => {
  it('defaults to HTTP mode unless mock mode is explicitly requested', () : void => {
    expect(API_ADAPTER_MODE).toBe('http')
  })

  it('keeps the named adapter mode aligned with the legacy mock boolean', () : void => {
    expect(['mock', 'http']).toContain(API_ADAPTER_MODE)
    expect(API_ADAPTER_MODE).toBe(USE_MOCK_API ? 'mock' : 'http')
  })

  it('rejects invalid mock mode environment values during module initialization', async () : Promise<void> => {
    vi.stubEnv('VITE_USE_MOCK_API', 'maybe')
    vi.resetModules()

    await expect(import('./httpClient')).rejects.toThrow('Invalid VITE_USE_MOCK_API')
  })

  it('rejects missing API base URL for production HTTP mode during module initialization', async () : Promise<void> => {
    vi.stubEnv('PROD', true)
    vi.stubEnv('VITE_USE_MOCK_API', 'false')
    vi.stubEnv('VITE_API_BASE_URL', '')
    vi.resetModules()

    await expect(import('./httpClient')).rejects.toThrow('VITE_API_BASE_URL is required')
  })
})

describe('apiRequest', () : void => {
  it('serializes successful JSON requests with query, headers, credentials, and body', async () : Promise<void> => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))

    const result: { ok: boolean } = await apiRequest('/items', {
      method: 'POST',
      query: {
        q: 'a b',
        blank: '',
        none: null,
        arr: ['x', 2, true],
      },
      body: { count: 1 },
    })

    const requestUrl: string = fetchMock.mock.calls[0]?.[0] as string
    const requestInit: RequestInit = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers: Headers = requestInit.headers as Headers
    expect(result).toEqual({ ok: true })
    expect(requestUrl).toBe('http://localhost:8080/api/v1/items?q=a+b&arr=x&arr=2&arr=true')
    expect(requestInit.credentials).toBe('include')
    expect(requestInit.method).toBe('POST')
    expect(requestInit.body).toBe(JSON.stringify({ count: 1 }))
    expect(headers.get('Accept')).toBe('application/json')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('preserves FormData request bodies without adding JSON content type', async () : Promise<void> => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    const body: FormData = new FormData()
    body.append('file', new File(['x'], 'x.txt'))

    await apiRequest('/upload', { method: 'POST', body })

    const requestInit: RequestInit = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers: Headers = requestInit.headers as Headers
    expect(requestInit.body).toBe(body)
    expect(headers.get('Accept')).toBe('application/json')
    expect(headers.has('Content-Type')).toBe(false)
  })

  it('preserves backend error message, code, and failure kind', async () : Promise<void> => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      message: '권한이 없습니다.',
      code: 'NO_PERMISSION',
    }), {
      status: 403,
      statusText: 'Forbidden',
      headers: { 'content-type': 'application/json' },
    }))

    let error: unknown
    try {
      await apiRequest('/admin')
    } catch (err) {
      error = err
    }

    expect(error).toBeInstanceOf(ApiHttpError)
    expect(error).toBeInstanceOf(ApiClientError)
    expect(error).toMatchObject({
      status: 403,
      message: '권한이 없습니다.',
      kind: 'permission',
      code: 'NO_PERMISSION',
    })
  })

  it('classifies validation errors only for the 422 contract', async () : Promise<void> => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      message: '요청 조건을 확인하세요.',
      code: 'VALIDATION_FAILED',
    }), {
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: { 'content-type': 'application/json' },
    }))

    await expect(apiRequest('/candidate-items')).rejects.toMatchObject({
      kind: 'validation',
      code: 'VALIDATION_FAILED',
      message: '요청 조건을 확인하세요.',
    })
  })

  it('uses distinct fallback messages for 401 and 403', async () : Promise<void> => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock
      .mockResolvedValueOnce(new Response('', {
        status: 401,
        statusText: 'Unauthorized',
      }))
      .mockResolvedValueOnce(new Response('', {
        status: 403,
        statusText: 'Forbidden',
      }))

    await expect(apiRequest('/me')).rejects.toMatchObject({
      kind: 'auth',
      message: '로그인이 만료되었습니다. 다시 로그인해 주세요.',
    })
    await expect(apiRequest('/admin')).rejects.toMatchObject({
      kind: 'permission',
      message: '권한이 없습니다.',
    })
  })

  it('normalizes fetch network failures as ApiClientError', async () : Promise<void> => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    let error: unknown
    try {
      await apiRequest('/network')
    } catch (err) {
      error = err
    }

    expect(error).toBeInstanceOf(ApiClientError)
    expect(error).toMatchObject({
      kind: 'network',
      code: 'NETWORK_ERROR',
      message: 'API 서버에 연결하지 못했습니다.',
    })
  })

  it('normalizes aborted fetches as timeout failures', async () : Promise<void> => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockRejectedValue({ name: 'AbortError' })

    await expect(apiRequest('/timeout')).rejects.toMatchObject({
      kind: 'timeout',
      code: 'REQUEST_TIMEOUT',
      message: 'API 요청 시간이 초과되었습니다.',
    })
  })

  it('exposes invalid JSON responses as parse failures', async () : Promise<void> => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue(new Response('{invalid', {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
    }))

    let error: unknown
    try {
      await apiRequest('/broken-json')
    } catch (err) {
      error = err
    }

    expect(error).toBeInstanceOf(ApiClientError)
    expect(error).toMatchObject({
      kind: 'parse',
      code: 'RESPONSE_PARSE_FAILED',
      status: 200,
      body: '{invalid',
    })
  })
})

describe('openApiEventStream', () : void => {
  it('normalizes SSE connection errors for onError', () : void => {
    stubEventSource()
    const onError: Mock<(...args: unknown[]) => unknown> = vi.fn()

    openApiEventStream('/events', undefined, vi.fn(), { onError })
    EventSourceMock.instances[0].emitError()

    const error: unknown = onError.mock.calls[0][0]
    expect(error).toBeInstanceOf(ApiClientError)
    expect(error).toMatchObject({
      kind: 'network',
      code: 'SSE_CONNECTION_ERROR',
      message: '스트림 연결에 실패했습니다.',
    })
  })

  it('closes malformed SSE payloads and reports stream protocol failures', () : void => {
    stubEventSource()
    const listener: Mock<(...args: unknown[]) => unknown> = vi.fn()
    const onError: Mock<(...args: unknown[]) => unknown> = vi.fn()

    openApiEventStream('/events', undefined, listener, { onError })
    const eventSource: EventSourceMock = EventSourceMock.instances[0]
    eventSource.emitMessage('{invalid')

    expect(listener).not.toHaveBeenCalled()
    expect(eventSource.close).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0]).toBeInstanceOf(ApiClientError)
    expect(onError.mock.calls[0][0]).toMatchObject({
      kind: 'stream-protocol',
      code: 'SSE_MESSAGE_PARSE_FAILED',
      body: '{invalid',
      message: '스트림 메시지를 해석하지 못했습니다.',
    })
  })
})
