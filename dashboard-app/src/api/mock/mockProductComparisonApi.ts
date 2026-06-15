import type {
  MonthlySalesPoint,
  ProductComparisonBaseSubject,
  ProductComparisonBaseSubjectRef,
  ProductComparisonComparisonSubject,
  ProductComparisonComparisonSubjectRef,
  ProductComparisonSubject,
  ProductComparisonSubjectRef,
  ProductComparisonTarget,
  ProductComparisonTargetParams,
  ProductDrawerBundleParams,
  ProductMonthlyTrend,
  ProductMonthlyTrendParams,
  ProductPrimarySummary,
  ProductSalesInsight,
  ProductSalesInsightParams,
  ProductSecondaryDetail,
  SecondaryCompetitorChannel,
  SecondaryDailyTrendParams,
  SecondaryDailyTrendSource,
  SecondaryInboundSplitExpectationCell,
  SecondaryInboundSplitSource,
  SecondaryInboundSplitSourceParams,
} from '../types'
import { getCompanyUuidForOptionalScope, getComparisonSubjectKey } from '../types'
import { DEFAULT_FORECAST_MONTHS } from '../../utils/forecastMonthsStorage'
import { buildSalesKpiColumn } from '../../utils/salesKpiColumn'
import { buildSecondaryDailyTrendSource } from './secondaryDailyTrend'
import {
  MOCK_COMPANIES,
  scopeMockProductPrimary,
  scopeMockProductSecondary,
  scopeMockStockTrend,
} from './mockCompanyScope'
import { requireMockProductPrimary, requireMockProductSecondary, requireMockStockTrend } from './mockProductLookup'
import { makeSalesTrend } from './productCatalog'
import { getMockSecondaryCompetitorChannel, secondaryCompetitorChannels, type MockSecondaryCompetitorChannel } from './salesTables'
import { sleep } from './utils'

const TEST_TOP_MONTHLY_BASE_SALES = 100 as const
const TEST_TOP_MONTHLY_COMPARISON_SALES = 200 as const
const SELF_ALL_COMPANIES_LABEL = '\uC790\uC0AC\uC804\uCCB4' as const

const dateToMonth: (date: string) => string = (date: string) : string => date.slice(0, 7)
const DAY_MS = 86_400_000 as const

const INBOUND_SPLIT_SOURCE_RANGE_START: string = '2024-01-01'
const INBOUND_SPLIT_SOURCE_RANGE_END: string = '2028-01-01'
const INBOUND_SPLIT_SCOPE_ALL_KEY: string = '__mock-all-company__'

type SecondaryInboundSplitSourceCacheEntry = {
  stockBySize: Record<string, number>
  expectationByDate: Record<string, Record<string, SecondaryInboundSplitExpectationCell>>
}

const secondaryInboundSplitSourceCacheByScope: Map<string, Map<string, SecondaryInboundSplitSourceCacheEntry>> = new Map()

