import type {
  ProductComparisonBaseSubject,
  ProductComparisonBaseSubjectRef,
  ProductComparisonComparisonSubject,
  ProductComparisonComparisonSubjectRef,
  ProductComparisonSubject,
  ProductComparisonSubjectRef,
  ProductComparisonTarget,
  ProductSecondaryDetail,
  SecondaryCompetitorChannel,
} from '..'
import type { CompetitorSalesRow, SelfSalesRow } from '../../types'
import type { MonthlySalesPoint, ScatterSalesGridResponse, SecondaryDailyTrendPoint } from '../types'
import type { MockSecondaryCompetitorChannel } from './salesTables'
import type { ProductPrimarySummary } from '../../types'
import type {
  CompetitorSalesGridParams,
  CompetitorSalesParams,
  ProductComparisonTargetParams,
  ProductDrawerBundleParams,
  ProductMonthlyTrend,
  ProductMonthlyTrendParams,
  ProductSalesInsight,
  ProductSalesInsightParams,
  ProductSecondaryDetailParams,
  SalesFilterMetaParams,
  SecondaryAiCommentParams,
  SecondaryDailyTrendParams,
  SelfSalesGridParams,
  SelfSalesParams,
} from '../types'
import { getCompanyUuidForOptionalScope, getComparisonSubjectKey } from '../types'
import { buildSalesKpiColumn } from '../../utils/salesKpiColumn'
import { DEFAULT_FORECAST_MONTHS } from '../../utils/forecastMonthsStorage'
import { uniqueSortedStrings } from '../../utils/uniqueSortedStrings'
import { candidateMockApi } from './candidateMockApi'
import { buildSecondaryAiComment } from './secondaryAiComment'
import { buildSecondaryDailyTrend } from './secondaryDailyTrend'
import { getSecondaryStockOrderCalc } from './secondaryStockOrderCalcApi'
import {
  brands,
  categories,
  colorCodeOrder,
  competitorSalesRows,
  getMockCompetitorSalesChannels,
  getMockSecondaryCompetitorChannel,
  secondaryCompetitorChannels,
  selfSalesRows,
} from './salesTables'
import { buildCompetitorSalesScatterGridFromRows, buildSelfSalesScatterGridFromRows } from '../../utils/scatterGridBuild'
import { estimatePeriodWeight, historicalMonths, makeSalesTrend } from './productCatalog'
import { requireMockProductPrimary, requireMockProductSecondary, requireMockStockTrend } from './mockProductLookup'
import {
  scopeMockCompetitorSalesRow,
  MOCK_COMPANIES,
  scopeMockProductPrimary,
  scopeMockProductSecondary,
  scopeMockSelfSalesRow,
  scopeMockStockTrend,
} from './mockCompanyScope'
import { sleep } from './utils'

const TEST_TOP_MONTHLY_BASE_SALES = 100 as const
const TEST_TOP_MONTHLY_COMPARISON_SALES = 200 as const

function queryText(value?: string) : string | undefined {
  return value?.trim().toLowerCase()
}

function matchesProductFilters(
  row: { brand: string; category: string; code: string; colorCode: string; productName: string },
  params?: SelfSalesParams | CompetitorSalesParams,
) : boolean {
  const codeQuery: string | undefined = queryText(params?.codeQuery)
  const nameQuery: string | undefined = queryText(params?.nameQuery)
  return (!params?.brand || row.brand === params.brand)
    && (!params?.category || row.category === params.category)
    && (!params?.colorCode || row.colorCode === params.colorCode)
    && (!codeQuery || row.code.toLowerCase().includes(codeQuery))
    && (!nameQuery || row.productName.toLowerCase().includes(nameQuery))
}

function periodWeight(params?: { startDate?: string; endDate?: string }) : number {
  return estimatePeriodWeight(params?.startDate, params?.endDate)
}

const dateToMonth: (date: string) => string = (date: string) : string => date.slice(0, 7)

