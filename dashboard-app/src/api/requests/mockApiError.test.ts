import { describe, expect, it } from 'vitest'
import { ApiClientError } from '../types/api-error'
import { createMockApiError, notifyMockStreamError, withMockApiAdapterErrors } from './mockApiError'

describe('mockApiError', () : void => {
  it('normalizes raw mock errors to ApiClientError', () : void => {
    const error: ApiClientError = createMockApiError(new Error('로그인이 필요합니다.'))

    expect(error).toBeInstanceOf(ApiClientError)
    expect(error.kind).toBe('auth')
    expect(error.code).toBe('MOCK_API_ERROR')
    expect(error.message).toBe('로그인이 필요합니다.')
  })

  it('wraps rejected mock adapter promises', async () : Promise<void> => {
    const api: { load: () => Promise<string> } = withMockApiAdapterErrors({
      load: async () : Promise<string> => {
        throw new Error('상품을 찾을 수 없습니다.')
      },
    })

    await expect(api.load()).rejects.toMatchObject({
      kind: 'not-found',
      code: 'MOCK_API_ERROR',
      message: '상품을 찾을 수 없습니다.',
    })
  })

  it('wraps synchronous mock adapter failures', () : void => {
    const api: { load: () => string } = withMockApiAdapterErrors({
      load: () : string => {
        throw new Error('입력값을 확인하세요.')
      },
    })

    expect(() : string => api.load()).toThrow(ApiClientError)
  })

  it('normalizes stream setup failures before notifying listeners', () : void => {
    let receivedError: unknown = null
    const onError: (error: unknown) => void = (error: unknown) : void => {
      receivedError = error
    }

    notifyMockStreamError(onError, new Error('관리자 권한이 필요합니다.'))

    expect(receivedError).toMatchObject({
      kind: 'permission',
      code: 'MOCK_API_ERROR',
      message: '관리자 권한이 필요합니다.',
    })
  })
})
