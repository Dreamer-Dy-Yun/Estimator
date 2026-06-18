import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Regenerate with: npx --yes tsx scripts/generateSecondaryInboundSplitSourceFixtures.ts
import { allKnownSkuGroupKeys } from '../src/api/mock/salesTables'
import { MOCK_HANA_COMPANY_UUID, MOCK_T1_COMPANY_UUID } from '../src/api/mock/mockCompanyScope'
import { productSecondaryBySkuGroupKey } from '../src/api/mock/productCatalog'
import { scopeMockProductSecondary } from '../src/api/mock/mockCompanyScope'
import type { ProductSecondaryDetail } from '../src/types'

type SecondaryInboundSplitExpectationCell = {
  sale: number
  inbound: number
}

type FixtureEntry = {
  stockBySize: Record<string, number>
  expectationByDate: Record<string, Record<string, SecondaryInboundSplitExpectationCell>>
}

type ScopeFixture = {
  schema: 'secondary-inbound-split-source:scope:v1'
  scopeKey: string
  rangeStart: string
  rangeEnd: string
  entries: Record<string, FixtureEntry>
}

const INBOUND_SPLIT_SCOPE_ALL_KEY = '__mock-all-company__'
const INBOUND_SPLIT_SOURCE_RANGE_START = '2026-01-01'
const INBOUND_SPLIT_SOURCE_RANGE_END = '2029-01-01'
const DAY_MS = 86_400_000
const INBOUND_SPLIT_VERIFICATION_SKU_GROUP_KEY = 'TEST-SHOE__210' as const
const INBOUND_SPLIT_VERIFICATION_STOCK_BY_SIZE: Record<string, number> = {
  '230': 87,
  '240': 29,
  '250': 0,
  '260': 11,
}
const INBOUND_SPLIT_VERIFICATION_INBOUND_BY_DATE: Record<string, Record<string, number>> = {
  '2027-01-15': { '240': 43, '260': 17 },
  '2027-02-18': { '230': 31, '250': 23 },
  '2027-03-18': { '240': 37 },
  '2027-04-15': { '250': 79 },
  '2027-05-10': { '230': 19, '260': 41 },
}
const INBOUND_SPLIT_VERIFICATION_SALES_PROFILE: Array<{
  start: string
  end: string
  dailySaleBySize: Record<string, number>
}> = [
  { start: '2026-12-18', end: '2027-01-15', dailySaleBySize: { '230': 0.72, '240': 1.28, '250': 1.95, '260': 0.88 } },
  { start: '2027-01-15', end: '2027-02-18', dailySaleBySize: { '230': 1.05, '240': 1.72, '250': 2.35, '260': 1.26 } },
  { start: '2027-02-18', end: '2027-03-18', dailySaleBySize: { '230': 1.38, '240': 2.18, '250': 3.1, '260': 0.96 } },
  { start: '2027-03-18', end: '2027-04-15', dailySaleBySize: { '230': 0.84, '240': 1.36, '250': 2.05, '260': 1.74 } },
  { start: '2027-04-15', end: '2027-05-10', dailySaleBySize: { '230': 1.62, '240': 2.45, '250': 3.55, '260': 1.22 } },
  { start: '2027-05-10', end: '2027-06-18', dailySaleBySize: { '230': 1.14, '240': 1.88, '250': 2.7, '260': 2.08 } },
  { start: '2027-06-18', end: INBOUND_SPLIT_SOURCE_RANGE_END, dailySaleBySize: { '230': 1.1, '240': 1.6, '250': 2.2, '260': 1.3 } },
]
const TARGET_ORDER_MULTIPLIER_BY_SIZE = 1 as const
const MIN_ANNUAL_TARGET_QTY = 1 as const
const INBOUND_RATIO = 0.22
const MONTHLY_DEMAND_WEIGHTS = [1.0, 0.93, 1.03, 1.01, 1.16, 1.05, 1.07, 1.00, 0.94, 1.02, 1.08, 0.97] as const
const MONTHLY_INBOUND_WEIGHTS = [0.55, 0.42, 0.46, 0.38, 0.6, 0.52, 0.56, 0.44, 0.4, 0.48, 0.52, 0.5] as const

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

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function buildMonthIndexRange(start: string, end: string): string[] {
  const result: string[] = []
  const [startYear, startMonth]: number[] = start.slice(0, 7).split('-').map(Number)
  const endExclusiveMs: number = parseIsoDateStart(end, 'rangeEnd')
  let currentYear: number = startYear
  let currentMonth: number = startMonth
  while (Date.UTC(currentYear, currentMonth - 1, 1) < endExclusiveMs) {
    result.push(`${currentYear}-${String(currentMonth).padStart(2, '0')}`)
    currentMonth += 1
    if (currentMonth > 12) {
      currentMonth = 1
      currentYear += 1
    }
  }
  return result
}

