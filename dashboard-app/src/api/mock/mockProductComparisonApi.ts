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

export function getMockCandidateOrderMetricComparisonTarget(): ProductComparisonTarget | null {
  const configuredChannel: SecondaryCompetitorChannel | undefined = secondaryCompetitorChannels[0]
  return configuredChannel == null ? null : competitorComparisonTarget(configuredChannel)
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
  assertMockSubjectRole(base, 'base')
  assertMockSubjectRole(comparison, 'comparison')
  const primary: ProductPrimarySummary = scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), selfCompanySubjectScope(base))
  const stockTrend: { date: string; stock: number; inboundExpected: number; inboundQty: number; }[] = scopeMockStockTrend(skuGroupKey, requireMockStockTrend(skuGroupKey), selfCompanySubjectScope(base))
  return buildSecondaryDailyTrendSource(skuGroupKey, primary.monthlySalesTrend ?? [], stockTrend, startDate, endDate, forecastDays, comparisonScaleForSubject(skuGroupKey, primary, comparison))
}
