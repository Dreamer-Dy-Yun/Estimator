import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../types/api-error'
import { ApiHttpError, apiRequest, openApiEventStream } from './httpClient'

const fetchMock = vi.fn()

class EventSourceMock {
  static instances: EventSourceMock[] = []

  readonly url: string
  readonly options?: EventSourceInit
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  close = vi.fn()

  constructor(url: string, options?: EventSourceInit) {
    this.url = url
    this.options = options
    EventSourceMock.instances.push(this)
  }

  emitMessage(data: string) {
    this.onmessage?.({ data } as MessageEvent)
  }

  emitError(event: Event = new Event('error')) {
    this.onerror?.(event)
  }
}

function stubEventSource() {
  EventSourceMock.instances = []
  vi.stubGlobal('EventSource', EventSourceMock)
}

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
  EventSourceMock.instances = []
})

describe('apiRequest', () => {
  it('preserves backend error message, code, and failure kind', async () => {
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

  it('classifies validation errors only for the 422 contract', async () => {
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

  it('uses distinct fallback messages for 401 and 403', async () => {
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

  it('normalizes fetch network failures as ApiClientError', async () => {
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

  it('normalizes aborted fetches as timeout failures', async () => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockRejectedValue({ name: 'AbortError' })

    await expect(apiRequest('/timeout')).rejects.toMatchObject({
      kind: 'timeout',
      code: 'REQUEST_TIMEOUT',
      message: 'API 요청 시간이 초과되었습니다.',
    })
  })

  it('exposes invalid JSON responses as parse failures', async () => {
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

describe('openApiEventStream', () => {
  it('normalizes SSE connection errors for onError', () => {
    stubEventSource()
    const onError = vi.fn()

    openApiEventStream('/events', undefined, vi.fn(), { onError })
    EventSourceMock.instances[0].emitError()

    const error = onError.mock.calls[0][0]
    expect(error).toBeInstanceOf(ApiClientError)
    expect(error).toMatchObject({
      kind: 'network',
      code: 'SSE_CONNECTION_ERROR',
      message: '스트림 연결에 실패했습니다.',
    })
  })

  it('closes malformed SSE payloads and reports stream protocol failures', () => {
    stubEventSource()
    const listener = vi.fn()
    const onError = vi.fn()

    openApiEventStream('/events', undefined, listener, { onError })
    const eventSource = EventSourceMock.instances[0]
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
