import type { SecondaryInboundSplitSupplyPoint } from '../types'
import { resolvePublicAssetUrl } from '../publicAsset'

const SECONDARY_INBOUND_SPLIT_SOURCE_FIXTURE_DIR = 'mock/secondaryInboundSplitSourceFixtures' as const
const INBOUND_SPLIT_SCOPE_ALL_KEY = '__mock-all-company__' as const
const DAY_MS = 86_400_000 as const

type SecondaryInboundSplitSourceFixtureCell = {
  sale: number
  inbound: number
}

export type SecondaryInboundSplitSourceFixtureEntry = {
  stockBySize: Record<string, number>
  expectationByDate: Record<string, Record<string, SecondaryInboundSplitSourceFixtureCell>>
}

export type SecondaryInboundSplitSourceFixture = {
  schema: 'secondary-inbound-split-source:scope:v1'
  scopeKey: string
  rangeStart: string
  rangeEnd: string
  entries: Record<string, SecondaryInboundSplitSourceFixtureEntry>
}

type FixtureFetchResponse = {
  ok: boolean
  status: number
  statusText: string
  json: () => Promise<unknown>
}

type FixtureFetch = (input: string) => Promise<FixtureFetchResponse>

const fixturePromisesByScope: Map<string, Promise<SecondaryInboundSplitSourceFixture>> = new Map()

const formatIsoDate: (date: Date) => string = (date: Date): string => date.toISOString().slice(0, 10)

function parseIsoDateStart(value: string, field: string): number {
  const match: RegExpMatchArray | null = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new Error(`Secondary inbound split source ${field} must be a valid ISO date.`)
  const year: number = Number(match[1])
  const monthIndex: number = Number(match[2]) - 1
  const day: number = Number(match[3])
  const parsed: Date = new Date(Date.UTC(year, monthIndex, day))
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== monthIndex || parsed.getUTCDate() !== day) {
    throw new Error(`Secondary inbound split source ${field} must be a valid ISO date.`)
  }
  return parsed.getTime()
}

function isFixture(value: unknown): value is SecondaryInboundSplitSourceFixture {
  if (value == null || typeof value !== 'object') return false
  const candidate: Partial<SecondaryInboundSplitSourceFixture> = value as Partial<SecondaryInboundSplitSourceFixture>
  return candidate.schema === 'secondary-inbound-split-source:scope:v1' &&
    typeof candidate.scopeKey === 'string' &&
    typeof candidate.rangeStart === 'string' &&
    typeof candidate.rangeEnd === 'string' &&
    candidate.entries != null &&
    typeof candidate.entries === 'object'
}

function fixtureAssetPath(scopeKey: string): string {
  return `${SECONDARY_INBOUND_SPLIT_SOURCE_FIXTURE_DIR}/${encodeURIComponent(scopeKey)}.json`
}

async function fetchSecondaryInboundSplitSourceFixture(
  scopeKey: string,
  fetcher: FixtureFetch,
): Promise<SecondaryInboundSplitSourceFixture> {
  if (typeof fetcher !== 'function') {
    throw new Error('Secondary inbound split source fixture loader requires fetch.')
  }

  const url: string = resolvePublicAssetUrl(fixtureAssetPath(scopeKey))
  const response: FixtureFetchResponse = await fetcher(url)
  if (!response.ok) {
    throw new Error(`Secondary inbound split source fixture request failed: ${response.status} ${response.statusText}`)
  }

  const fixture: unknown = await response.json()
  if (!isFixture(fixture)) throw new Error('Secondary inbound split source fixture shape is invalid.')
  if (fixture.scopeKey !== scopeKey) {
    throw new Error(`Secondary inbound split source fixture scope mismatch: expected ${scopeKey}, got ${fixture.scopeKey}.`)
  }
  return fixture
}