const nextMonth: (month: string) => string = (month: string) : string => {
  const [year, monthNo]: number[] = month.split('-').map(Number)
  const next: Date = new Date(year, monthNo, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
}

function productComparisonSubjectId(subject: ProductComparisonSubjectRef): string {
  return getComparisonSubjectKey(subject)
}

function competitorComparisonTarget(channel: SecondaryCompetitorChannel): ProductComparisonTarget {
  return {
    id: productComparisonSubjectId({ role: 'comparison', kind: 'competitor-channel', sourceId: channel.id }),
    role: 'comparison',
    kind: 'competitor-channel',
    sourceId: channel.id,
    label: channel.label,
  }
}

function selfCompanyComparisonTarget(companyUuid: string | undefined, label: string): ProductComparisonTarget {
  return {
    id: productComparisonSubjectId({
      role: 'comparison',
      kind: 'self-company',
      ...(companyUuid == null ? {} : { sourceId: companyUuid }),
    }),
    role: 'comparison',
    kind: 'self-company',
    ...(companyUuid == null ? {} : { sourceId: companyUuid }),
    label,
  }
}

function mockCompanyComparisonTargetLabel(companyUuid: string | undefined, label: string): string {
  return companyUuid == null ? SELF_ALL_COMPANIES_LABEL : label
}

/**
 * Mock implementation of the backend comparison-target endpoint.
 * A non-empty array is the only source for selectable defaults; an empty array means unavailable.
 */
function buildMockProductComparisonTargets(params: ProductComparisonTargetParams): ProductComparisonTarget[] {
  if (params.base.role !== 'base') throw new Error(`Invalid mock base subject role: ${params.base.role}`)
  if (params.base.kind !== 'self-company') throw new Error(`Unsupported mock base subject kind: ${params.base.kind}`)
  const currentCompanyUuid: string | undefined = getCompanyUuidForOptionalScope(params.base.sourceId)
  const competitorTargets: ProductComparisonTarget[] = secondaryCompetitorChannels.map(competitorComparisonTarget)
  const selfTargets: ProductComparisonTarget[] = MOCK_COMPANIES
    .map((company: { uuid: string; name: string }) : { sourceId: string | undefined; name: string } => ({
      sourceId: getCompanyUuidForOptionalScope(company.uuid),
      name: company.name,
    }))
    .filter((company: { sourceId: string | undefined; name: string }) : boolean => company.sourceId !== currentCompanyUuid)
    .map((company: { sourceId: string | undefined; name: string }) : ProductComparisonTarget => selfCompanyComparisonTarget(
      company.sourceId,
      mockCompanyComparisonTargetLabel(company.sourceId, company.name),
    ))
  return [...competitorTargets, ...selfTargets]
}

function mockSelfCompanySubjectLabel(sourceId: string | undefined): string {
  if (sourceId == null) return SELF_ALL_COMPANIES_LABEL
  const company: { uuid: string; name: string } | undefined = MOCK_COMPANIES.find(
    (candidate: { uuid: string; name: string }) : boolean => candidate.uuid === sourceId,
  )
  if (company == null) throw new Error(`Unknown mock self-company subject: ${sourceId}`)
  return company.name
}

export function resolveMockProductSalesInsightSubject(subject: ProductComparisonBaseSubjectRef): ProductComparisonBaseSubject
export function resolveMockProductSalesInsightSubject(subject: ProductComparisonComparisonSubjectRef): ProductComparisonComparisonSubject
export function resolveMockProductSalesInsightSubject(subject: ProductComparisonSubjectRef): ProductComparisonSubject {
  if (subject.kind === 'competitor-channel') {
    const channel: MockSecondaryCompetitorChannel = getMockSecondaryCompetitorChannel(subject.sourceId)
    return {
      ...subject,
      id: productComparisonSubjectId(subject),
      label: channel.label,
    }
  }
  return {
    ...subject,
    id: productComparisonSubjectId(subject),
    label: mockSelfCompanySubjectLabel(subject.sourceId),
  }
}

function assertMockSubjectRole(subject: ProductComparisonSubjectRef, role: ProductComparisonSubject['role']): void {
  if (subject.role !== role) throw new Error(`Invalid mock product sales insight subject role: expected ${role}, got ${subject.role}`)
}

function selfCompanySubjectScope(subject: ProductComparisonSubjectRef): { companyUuid?: string } {
  if (subject.kind !== 'self-company') throw new Error(`Unsupported mock base subject kind: ${subject.kind}`)
  return getCompanyUuidForOptionalScope(subject.sourceId) == null ? {} : { companyUuid: subject.sourceId }
}

function comparisonScaleForSubject(
  skuGroupKey: string,
  basePrimary: ProductPrimarySummary,
  comparison: ProductComparisonComparisonSubjectRef,
): number {
  if (comparison.kind === 'competitor-channel') {
    return 10 * getMockSecondaryCompetitorChannel(comparison.sourceId).qtySkew
  }
  const comparisonPrimary: ProductPrimarySummary = scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), selfCompanySubjectScope(comparison))
  return basePrimary.qty > 0 ? Math.max(0, comparisonPrimary.qty / basePrimary.qty) : 0
}