const nextMonth: (month: string) => string = (month: string) : string => {
  const [year, monthNo]: number[] = month.split('-').map(Number)
  const next: Date = new Date(year, monthNo, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
}

const SELF_ALL_COMPANIES_LABEL = '\uC790\uC0AC\uC804\uCCB4' as const

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

function getMockProductComparisonTargets(params: ProductComparisonTargetParams): ProductComparisonTarget[] {
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

function resolveMockProductSalesInsightSubject(subject: ProductComparisonBaseSubjectRef): ProductComparisonBaseSubject
function resolveMockProductSalesInsightSubject(subject: ProductComparisonComparisonSubjectRef): ProductComparisonComparisonSubject
function resolveMockProductSalesInsightSubject(subject: ProductComparisonSubjectRef): ProductComparisonSubject {
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

function requireMockProductComparisonTarget(target: ProductComparisonComparisonSubjectRef | null | undefined): ProductComparisonComparisonSubjectRef {
  if (target == null) throw new Error('Product comparison target is required.')
  if (target.kind === 'competitor-channel' && !target.sourceId) {
    throw new Error('comparison.sourceId is required for competitor-channel.')
  }
  return target
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

function comparisonRatioBySizeFromRows(detail: ProductSecondaryDetail): ProductSecondaryDetail['comparisonRatioBySize'] {
  const total: number = detail.sizeRows.reduce((sum: number, row) : number => sum + Math.max(0, row.selfRatio), 0)
  if (total <= 0) return Object.fromEntries(detail.sizeRows.map((row) : [string, number] => [row.size, 0]))
  return Object.fromEntries(detail.sizeRows.map((row) : [string, number] => [row.size, Math.max(0, row.selfRatio) / total]))
}

function comparisonSubjectSizeSeed(subject: ProductComparisonComparisonSubjectRef): number {
  return getComparisonSubjectKey(subject).split('').reduce((sum: number, ch: string, index: number) : number => sum + ch.charCodeAt(0) * (index + 1), 0)
}

function skewComparisonRatioBySize(
  ratioBySize: ProductSecondaryDetail['comparisonRatioBySize'],
  subject: ProductComparisonComparisonSubjectRef,
): ProductSecondaryDetail['comparisonRatioBySize'] {
  const entries: [string, number][] = Object.entries(ratioBySize)
  if (entries.length === 0) return ratioBySize

  const seed: number = comparisonSubjectSizeSeed(subject)
  const midpoint: number = (entries.length - 1) / 2
  const directionalSkew: number = ((seed % 7) - 3) / 12
  const waveSkew: number = ((Math.floor(seed / 7) % 5) - 2) / 10
  const weighted: [string, number][] = entries.map(([size, ratio]: [string, number], index: number) : [string, number] => {
    const position: number = midpoint === 0 ? 0 : (index - midpoint) / midpoint
    const wave: number = Math.sin(seed + index * 1.7)
    return [size, Math.max(0, ratio) * Math.max(0.2, 1 + position * directionalSkew + wave * waveSkew)]
  })
  const total: number = weighted.reduce((sum: number, [, ratio]: [string, number]) : number => sum + ratio, 0)
  if (total <= 0) return Object.fromEntries(weighted.map(([size]: [string, number]) : [string, number] => [size, 0]))
  return Object.fromEntries(weighted.map(([size, ratio]: [string, number]) : [string, number] => [size, ratio / total]))
}

function buildMockProductSecondaryDetail(
  skuGroupKey: string,
  params: ProductSecondaryDetailParams,
): ProductSecondaryDetail {
  const baseScope: { companyUuid?: string } = selfCompanySubjectScope(params.base)
  const baseSecondary: ProductSecondaryDetail = scopeMockProductSecondary(requireMockProductSecondary(skuGroupKey), baseScope)
  const comparison: ProductComparisonComparisonSubjectRef = requireMockProductComparisonTarget(params.comparison)
  if (comparison.kind === 'competitor-channel') {
    const channel: MockSecondaryCompetitorChannel = getMockSecondaryCompetitorChannel(comparison.sourceId)
    return {
      ...baseSecondary,
      comparisonPrice: Math.max(0, Math.round(baseSecondary.comparisonPrice * channel.priceSkew)),
      comparisonQty: Math.max(0, Math.round(baseSecondary.comparisonQty * channel.qtySkew)),
      comparisonRatioBySize: skewComparisonRatioBySize(baseSecondary.comparisonRatioBySize, comparison),
    }
  }
  const comparisonScope: { companyUuid?: string } = selfCompanySubjectScope(comparison)
  const comparisonPrimary: ProductPrimarySummary = scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), comparisonScope)
  const comparisonSecondary: ProductSecondaryDetail = scopeMockProductSecondary(requireMockProductSecondary(skuGroupKey), comparisonScope)
  return {
    ...baseSecondary,
    comparisonPrice: comparisonPrimary.price,
    comparisonQty: comparisonPrimary.qty,
    comparisonRatioBySize: skewComparisonRatioBySize(comparisonRatioBySizeFromRows(comparisonSecondary), comparison),
  }
}

export const mockDashboardApi = {
  getSelfSales: async (params?: SelfSalesParams) : Promise<{ qty: number; amount: number; opMarginAmount: number; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; avgPrice: number; avgCost: number; marginRate: number; feeRate: number; opMarginRate: number; }[]> => {
    await sleep(80)
    const weighted: number = periodWeight(params)
    return selfSalesRows
      .map((row: SelfSalesRow) : SelfSalesRow | null => scopeMockSelfSalesRow(row, params))
      .filter((row: SelfSalesRow | null): row is NonNullable<typeof row> => row != null && matchesProductFilters(row, params))
      .map((row: SelfSalesRow) : { qty: number; amount: number; opMarginAmount: number; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; avgPrice: number; avgCost: number; marginRate: number; feeRate: number; opMarginRate: number; } => ({
        ...row,
        qty: Math.max(0, Math.round(row.qty * weighted)),
        amount: Math.max(0, Math.round(row.amount * weighted)),
        opMarginAmount: Math.max(0, Math.round(row.opMarginAmount * weighted)),
      }))
      .sort((a: { qty: number; amount: number; opMarginAmount: number; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; avgPrice: number; avgCost: number; marginRate: number; feeRate: number; opMarginRate: number; }, b: { qty: number; amount: number; opMarginAmount: number; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; avgPrice: number; avgCost: number; marginRate: number; feeRate: number; opMarginRate: number; }) : number => b.qty - a.qty)
  },

  getSelfSalesScatterGrid: async (params?: SelfSalesGridParams) : Promise<ScatterSalesGridResponse> => buildSelfSalesScatterGridFromRows(await mockDashboardApi.getSelfSales(params), params),

  getCompetitorSales: async (params?: CompetitorSalesParams) : Promise<{ competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; }[]> => {
    await sleep(80)
    const weighted: number = periodWeight(params)
    const channels: MockSecondaryCompetitorChannel[] = getMockCompetitorSalesChannels(params?.competitorChannelId)
    return competitorSalesRows
      .map((row: CompetitorSalesRow) : CompetitorSalesRow | null => scopeMockCompetitorSalesRow(row, params))
      .filter((row: CompetitorSalesRow | null): row is NonNullable<typeof row> => row != null && matchesProductFilters(row, params))
      .map((row: CompetitorSalesRow) : { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; } => {
        const channelMetrics: { qty: number; amount: number; }[] = channels.map((channel: MockSecondaryCompetitorChannel) : { qty: number; amount: number; } => {
          const qty: number = Math.max(0, Math.round(row.competitorQty * weighted * channel.qtySkew))
          const avgPrice: number = Math.max(0, Math.round(row.competitorAvgPrice * channel.priceSkew))
          return { qty, amount: Math.max(0, Math.round(qty * avgPrice)) }
        })
        const competitorQty: number = channelMetrics.reduce((sum: number, metric: { qty: number; amount: number; }) : number => sum + metric.qty, 0)
        const competitorAmount: number = channelMetrics.reduce((sum: number, metric: { qty: number; amount: number; }) : number => sum + metric.amount, 0)
        return {
          ...row,
          competitorQty,
          competitorAvgPrice: competitorQty > 0 ? Math.max(0, Math.round(competitorAmount / competitorQty)) : 0,
          competitorAmount,
          selfQty: row.selfQty == null ? null : Math.max(0, Math.round(row.selfQty * weighted)),
          selfAmount: row.selfAmount == null ? null : Math.max(0, Math.round(row.selfAmount * weighted)),
        }
      })
      .sort((a: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; }, b: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; }) : number => b.competitorQty - a.competitorQty)
  },

  getCompetitorSalesScatterGrid: async (params?: CompetitorSalesGridParams) : Promise<ScatterSalesGridResponse> => buildCompetitorSalesScatterGridFromRows(await mockDashboardApi.getCompetitorSales(params), params),

  getSalesFilterMeta: async (params?: SalesFilterMetaParams) : Promise<{ brands: string[]; categories: string[]; codes: string[]; colorCodes: string[]; productNames: string[]; historicalMonths: string[]; }> => {
    await sleep(60)
    const scopedSelf: (SelfSalesRow | null)[] = selfSalesRows.map((row: SelfSalesRow) : SelfSalesRow | null => scopeMockSelfSalesRow(row, params)).filter(Boolean)
    const scopedCompetitor: (CompetitorSalesRow | null)[] = competitorSalesRows.map((row: CompetitorSalesRow) : CompetitorSalesRow | null => scopeMockCompetitorSalesRow(row, params)).filter(Boolean)
    const rows: { code: string; colorCode: string; productName: string; }[] = [...scopedSelf, ...scopedCompetitor] as Array<{ code: string; colorCode: string; productName: string }>
    return {
      brands,
      categories,
      codes: uniqueSortedStrings(new Set(rows.map((row: { code: string; colorCode: string; productName: string; }) : string => row.code))),
      colorCodes: colorCodeOrder.filter((colorCode: string) : boolean => rows.some((row: { code: string; colorCode: string; productName: string; }) : boolean => row.colorCode === colorCode)),
      productNames: uniqueSortedStrings(new Set(rows.map((row: { code: string; colorCode: string; productName: string; }) : string => row.productName))),
      historicalMonths,
    }
  },

  getProductDrawerBundle: async (skuGroupKey: string, params: ProductDrawerBundleParams) : Promise<{ summary: ProductPrimarySummary; }> => {
    await sleep(80)
    const base: ProductComparisonBaseSubjectRef = params.base
    assertMockSubjectRole(base, 'base')
    const summary: ProductPrimarySummary = { ...scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), selfCompanySubjectScope(base)) }
    return { summary }
  },

  getProductComparisonTargets: async (params: ProductComparisonTargetParams) : Promise<ProductComparisonTarget[]> => {
    await sleep(40)
    return getMockProductComparisonTargets(params)
  },

  getProductMonthlyTrend: async (skuGroupKey: string, params: ProductMonthlyTrendParams): Promise<ProductMonthlyTrend> => {
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
      return {
        skuGroupKey: primary.skuGroupKey,
        targetPeriodDays: { start: params.startDate, end: params.endDate },
        base,
        comparison,
        points,
      }
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
  },

  getProductSalesInsight: async (skuGroupKey: string, params: ProductSalesInsightParams): Promise<ProductSalesInsight> => {
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
  },

  getProductSecondaryDetail: async (skuGroupKey: string, params: ProductSecondaryDetailParams) : Promise<ProductSecondaryDetail> => {
    await sleep(80)
    return buildMockProductSecondaryDetail(skuGroupKey, params)
  },

  getSecondaryAiComment: async (params: SecondaryAiCommentParams) : Promise<{ prompt: string; answer: string; generatedAt: string; }> => {
    await sleep(140)
    return buildSecondaryAiComment(params)
  },

  getSecondaryDailyTrend: async ({ skuGroupKey, startDate, endDate, forecastDays, base, comparison }: SecondaryDailyTrendParams) : Promise<SecondaryDailyTrendPoint[]> => {
    await sleep(80)
    const primary: ProductPrimarySummary = scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), selfCompanySubjectScope(base))
    const stockTrend: { date: string; stock: number; inboundExpected: number; inboundQty: number; }[] = scopeMockStockTrend(skuGroupKey, requireMockStockTrend(skuGroupKey), selfCompanySubjectScope(base))
    return buildSecondaryDailyTrend(primary.monthlySalesTrend ?? [], stockTrend, startDate, endDate, forecastDays, comparisonScaleForSubject(skuGroupKey, primary, comparison))
  },

  getSecondaryCompetitorChannels: async () : Promise<SecondaryCompetitorChannel[]> => {
    await sleep(40)
    return secondaryCompetitorChannels
  },

  ...candidateMockApi,
  getSecondaryStockOrderCalc,
}
