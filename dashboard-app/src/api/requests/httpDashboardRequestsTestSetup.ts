import { beforeEach, vi, type Mock } from 'vitest'
import { ALL_COMPANY_UUID } from '../types/company'

const hoistedHttpClientMocks: { apiRequest: Mock<() => Promise<undefined>>; buildApiUrl: Mock<(path: string) => string>; openApiEventStream: Mock<() => { close: Mock<(...args: unknown[]) => unknown>; }>; } = vi.hoisted(() : { apiRequest: Mock<() => Promise<undefined>>; buildApiUrl: Mock<(path: string) => string>; openApiEventStream: Mock<() => { close: Mock<(...args: unknown[]) => unknown>; }>; } => ({
  apiRequest: vi.fn(() : Promise<undefined> => Promise.resolve(undefined)),
  buildApiUrl: vi.fn((path: string) : string => `http://api.test${path}`),
  openApiEventStream: vi.fn(() : { close: Mock<(...args: unknown[]) => unknown>; } => ({ close: vi.fn() })),
}))
export const httpClientMocks: typeof hoistedHttpClientMocks = hoistedHttpClientMocks

vi.mock('./httpClient', () : { apiRequest: Mock<() => Promise<undefined>>; buildApiUrl: Mock<(path: string) => string>; openApiEventStream: Mock<() => { close: Mock<(...args: unknown[]) => unknown>; }>; } => ({
  apiRequest: httpClientMocks.apiRequest,
  buildApiUrl: httpClientMocks.buildApiUrl,
  openApiEventStream: httpClientMocks.openApiEventStream,
}))

export const companyUuid = 'company-uuid-054' as const
export const baseSubject = { role: 'base', kind: 'self-company', sourceId: companyUuid } as const
export const allCompanyBaseSubject = { role: 'base', kind: 'self-company', sourceId: ALL_COMPANY_UUID } as const
export const unscopedBaseSubject = { role: 'base', kind: 'self-company' } as const
export const musinsaComparison = { role: 'comparison', kind: 'competitor-channel', sourceId: 'musinsa' } as const
export const kreamComparison = { role: 'comparison', kind: 'competitor-channel', sourceId: 'kream' } as const
export const missingSourceComparison = { role: 'comparison', kind: 'competitor-channel' } as const
export const roleMismatchBase = { role: 'comparison', kind: 'self-company', sourceId: companyUuid } as const
export type ApiRequestCall = [string, { query?: Record<string, unknown>; body?: unknown; method?: string }?]

beforeEach(() : void => {
  httpClientMocks.apiRequest.mockClear()
  httpClientMocks.buildApiUrl.mockClear()
  httpClientMocks.openApiEventStream.mockClear()
})