function daysInMonthKey(month: string): number {
  const [year, monthNo]: number[] = month.split('-').map(Number)
  return new Date(Date.UTC(year, monthNo, 0)).getUTCDate()
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function allocateMockIntegerTotal(total: number, weights: readonly number[]): number[] {
  const safeTotal: number = Number.isFinite(total) ? Math.max(0, Math.round(total)) : 0
  if (!weights.length) return []
  const normalizedWeights: number[] = weights.map((weight: number): number => Number.isFinite(weight) ? Math.max(0, weight) : 0)
  const weightSum: number = normalizedWeights.reduce((sum: number, weight: number): number => sum + weight, 0)
  const effectiveWeights: number[] = weightSum > 0 ? normalizedWeights : normalizedWeights.map((): number => 1)
  const effectiveSum: number = weightSum > 0 ? weightSum : effectiveWeights.length
  const exactValues: number[] = effectiveWeights.map((weight: number): number => (safeTotal * weight) / effectiveSum)
  const values: number[] = exactValues.map((value: number): number => Math.floor(value))
  let remainder: number = safeTotal - values.reduce((sum: number, value: number): number => sum + value, 0)
  exactValues
    .map((value: number, index: number): { index: number; fraction: number } => ({ index, fraction: value - Math.floor(value) }))
    .sort((a: { index: number; fraction: number }, b: { index: number; fraction: number }): number => (b.fraction - a.fraction) || (a.index - b.index))
    .forEach(({ index }: { index: number; fraction: number }): void => {
      if (remainder <= 0) return
      values[index] += 1
      remainder -= 1
    })
  return values
}

function mockDailySaleTotal(monthSales: number, dayIndex: number, days: number, seed: number): number {
  const base: number = monthSales / Math.max(1, days)
  const wave: number = Math.sin((dayIndex + seed) * 0.9) * 0.08
  return Math.max(0, Math.round(base * (1 + wave)))
}

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

function cacheScopeKey(baseScope: { companyUuid?: string; }): string {
  return baseScope.companyUuid == null ? INBOUND_SPLIT_SCOPE_ALL_KEY : baseScope.companyUuid
}

function buildPrecomputedSecondaryInboundSplitSourceForSku(
  skuGroupKey: string,
  baseScope: { companyUuid?: string; },
): SecondaryInboundSplitSourceCacheEntry {
  const primary: ProductPrimarySummary = scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), baseScope)
  const secondary: ProductSecondaryDetail = scopeMockProductSecondary(requireMockProductSecondary(skuGroupKey), baseScope)
  const stockTrend: { date: string; stock: number; inboundExpected: number; inboundQty: number; }[] = scopeMockStockTrend(skuGroupKey, requireMockStockTrend(skuGroupKey), baseScope)
  const monthlySalesByMonth: Map<string, MonthlySalesPoint> = new Map((primary.monthlySalesTrend ?? []).map((point: MonthlySalesPoint): [string, MonthlySalesPoint] => [point.date, point]))
  const stockTrendByMonth: Map<string, { date: string; stock: number; inboundExpected: number; inboundQty: number; }> = new Map(stockTrend.map((point: { date: string; stock: number; inboundExpected: number; inboundQty: number; }): [string, { date: string; stock: number; inboundExpected: number; inboundQty: number; }] => [point.date, point]))
  const sizeRows: ProductSecondaryDetail['sizeRows'] = secondary.sizeRows
  const sizes: string[] = sizeRows.map((row: ProductSecondaryDetail['sizeRows'][number]): string => row.size)
  const weights: number[] = sizeRows.map((row: ProductSecondaryDetail['sizeRows'][number]): number => row.selfRatio > 0 ? row.selfRatio : row.confirmedQty)
  const stockBySize: Record<string, number> = {}
  sizeRows.forEach((row: ProductSecondaryDetail['sizeRows'][number]): void => {
    stockBySize[row.size] = Math.max(0, Math.round(row.availableStock))
  })

  const expectationByDate: Record<string, Record<string, SecondaryInboundSplitExpectationCell>> = {}
  const start: number = parseIsoDateStart(INBOUND_SPLIT_SOURCE_RANGE_START, 'rangeStart')
  const end: number = parseIsoDateStart(INBOUND_SPLIT_SOURCE_RANGE_END, 'rangeEnd')

  for (let time: number = start; time < end; time += DAY_MS) {
    const date: string = formatIsoDate(new Date(time))
    const month: string = date.slice(0, 7)
    const dayIndex: number = Number(date.slice(8, 10)) - 1
    const monthSales: number = Math.max(0, Math.round(monthlySalesByMonth.get(month)?.sales ?? 0))
    const days: number = daysInMonthKey(month)
    const saleTotal: number = mockDailySaleTotal(monthSales, dayIndex, days, skuGroupKey.charCodeAt(0))
    const inboundTotal: number = date.endsWith('-01')
      ? Math.max(0, Math.round(stockTrendByMonth.get(month)?.inboundQty ?? stockTrendByMonth.get(month)?.inboundExpected ?? 0))
      : 0
    const saleBySize: number[] = allocateMockIntegerTotal(saleTotal, weights)
    const inboundBySize: number[] = allocateMockIntegerTotal(inboundTotal, weights)
    expectationByDate[date] = Object.fromEntries(sizes.map((size: string, index: number): [string, SecondaryInboundSplitExpectationCell] => [size, {
      sale: saleBySize[index] ?? 0,
      inbound: inboundBySize[index] ?? 0,
    }]))
  }

  return { stockBySize, expectationByDate }
}

