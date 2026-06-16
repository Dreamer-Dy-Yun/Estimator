import type { ProductComparisonBaseSubjectRef } from '../types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMockSecondaryInboundSplitSource } from './mockProductComparisonApi'
import { MOCK_HANA_COMPANY_UUID } from './mockCompanyScope'
import { resetSecondaryInboundSplitSourceFixtureCacheForTest } from './secondaryInboundSplitSourceFixture'

const TEST_SHOE_SKU_GROUP_KEY = 'TEST-SHOE__210' as const
const MOCK_BASE_SUBJECT: ProductComparisonBaseSubjectRef = {
  role: 'base',
  kind: 'self-company',
  sourceId: MOCK_HANA_COMPANY_UUID,
}

type MockFetchResponse = {
  ok: boolean
  status: number
  statusText: string
  json: () => Promise<unknown>
}

function nextIsoDate(value: string): string {
  const [year, month, day]: number[] = value.split('-').map(Number)
  const date: Date = new Date(Date.UTC(year, month - 1, day + 1))
  return date.toISOString().slice(0, 10)
}

function buildExpectationByDate(startInclusive: string, endExclusive: string): Record<string, Record<string, { sale: number; inbound: number }>> {
  const rows: Record<string, Record<string, { sale: number; inbound: number }>> = {}
  for (let date: string = startInclusive; date < endExclusive; date = nextIsoDate(date)) {
    rows[date] = {
      '210': {
        sale: date === '2026-04-01' ? 2 : 1,
        inbound: date === '2026-04-01' ? 1 : 0,
      },
    }
  }
  return rows
}

function makeFixture(): unknown {
  return {
    schema: 'secondary-inbound-split-source:scope:v1',
    scopeKey: MOCK_HANA_COMPANY_UUID,
    rangeStart: '2026-01-01',
    rangeEnd: '2029-01-01',
    entries: {
      [TEST_SHOE_SKU_GROUP_KEY]: {
        stockBySize: { '210': 7 },
        expectationByDate: buildExpectationByDate('2026-04-01', '2029-01-01'),
      },
    },
  }
}

function stubFixtureFetch(fixture: unknown = makeFixture()): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (): Promise<MockFetchResponse> => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async (): Promise<unknown> => fixture,
  }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach((): void => {
  resetSecondaryInboundSplitSourceFixtureCacheForTest()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('getMockSecondaryInboundSplitSource', (): void => {
  it('loads the static split source fixture lazily and caches it', async (): Promise<void> => {
    const fetchMock: ReturnType<typeof vi.fn> = stubFixtureFetch()

    const result = await getMockSecondaryInboundSplitSource({
      skuGroupKey: TEST_SHOE_SKU_GROUP_KEY,
      dateStart: '2026-04-01',
      dateEnd: '2026-04-03',
      base: MOCK_BASE_SUBJECT,
    })
    const secondResult = await getMockSecondaryInboundSplitSource({
      skuGroupKey: TEST_SHOE_SKU_GROUP_KEY,
      dateStart: '2026-04-02',
      dateEnd: '2026-04-03',
      base: MOCK_BASE_SUBJECT,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/mock/secondaryInboundSplitSourceFixtures/00000000-0000-4000-8000-000000000101.json',
    )
    expect(result.stockBySize).toEqual({ '210': 7 })
    expect(result.expectationByDate['2026-04-01']?.['210']).toEqual({ sale: 2, inbound: 1 })
    expect(Object.keys(result.expectationByDate)).toEqual(['2026-04-01', '2026-04-02'])
    expect(Object.keys(secondResult.expectationByDate)).toEqual(['2026-04-02'])
  })

  it('accepts the current live default inbound date range when dateEnd is exclusive', async (): Promise<void> => {
    stubFixtureFetch()

    const result = await getMockSecondaryInboundSplitSource({
      skuGroupKey: TEST_SHOE_SKU_GROUP_KEY,
      dateStart: '2026-12-16',
      dateEnd: '2027-06-16',
      base: MOCK_BASE_SUBJECT,
    })

    expect(result.dateStart).toBe('2026-12-16')
    expect(result.dateEnd).toBe('2027-06-16')
    expect(result.expectationByDate['2026-12-16']?.['210']).toEqual({ sale: 1, inbound: 0 })
    expect(result.expectationByDate['2027-06-15']?.['210']).toEqual({ sale: 1, inbound: 0 })
    expect(result.expectationByDate['2027-06-16']).toBeUndefined()
  })

  it('rejects an empty or reversed date range instead of returning an empty source', async (): Promise<void> => {
    stubFixtureFetch()

    await expect(
      getMockSecondaryInboundSplitSource({
        skuGroupKey: TEST_SHOE_SKU_GROUP_KEY,
        dateStart: '2026-04-03',
        dateEnd: '2026-04-03',
        base: MOCK_BASE_SUBJECT,
      }),
    ).rejects.toThrow('dateStart < dateEnd')
  })

  it('clears the fixture cache after a failed static asset request', async (): Promise<void> => {
    const failedFetch = vi.fn(async (): Promise<MockFetchResponse> => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async (): Promise<unknown> => ({}),
    }))
    vi.stubGlobal('fetch', failedFetch)

    await expect(
      getMockSecondaryInboundSplitSource({
        skuGroupKey: TEST_SHOE_SKU_GROUP_KEY,
        dateStart: '2026-04-01',
        dateEnd: '2026-04-03',
        base: MOCK_BASE_SUBJECT,
      }),
    ).rejects.toThrow('Secondary inbound split source fixture request failed')

    const fetchMock: ReturnType<typeof vi.fn> = stubFixtureFetch()
    const result = await getMockSecondaryInboundSplitSource({
      skuGroupKey: TEST_SHOE_SKU_GROUP_KEY,
      dateStart: '2026-04-01',
      dateEnd: '2026-04-03',
      base: MOCK_BASE_SUBJECT,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.expectationByDate['2026-04-01']?.['210']).toEqual({ sale: 2, inbound: 1 })
  })
})