function daysInMonth(month: string): number {
  const [year, monthNo]: number[] = month.split('-').map(Number)
  return new Date(Date.UTC(year, monthNo, 0)).getUTCDate()
}

function allocateInteger(total: number, weights: readonly number[]): number[] {
  const safeTotal: number = Number.isFinite(total) ? Math.max(0, Math.round(total)) : 0
  if (safeTotal <= 0 || weights.length === 0) return []

  const normalizedWeights: number[] = weights.map((weight: number): number => (Number.isFinite(weight) ? Math.max(0, weight) : 0))
  const weightSum: number = normalizedWeights.reduce((sum: number, weight: number): number => sum + weight, 0)
  const safeWeights: number[] = weightSum > 0 ? normalizedWeights : normalizedWeights.map((): number => 1)
  const safeWeightSum: number = weightSum > 0 ? weightSum : safeWeights.length

  const exact: number[] = safeWeights.map((weight: number): number => (safeTotal * weight) / safeWeightSum)
  const values: number[] = exact.map((value: number): number => Math.floor(value))
  let remainder: number = safeTotal - values.reduce((sum: number, value: number): number => sum + value, 0)

  const fractions: { index: number; fraction: number }[] = exact
    .map((value: number, index: number): { index: number; fraction: number } => ({ index, fraction: value - Math.floor(value) }))
    .sort((a: { index: number; fraction: number }, b: { index: number; fraction: number }): number => (b.fraction - a.fraction) || (a.index - b.index))

  fractions.forEach(({ index }: { index: number; fraction: number }): void => {
    if (remainder <= 0) return
    values[index] = (values[index] ?? 0) + 1
    remainder -= 1
  })

  return values
}

function buildDailyProfile(monthTotal: number, month: string, seed: number): number[] {
  const dayCount: number = daysInMonth(month)
  const dayWeights: number[] = Array.from({ length: dayCount }, (_: unknown, index: number): number => {
    const v: number = 1 + Math.sin((index + 1) * 0.87 + seed) * 0.12 + Math.cos((index + 1) * 0.21 + seed * 0.1) * 0.06
    return Math.max(0.05, v)
  })
  return allocateInteger(monthTotal, dayWeights)
}

function verificationDailySaleForSize(date: string, cursorMs: number, size: string): number {
  const profile = INBOUND_SPLIT_VERIFICATION_SALES_PROFILE.find((candidate: { start: string; end: string; dailySaleBySize: Record<string, number> }): boolean => {
    const startMs: number = parseIsoDateStart(candidate.start, 'verificationSalesProfile.start')
    const endMs: number = parseIsoDateStart(candidate.end, 'verificationSalesProfile.end')
    return cursorMs >= startMs && cursorMs < endMs
  })
  if (profile == null) return 0
  const baseSale: number = profile.dailySaleBySize[size] ?? 0
  return Math.round(baseSale * 100) / 100
}

function buildVerificationFixtureEntry(): FixtureEntry {
  const sizes: string[] = Object.keys(INBOUND_SPLIT_VERIFICATION_STOCK_BY_SIZE)
  const expectationByDate: Record<string, Record<string, SecondaryInboundSplitExpectationCell>> = {}
  const startMs: number = parseIsoDateStart(INBOUND_SPLIT_SOURCE_RANGE_START, 'rangeStart')
  const endMs: number = parseIsoDateStart(INBOUND_SPLIT_SOURCE_RANGE_END, 'rangeEnd')
  for (let cursorMs: number = startMs; cursorMs < endMs; cursorMs += DAY_MS) {
    const date: string = formatIsoDate(new Date(cursorMs))
    const inboundBySize: Record<string, number> = INBOUND_SPLIT_VERIFICATION_INBOUND_BY_DATE[date] ?? {}
    expectationByDate[date] = Object.fromEntries(
      sizes.map((size: string): [string, SecondaryInboundSplitExpectationCell] => [
        size,
        {
          sale: verificationDailySaleForSize(date, cursorMs, size),
          inbound: inboundBySize[size] ?? 0,
        },
      ]),
    )
  }

  return {
    stockBySize: { ...INBOUND_SPLIT_VERIFICATION_STOCK_BY_SIZE },
    expectationByDate,
  }
}