function getPrecomputedSecondaryInboundSplitSourceForSku(
  skuGroupKey: string,
  baseScope: { companyUuid?: string; },
): SecondaryInboundSplitSourceCacheEntry {
  const scopeKey: string = cacheScopeKey(baseScope)
  const scopeCache: Map<string, SecondaryInboundSplitSourceCacheEntry> = (() : Map<string, SecondaryInboundSplitSourceCacheEntry> => {
    const existing: Map<string, SecondaryInboundSplitSourceCacheEntry> | undefined = secondaryInboundSplitSourceCacheByScope.get(scopeKey)
    if (existing != null) return existing
    const next: Map<string, SecondaryInboundSplitSourceCacheEntry> = new Map()
    secondaryInboundSplitSourceCacheByScope.set(scopeKey, next)
    return next
  })()

  const cached: SecondaryInboundSplitSourceCacheEntry | undefined = scopeCache.get(skuGroupKey)
  if (cached != null) return cached

  const built: SecondaryInboundSplitSourceCacheEntry = buildPrecomputedSecondaryInboundSplitSourceForSku(skuGroupKey, baseScope)
  scopeCache.set(skuGroupKey, built)
  return built
}

function slicePrecomputedSecondaryInboundSplitExpectation(
  cached: SecondaryInboundSplitSourceCacheEntry,
  dateStart: string,
  dateEnd: string,
): Record<string, Record<string, SecondaryInboundSplitExpectationCell>> {
  const start: number = parseIsoDateStart(dateStart, 'dateStart')
  const end: number = parseIsoDateStart(dateEnd, 'dateEnd')
  const precomputedStart: number = parseIsoDateStart(INBOUND_SPLIT_SOURCE_RANGE_START, 'rangeStart')
  const precomputedEnd: number = parseIsoDateStart(INBOUND_SPLIT_SOURCE_RANGE_END, 'rangeEnd')
  if (start < precomputedStart || end > precomputedEnd) {
    throw new Error(`Secondary inbound split source precomputed date range supports ${INBOUND_SPLIT_SOURCE_RANGE_START} <= dateStart < dateEnd <= ${INBOUND_SPLIT_SOURCE_RANGE_END}.`)
  }
  if (end <= start) return {}

  const expectationByDate: Record<string, Record<string, SecondaryInboundSplitExpectationCell>> = {}
  for (let time: number = start; time < end; time += DAY_MS) {
    const date: string = formatIsoDate(new Date(time))
    const row: Record<string, SecondaryInboundSplitExpectationCell> | undefined = cached.expectationByDate[date]
    if (row == null) {
      throw new Error(`Secondary inbound split source precomputed data missing for date ${date}.`)
    }
    expectationByDate[date] = { ...row }
  }
  return expectationByDate
}