export async function loadSecondaryInboundSplitSourceFixture(
  scopeKey: string,
  fetcher: FixtureFetch = globalThis.fetch as FixtureFetch,
): Promise<SecondaryInboundSplitSourceFixture> {
  let fixturePromise: Promise<SecondaryInboundSplitSourceFixture> | undefined = fixturePromisesByScope.get(scopeKey)
  fixturePromise ??= fetchSecondaryInboundSplitSourceFixture(scopeKey, fetcher).catch((error: unknown): never => {
    fixturePromisesByScope.delete(scopeKey)
    throw error
  })
  fixturePromisesByScope.set(scopeKey, fixturePromise)
  return fixturePromise
}

export function resetSecondaryInboundSplitSourceFixtureCacheForTest(): void {
  fixturePromisesByScope.clear()
}

export function getSecondaryInboundSplitSourceFixtureScopeKey(baseScope: { companyUuid?: string; }): string {
  return baseScope.companyUuid == null ? INBOUND_SPLIT_SCOPE_ALL_KEY : baseScope.companyUuid
}

export function getSecondaryInboundSplitSourceFixtureEntry(
  fixture: SecondaryInboundSplitSourceFixture,
  skuGroupKey: string,
): SecondaryInboundSplitSourceFixtureEntry {
  const cached: SecondaryInboundSplitSourceFixtureEntry | undefined = fixture.entries[skuGroupKey]
  if (cached == null) {
    throw new Error(`Missing secondary inbound split fixture for sku: ${skuGroupKey}`)
  }
  return cached
}

export function buildSecondaryInboundSplitSourceData(
  fixture: SecondaryInboundSplitSourceFixture,
  cached: SecondaryInboundSplitSourceFixtureEntry,
  calculationBaseDate: string,
  coverageEndDate: string,
): {
  supplyBySize: Record<string, SecondaryInboundSplitSupplyPoint[]>
  salesForecastByDate: Record<string, Record<string, number>>
} {
  const start: number = parseIsoDateStart(calculationBaseDate, 'calculationBaseDate')
  const end: number = parseIsoDateStart(coverageEndDate, 'coverageEndDate')
  const precomputedStart: number = parseIsoDateStart(fixture.rangeStart, 'rangeStart')
  const precomputedEnd: number = parseIsoDateStart(fixture.rangeEnd, 'rangeEnd')
  if (start < precomputedStart || end > precomputedEnd) {
    throw new Error(
      `Secondary inbound split source precomputed date range supports ${fixture.rangeStart} <= calculationBaseDate < coverageEndDate <= ${fixture.rangeEnd}.`,
    )
  }
  if (end <= start) {
    throw new Error('Secondary inbound split source date range must satisfy calculationBaseDate < coverageEndDate.')
  }

  const supplyBySize: Record<string, SecondaryInboundSplitSupplyPoint[]> = Object.fromEntries(
    Object.entries(cached.stockBySize).map(([size, qty]: [string, number]): [string, SecondaryInboundSplitSupplyPoint[]] => [
      size,
      [{ date: calculationBaseDate, qty }],
    ]),
  )
  const salesForecastByDate: Record<string, Record<string, number>> = {}
  for (let time: number = start; time < end; time += DAY_MS) {
    const date: string = formatIsoDate(new Date(time))
    const row: Record<string, SecondaryInboundSplitSourceFixtureCell> | undefined = cached.expectationByDate[date]
    if (row == null) {
      throw new Error(`Secondary inbound split source precomputed data missing for date ${date}.`)
    }
    salesForecastByDate[date] = {}
    Object.entries(row).forEach(([size, cell]: [string, SecondaryInboundSplitSourceFixtureCell]): void => {
      salesForecastByDate[date][size] = cell.sale
      if (cell.inbound > 0) {
        const points: SecondaryInboundSplitSupplyPoint[] = supplyBySize[size] ?? []
        points.push({ date, qty: cell.inbound })
        supplyBySize[size] = points
      }
    })
  }
  return { supplyBySize, salesForecastByDate }
}
