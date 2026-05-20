import { describe, expect, it } from 'vitest'
import type { ApiFailureKind } from './api-error'
import { ApiClientError, classifyApiFailureStatus, getApiErrorDisplayMessage } from './api-error'

describe('classifyApiFailureStatus', () => {
  const cases: Array<[number, ApiFailureKind]> = [
    [401, 'auth'],
    [403, 'permission'],
    [408, 'timeout'],
    [404, 'not-found'],
    [409, 'conflict'],
    [422, 'validation'],
    [500, 'server'],
    [503, 'server'],
    [504, 'timeout'],
    [599, 'server'],
  ]

  it.each(cases)('classifies %i as %s', (status, kind) => {
    expect(classifyApiFailureStatus(status)).toBe(kind)
  })

  it('classifies other 4xx statuses as client failures', () => {
    expect(classifyApiFailureStatus(400)).toBe('client')
    expect(classifyApiFailureStatus(429)).toBe('client')
  })

  it('classifies non-error statuses as unknown', () => {
    expect(classifyApiFailureStatus(200)).toBe('unknown')
    expect(classifyApiFailureStatus(302)).toBe('unknown')
  })
})

describe('getApiErrorDisplayMessage', () => {
  const cases: Array<[ApiFailureKind, string]> = [
    ['auth', '로그인이 필요합니다. 다시 로그인해 주세요.'],
    ['permission', '권한이 없습니다.'],
    ['network', '서버에 연결하지 못했습니다. 네트워크 상태를 확인해 주세요.'],
    ['timeout', '요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.'],
    ['parse', '서버 응답을 해석하지 못했습니다.'],
    ['stream-protocol', '실시간 응답을 해석하지 못했습니다.'],
    ['validation', '요청 값을 확인해 주세요.'],
    ['server', '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'],
    ['not-found', '요청한 데이터를 찾을 수 없습니다.'],
    ['conflict', '이미 변경된 데이터입니다. 새로고침 후 다시 시도해 주세요.'],
  ]

  it.each(cases)('returns the display message for %s failures', (kind, message) => {
    expect(getApiErrorDisplayMessage(new ApiClientError(kind, 'raw backend message'), 'fallback')).toBe(message)
  })

  it('uses the fallback for non API errors and unmapped API failure kinds', () => {
    expect(getApiErrorDisplayMessage(new Error('raw error'), '요청을 처리하지 못했습니다.')).toBe(
      '요청을 처리하지 못했습니다.',
    )
    expect(getApiErrorDisplayMessage(new ApiClientError('client', 'request setup failed'), '요청을 처리하지 못했습니다.')).toBe(
      '요청을 처리하지 못했습니다.',
    )
  })

  it('uses the default fallback when the provided fallback is blank', () => {
    expect(getApiErrorDisplayMessage(new Error('raw error'), '   ')).toBe('API 요청에 실패했습니다.')
  })
})