export async function getMockProductDrawerBundle(skuGroupKey: string, params: ProductDrawerBundleParams): Promise<{ summary: ProductPrimarySummary; }> {
  await sleep(80)
  const base: ProductComparisonBaseSubjectRef = params.base
  assertMockSubjectRole(base, 'base')
  const summary: ProductPrimarySummary = { ...scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), selfCompanySubjectScope(base)) }
  return { summary }
}

export async function getMockProductComparisonTargets(params: ProductComparisonTargetParams): Promise<ProductComparisonTarget[]> {
  await sleep(40)
  return buildMockProductComparisonTargets(params)
}

export async function getMockProductMonthlyTrend(skuGroupKey: string, params: ProductMonthlyTrendParams): Promise<ProductMonthlyTrend> {
  await sleep(80)
  assertMockSubjectRole(params.base, 'base')
  assertMockSubjectRole(params.comparison, 'comparison')
  const base: ProductComparisonBaseSubject = resolveMockProductSalesInsightSubject(params.base)
  const comparison: ProductComparisonComparisonSubject = resolveMockProductSalesInsightSubject(params.comparison)
  const primary: ProductPrimarySummary = scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), selfCompanySubjectScope(base))
  const comparisonScale: number = comparisonScaleForSubject(skuGroupKey, primary, params.comparison)
  if (primary.code === 'TEST-TOP') {
    const points: { date: string; baseSales: number; comparisonSales: number | null; isForecast: boolean; }[] = makeSalesTrend(100, skuGroupKey.charCodeAt(0), params.forecastMonths ?? DEFAULT_FORECAST_MONTHS, {
      historyStartMonth: dateToMonth(params.startDate),
      historyEndMonth: dateToMonth(params.endDate),
      forecastStartMonth: nextMonth(dateToMonth(params.endDate)),
    }).map((point: MonthlySalesPoint) : { date: string; baseSales: number; comparisonSales: number | null; isForecast: boolean; } => ({
      date: point.date,
      baseSales: TEST_TOP_MONTHLY_BASE_SALES,
      comparisonSales: point.isForecast ? null : TEST_TOP_MONTHLY_COMPARISON_SALES,
      isForecast: point.isForecast,
    }))
    return { skuGroupKey: primary.skuGroupKey, targetPeriodDays: { start: params.startDate, end: params.endDate }, base, comparison, points }
  }
  return {
    skuGroupKey: primary.skuGroupKey,
    targetPeriodDays: { start: params.startDate, end: params.endDate },
    base,
    comparison,
    points: makeSalesTrend(
      Math.max(800, Math.round(primary.qty * 0.42)),
      skuGroupKey.charCodeAt(0),
      params.forecastMonths ?? DEFAULT_FORECAST_MONTHS,
      {
        historyStartMonth: dateToMonth(params.startDate),
        historyEndMonth: dateToMonth(params.endDate),
        forecastStartMonth: nextMonth(dateToMonth(params.endDate)),
      },
    )
      .map((point: MonthlySalesPoint, index: number) : { date: string; baseSales: number; comparisonSales: number | null; isForecast: boolean; } => ({
        date: point.date,
        baseSales: Math.max(0, Math.round(point.sales)),
        comparisonSales: point.isForecast ? null : Math.max(0, Math.round(point.sales * comparisonScale * (1 + Math.sin(index) * 0.06))),
        isForecast: point.isForecast,
      })),
  }
}

