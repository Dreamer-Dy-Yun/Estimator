import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiHttpError, apiRequest } from './httpClient'

const fetchMock = vi.fn()

afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
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
})
