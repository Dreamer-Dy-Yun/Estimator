import type { MockOwnerOrCompanyScope } from './candidateMockApi'
import type { AppendCandidateItemsResponse, CandidateDetailBulkConfirmProgressEvent, CandidateDetailBulkConfirmStartPayload, CandidateDetailBulkConfirmStartResult, CandidateDetailBulkConfirmSubscription, CandidateItemDetail, CandidateItemListParams, CandidateItemListResult, CandidateOrderMetricEvent, CandidateOrderMetricStreamParams, CandidateOrderMetricSubscription, CandidateRecommendationParams, CandidateRecommendationResult, CandidateStashExcelUploadResult, CandidateStashLlmCommentJobProgressEvent, CandidateStashLlmCommentJobStartResult, CandidateStashLlmCommentJobSubscription, CandidateStashSummary, ProductSecondaryDetail, SecondaryCompetitorChannel, SecondaryStockOrderCalcResult, UpdateCandidateItemPayload, UpdateCandidateItemResponse } from '..'
import type { CompetitorSalesRow, SelfSalesRow } from '../../types'
import type { AppendCandidateItemPayload, AppendCandidateItemsPayload, CreateCandidateStashPayload, MonthlySalesPoint, ScatterSalesGridResponse, SecondaryDailyTrendPoint, SecondaryStockOrderCalcParams, UpdateCandidateStashPayload } from '../types'
import type { MockSecondaryCompetitorChannel } from './salesTables'
import type { ProductPrimarySummary } from '../../types'
import type {
  CompetitorSalesGridParams,
  CompetitorSalesParams,
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
import { buildScatterGridCells } from './scatterGrid'
import { estimatePeriodWeight, historicalMonths, makeSalesTrend } from './productCatalog'
import { requireMockProductPrimary, requireMockProductSecondary, requireMockStockTrend } from './mockProductLookup'
import {
  scopeMockCompetitorSalesRow,
  scopeMockProductPrimary,
  scopeMockProductSecondary,
  scopeMockSelfSalesRow,
  scopeMockStockTrend,
} from './mockCompanyScope'
import { sleep } from './utils'

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

export const mockDashboardApi: { getSecondaryStockOrderCalc: (params: SecondaryStockOrderCalcParams) => Promise<SecondaryStockOrderCalcResult>; getCandidateStashes: (first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope) => Promise<CandidateStashSummary[]>; getCandidateItemsByStash: (params: CandidateItemListParams, ownerUserUuid?: string) => Promise<CandidateItemListResult>; getCandidateRecommendations: (params: CandidateRecommendationParams, ownerUserUuid?: string) => Promise<CandidateRecommendationResult>; getCandidateItemByUuid: (itemUuid: string, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope) => Promise<CandidateItemDetail | null>; subscribeCandidateOrderMetrics: (params: CandidateOrderMetricStreamParams, listener: (event: CandidateOrderMetricEvent) => void, ownerUserUuid?: string) => CandidateOrderMetricSubscription; startCandidateStashLlmCommentJob: (stashUuid: string, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope) => Promise<CandidateStashLlmCommentJobStartResult>; subscribeCandidateStashLlmCommentJob: (jobId: string, listener: (event: CandidateStashLlmCommentJobProgressEvent) => void, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope) => CandidateStashLlmCommentJobSubscription; startCandidateDetailBulkConfirm: (payload: CandidateDetailBulkConfirmStartPayload, ownerUserUuid?: string) => Promise<CandidateDetailBulkConfirmStartResult>; subscribeCandidateDetailBulkConfirm: (jobId: string, listener: (event: CandidateDetailBulkConfirmProgressEvent) => void, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope) => CandidateDetailBulkConfirmSubscription; deleteCandidateItem: (itemUuid: string, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope) => Promise<void>; deleteCandidateItems: (stashUuid: string, itemUuids: string[], first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope) => Promise<void>; deleteCandidateStash: (stashUuid: string, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope) => Promise<void>; createCandidateStash: (payload: CreateCandidateStashPayload, ownerUserUuid?: string) => Promise<CandidateStashSummary>; updateCandidateStash: (payload: UpdateCandidateStashPayload, ownerUserUuid?: string) => Promise<CandidateStashSummary>; duplicateCandidateStash: (sourceStashUuid: string, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope) => Promise<void>; appendCandidateItem: (payload: AppendCandidateItemPayload, ownerUserUuid?: string) => Promise<void>; appendCandidateItems: (payload: AppendCandidateItemsPayload, ownerUserUuid?: string) => Promise<AppendCandidateItemsResponse>; updateCandidateItem: (payload: UpdateCandidateItemPayload, ownerUserUuid?: string) => Promise<UpdateCandidateItemResponse>; uploadCandidateStashExcel: (file: File, first?: MockOwnerOrCompanyScope, second?: MockOwnerOrCompanyScope) => Promise<CandidateStashExcelUploadResult>; getSelfSales: (params?: SelfSalesParams) => Promise<{ qty: number; amount: number; opMarginAmount: number; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; avgPrice: number; avgCost: number; marginRate: number; feeRate: number; opMarginRate: number; }[]>; getSelfSalesScatterGrid: (params?: SelfSalesGridParams) => Promise<ScatterSalesGridResponse>; getCompetitorSales: (params?: CompetitorSalesParams) => Promise<{ competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; }[]>; getCompetitorSalesScatterGrid: (params?: CompetitorSalesGridParams) => Promise<ScatterSalesGridResponse>; getSalesFilterMeta: (params?: SalesFilterMetaParams) => Promise<{ brands: string[]; categories: string[]; codes: string[]; colorCodes: string[]; productNames: string[]; historicalMonths: string[]; }>; getProductDrawerBundle: (skuGroupKey: string, params?: ProductDrawerBundleParams) => Promise<{ summary: ProductPrimarySummary; }>; getProductMonthlyTrend: (skuGroupKey: string, params: ProductMonthlyTrendParams) => Promise<ProductMonthlyTrend>; getProductSalesInsight: (skuGroupKey: string, params: ProductSalesInsightParams) => Promise<ProductSalesInsight>; getProductSecondaryDetail: (skuGroupKey: string, params?: ProductSecondaryDetailParams) => Promise<ProductSecondaryDetail>; getSecondaryAiComment: (params: SecondaryAiCommentParams) => Promise<{ prompt: string; answer: string; generatedAt: string; }>; getSecondaryDailyTrend: ({ skuGroupKey, startDate, endDate, forecastDays, competitorChannelId, companyUuid }: SecondaryDailyTrendParams) => Promise<SecondaryDailyTrendPoint[]>; getSecondaryCompetitorChannels: () => Promise<SecondaryCompetitorChannel[]>; } = {
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

  getSelfSalesScatterGrid: async (params?: SelfSalesGridParams) : Promise<ScatterSalesGridResponse> => buildScatterGridCells(
    (await mockDashboardApi.getSelfSales(params)).map((row: { qty: number; amount: number; opMarginAmount: number; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; avgPrice: number; avgCost: number; marginRate: number; feeRate: number; opMarginRate: number; }) : { skuGroupKey: string; x: number; y: number; } => ({ skuGroupKey: row.skuGroupKey, x: row.opMarginRate, y: row.qty })),
    params?.xBucketSize,
    params?.yBucketSize,
    params?.maxSkuIdsPerCell,
  ),

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

  getCompetitorSalesScatterGrid: async (params?: CompetitorSalesGridParams) : Promise<ScatterSalesGridResponse> => buildScatterGridCells(
    (await mockDashboardApi.getCompetitorSales(params))
      .filter((row: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; }): row is typeof row & { selfQty: number } => row.selfQty != null)
      .map((row: { competitorQty: number; competitorAvgPrice: number; competitorAmount: number; selfQty: number | null; selfAmount: number | null; id: string; skuGroupKey: string; rank: number; rankPercentile: number; brand: string; category: string; code: string; productName: string; colorCode: string; selfAvgPrice: number | null; } & { selfQty: number; }) : { skuGroupKey: string; x: number; y: number; } => ({ skuGroupKey: row.skuGroupKey, x: row.selfQty, y: row.competitorQty })),
    params?.xBucketSize,
    params?.yBucketSize,
    params?.maxSkuIdsPerCell,
  ),

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

  getProductDrawerBundle: async (skuGroupKey: string, params?: ProductDrawerBundleParams) : Promise<{ summary: ProductPrimarySummary; }> => {
    await sleep(80)
    const summary: ProductPrimarySummary = { ...scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), params) }
    return { summary }
  },

  getProductMonthlyTrend: async (skuGroupKey: string, params: ProductMonthlyTrendParams): Promise<ProductMonthlyTrend> => {
    await sleep(80)
    const primary: ProductPrimarySummary = scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), params)
    const channel: MockSecondaryCompetitorChannel = getMockSecondaryCompetitorChannel(params.competitorChannelId)
    if (primary.code === 'TEST-TOP') {
      const points: { date: string; selfSales: number; competitorSales: number | null; isForecast: boolean; }[] = makeSalesTrend(100, skuGroupKey.charCodeAt(0), params.forecastMonths ?? DEFAULT_FORECAST_MONTHS, {
        historyStartMonth: dateToMonth(params.startDate),
        historyEndMonth: dateToMonth(params.endDate),
        forecastStartMonth: nextMonth(dateToMonth(params.endDate)),
      }).map((point: MonthlySalesPoint) : { date: string; selfSales: number; competitorSales: number | null; isForecast: boolean; } => ({
        date: point.date,
        selfSales: 100,
        competitorSales: point.isForecast ? null : Math.max(0, Math.round(200 * channel.qtySkew)),
        isForecast: point.isForecast,
      }))
      return {
        skuGroupKey: primary.skuGroupKey,
        targetPeriodDays: { start: params.startDate, end: params.endDate },
        competitorChannelId: channel.id,
        competitorChannelLabel: channel.label,
        points,
      }
    }
    return {
      skuGroupKey: primary.skuGroupKey,
      targetPeriodDays: { start: params.startDate, end: params.endDate },
      competitorChannelId: channel.id,
      competitorChannelLabel: channel.label,
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
        .map((point: MonthlySalesPoint, index: number) : { date: string; selfSales: number; competitorSales: number | null; isForecast: boolean; } => ({
          date: point.date,
          selfSales: Math.max(0, Math.round(point.sales)),
          competitorSales: point.isForecast ? null : Math.max(0, Math.round(point.sales * 10 * channel.qtySkew * (1 + Math.sin(index) * 0.06))),
          isForecast: point.isForecast,
        })),
    }
  },

  getProductSalesInsight: async (skuGroupKey: string, params: ProductSalesInsightParams): Promise<ProductSalesInsight> => {
    await sleep(80)
    const primary: ProductPrimarySummary = scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), params)
    const secondary: ProductSecondaryDetail = scopeMockProductSecondary(requireMockProductSecondary(skuGroupKey), params)
    const channel: MockSecondaryCompetitorChannel = getMockSecondaryCompetitorChannel(params.competitorChannelId)
    return {
      skuGroupKey: primary.skuGroupKey,
      targetPeriodDays: { start: params.startDate, end: params.endDate },
      competitorChannelId: channel.id,
      competitorChannelLabel: channel.label,
      self: buildSalesKpiColumn('self', primary, secondary, channel),
      competitor: buildSalesKpiColumn('competitor', primary, secondary, channel),
    }
  },

  getProductSecondaryDetail: async (skuGroupKey: string, params?: ProductSecondaryDetailParams) : Promise<ProductSecondaryDetail> => {
    await sleep(80)
    return scopeMockProductSecondary(requireMockProductSecondary(skuGroupKey), params)
  },

  getSecondaryAiComment: async (params: SecondaryAiCommentParams) : Promise<{ prompt: string; answer: string; generatedAt: string; }> => {
    await sleep(140)
    return buildSecondaryAiComment(params)
  },

  getSecondaryDailyTrend: async ({ skuGroupKey, startDate, endDate, forecastDays, competitorChannelId, companyUuid }: SecondaryDailyTrendParams) : Promise<SecondaryDailyTrendPoint[]> => {
    await sleep(80)
    const primary: ProductPrimarySummary = scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), { companyUuid })
    const stockTrend: { date: string; stock: number; inboundExpected: number; inboundQty: number; }[] = scopeMockStockTrend(skuGroupKey, requireMockStockTrend(skuGroupKey), { companyUuid })
    return buildSecondaryDailyTrend(primary.monthlySalesTrend ?? [], stockTrend, startDate, endDate, forecastDays, getMockSecondaryCompetitorChannel(competitorChannelId).qtySkew)
  },

  getSecondaryCompetitorChannels: async () : Promise<SecondaryCompetitorChannel[]> => {
    await sleep(40)
    return secondaryCompetitorChannels
  },

  ...candidateMockApi,
  getSecondaryStockOrderCalc,
}