export async function getMockProductSalesInsight(skuGroupKey: string, params: ProductSalesInsightParams): Promise<ProductSalesInsight> {
  await sleep(80)
  assertMockSubjectRole(params.base, 'base')
  assertMockSubjectRole(params.comparison, 'comparison')
  const base: ProductComparisonBaseSubject = resolveMockProductSalesInsightSubject(params.base)
  const comparison: ProductComparisonComparisonSubject = resolveMockProductSalesInsightSubject(params.comparison)
  const baseScope: { companyUuid?: string } = selfCompanySubjectScope(base)
  const primary: ProductPrimarySummary = scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), baseScope)
  const secondary: ProductSecondaryDetail = scopeMockProductSecondary(requireMockProductSecondary(skuGroupKey), baseScope)
  const channel: MockSecondaryCompetitorChannel | null = comparison.kind === 'competitor-channel'
    ? getMockSecondaryCompetitorChannel(comparison.sourceId)
    : null
  const salesKpiChannel: { id: string; label: string; priceSkew?: number; qtySkew?: number } = channel ?? {
    id: comparison.id,
    label: comparison.label,
  }
  const comparisonCompanyScope: { companyUuid?: string } = comparison.kind === 'self-company'
    ? selfCompanySubjectScope(comparison)
    : baseScope
  const comparisonPrimary: ProductPrimarySummary = comparison.kind === 'self-company'
    ? scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), comparisonCompanyScope)
    : primary
  const comparisonSecondary: ProductSecondaryDetail = comparison.kind === 'self-company'
    ? scopeMockProductSecondary(requireMockProductSecondary(skuGroupKey), comparisonCompanyScope)
    : secondary
  return {
    skuGroupKey: primary.skuGroupKey,
    targetPeriodDays: { start: params.startDate, end: params.endDate },
    base,
    comparison,
    baseMetrics: buildSalesKpiColumn('self', primary, secondary, { id: base.id, label: base.label }, { rankKey: base.id }),
    comparisonMetrics: comparison.kind === 'competitor-channel'
      ? buildSalesKpiColumn('competitor', primary, secondary, salesKpiChannel)
      : buildSalesKpiColumn(
        'self',
        comparisonPrimary,
        comparisonSecondary,
        { id: comparison.id, label: comparison.label },
        { rankKey: comparison.id },
      ),
  }
}

export async function getMockSecondaryDailyTrend({
  skuGroupKey,
  startDate,
  endDate,
  forecastDays,
  base,
  comparison,
}: SecondaryDailyTrendParams): Promise<SecondaryDailyTrendSource> {
  await sleep(80)
  const primary: ProductPrimarySummary = scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), selfCompanySubjectScope(base))
  const stockTrend: { date: string; stock: number; inboundExpected: number; inboundQty: number; }[] = scopeMockStockTrend(skuGroupKey, requireMockStockTrend(skuGroupKey), selfCompanySubjectScope(base))
  return buildSecondaryDailyTrendSource(skuGroupKey, primary.monthlySalesTrend ?? [], stockTrend, startDate, endDate, forecastDays, comparisonScaleForSubject(skuGroupKey, primary, comparison))
}

export async function getMockSecondaryInboundSplitSource({
  skuGroupKey,
  dateStart,
  dateEnd,
  base,
}: SecondaryInboundSplitSourceParams): Promise<SecondaryInboundSplitSource> {
  await sleep(80)
  assertMockSubjectRole(base, 'base')
  const baseScope: { companyUuid?: string } = selfCompanySubjectScope(base)
  const cached: SecondaryInboundSplitSourceCacheEntry = getPrecomputedSecondaryInboundSplitSourceForSku(skuGroupKey, baseScope)
  const expectationByDate: Record<string, Record<string, SecondaryInboundSplitExpectationCell>> = slicePrecomputedSecondaryInboundSplitExpectation(
    cached,
    dateStart,
    dateEnd,
  )

  return {
    productId: skuGroupKey,
    dateStart,
    dateEnd,
    stockBySize: { ...cached.stockBySize },
    expectationByDate,
  }
}