function buildFixtureEntry(skuGroupKey: string, baseScope: { companyUuid?: string }): FixtureEntry {
  if (skuGroupKey === INBOUND_SPLIT_VERIFICATION_SKU_GROUP_KEY) return buildVerificationFixtureEntry()

  const secondary: ProductSecondaryDetail = scopeMockProductSecondary(productSecondaryBySkuGroupKey[skuGroupKey], baseScope)
  const sizeRows: ProductSecondaryDetail['sizeRows'] = secondary.sizeRows
  const sizes: string[] = sizeRows.map((row: ProductSecondaryDetail['sizeRows'][number]): string => row.size)
  const monthIndex: string[] = buildMonthIndexRange(INBOUND_SPLIT_SOURCE_RANGE_START, INBOUND_SPLIT_SOURCE_RANGE_END)
  const seedBase: number = skuGroupKey.charCodeAt(0)

  const stockBySize: Record<string, number> = {}
  sizeRows.forEach((row: ProductSecondaryDetail['sizeRows'][number]): void => {
    stockBySize[row.size] = 0
  })

  const annualTargetBySize: Record<string, number> = Object.fromEntries(
    sizeRows.map((row: ProductSecondaryDetail['sizeRows'][number]): [string, number] => [
      row.size,
      Math.max(MIN_ANNUAL_TARGET_QTY, Math.max(1, Math.round(row.confirmedQty * TARGET_ORDER_MULTIPLIER_BY_SIZE))),
    ]),
  )

  const expectationByDate: Record<string, Record<string, SecondaryInboundSplitExpectationCell>> = {}
  const startMs: number = parseIsoDateStart(INBOUND_SPLIT_SOURCE_RANGE_START, 'rangeStart')
  const endMs: number = parseIsoDateStart(INBOUND_SPLIT_SOURCE_RANGE_END, 'rangeEnd')
  for (let cursorMs: number = startMs; cursorMs < endMs; cursorMs += DAY_MS) {
    const date: string = formatIsoDate(new Date(cursorMs))
    expectationByDate[date] = Object.fromEntries(
      sizes.map((size: string): [string, SecondaryInboundSplitExpectationCell] => [size, { sale: 0, inbound: 0 }]),
    )
  }

  for (const row of sizeRows) {
    const monthDemandTotalByMonth: number[] = allocateInteger(
      annualTargetBySize[row.size] ?? 0,
      MONTHLY_DEMAND_WEIGHTS,
    )
    const monthInboundTotalByMonth: number[] = allocateInteger(
      Math.max(0, Math.round((annualTargetBySize[row.size] ?? 0) * INBOUND_RATIO)),
      MONTHLY_INBOUND_WEIGHTS,
    )

    monthIndex.forEach((month: string, monthIndex: number): void => {
      const daySales: number[] = buildDailyProfile(monthDemandTotalByMonth[monthIndex] ?? 0, month, seedBase + monthIndex)
      const dayInbound: number[] = buildDailyProfile(monthInboundTotalByMonth[monthIndex] ?? 0, month, seedBase + monthIndex + 7)

      for (let day = 0; day < daySales.length; day += 1) {
        const date: string = formatIsoDate(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, day + 1)))
        const cell: SecondaryInboundSplitExpectationCell = expectationByDate[date]?.[row.size]
        if (cell == null) continue
        cell.sale = daySales[day] ?? 0
        cell.inbound = dayInbound[day] ?? 0
      }
    })
  }

  return { stockBySize, expectationByDate }
}

const scopeEntries: Array<{ key: string; companyUuid: string | undefined }> = [
  { key: INBOUND_SPLIT_SCOPE_ALL_KEY, companyUuid: undefined },
  { key: MOCK_HANA_COMPANY_UUID, companyUuid: MOCK_HANA_COMPANY_UUID },
  { key: MOCK_T1_COMPANY_UUID, companyUuid: MOCK_T1_COMPANY_UUID },
]

const scriptDir = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(scriptDir, '../public/mock/secondaryInboundSplitSourceFixtures')
const legacyOut = resolve(scriptDir, '../public/mock/secondaryInboundSplitSourceFixtures.json')
rmSync(legacyOut, { force: true })
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

for (const scope of scopeEntries) {
  const skuByScope: Record<string, FixtureEntry> = {}
  for (const skuGroupKey of allKnownSkuGroupKeys) {
    skuByScope[skuGroupKey] = buildFixtureEntry(skuGroupKey, { companyUuid: scope.companyUuid })
  }
  const scopeFixture: ScopeFixture = {
    schema: 'secondary-inbound-split-source:scope:v1',
    scopeKey: scope.key,
    rangeStart: INBOUND_SPLIT_SOURCE_RANGE_START,
    rangeEnd: INBOUND_SPLIT_SOURCE_RANGE_END,
    entries: skuByScope,
  }
  writeFileSync(resolve(outDir, `${encodeURIComponent(scope.key)}.json`), `${JSON.stringify(scopeFixture)}\n`)
}

console.log(`Generated fixture: ${allKnownSkuGroupKeys.length} sku x ${scopeEntries.length} scope entries`)
