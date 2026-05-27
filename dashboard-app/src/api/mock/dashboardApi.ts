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

function queryText(value?: string) {
  return value?.trim().toLowerCase()
}

function matchesProductFilters(
  row: { brand: string; category: string; code: string; colorCode: string; productName: string },
  params?: SelfSalesParams | CompetitorSalesParams,
) {
  const codeQuery = queryText(params?.codeQuery)
  const nameQuery = queryText(params?.nameQuery)
  return (!params?.brand || row.brand === params.brand)
    && (!params?.category || row.category === params.category)
    && (!params?.colorCode || row.colorCode === params.colorCode)
    && (!codeQuery || row.code.toLowerCase().includes(codeQuery))
    && (!nameQuery || row.productName.toLowerCase().includes(nameQuery))
}

function periodWeight(params?: { startDate?: string; endDate?: string }) {
  return estimatePeriodWeight(params?.startDate, params?.endDate)
}

const dateToMonth = (date: string) => date.slice(0, 7)

const nextMonth = (month: string) => {
  const [year, monthNo] = month.split('-').map(Number)
  const next = new Date(year, monthNo, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
}

export const mockDashboardApi = {
  getSelfSales: async (params?: SelfSalesParams) => {
    await sleep(80)
    const weighted = periodWeight(params)
    return selfSalesRows
      .map((row) => scopeMockSelfSalesRow(row, params))
      .filter((row): row is NonNullable<typeof row> => row != null && matchesProductFilters(row, params))
      .map((row) => ({
        ...row,
        qty: Math.max(0, Math.round(row.qty * weighted)),
        amount: Math.max(0, Math.round(row.amount * weighted)),
        opMarginAmount: Math.max(0, Math.round(row.opMarginAmount * weighted)),
      }))
      .sort((a, b) => b.qty - a.qty)
  },

  getSelfSalesScatterGrid: async (params?: SelfSalesGridParams) => buildScatterGridCells(
    (await mockDashboardApi.getSelfSales(params)).map((row) => ({ skuGroupKey: row.skuGroupKey, x: row.opMarginRate, y: row.qty })),
    params?.xBucketSize,
    params?.yBucketSize,
    params?.maxSkuIdsPerCell,
  ),

  getCompetitorSales: async (params?: CompetitorSalesParams) => {
    await sleep(80)
    const weighted = periodWeight(params)
    const channels = getMockCompetitorSalesChannels(params?.competitorChannelId)
    return competitorSalesRows
      .map((row) => scopeMockCompetitorSalesRow(row, params))
      .filter((row): row is NonNullable<typeof row> => row != null && matchesProductFilters(row, params))
      .map((row) => {
        const channelMetrics = channels.map((channel) => {
          const qty = Math.max(0, Math.round(row.competitorQty * weighted * channel.qtySkew))
          const avgPrice = Math.max(0, Math.round(row.competitorAvgPrice * channel.priceSkew))
          return { qty, amount: Math.max(0, Math.round(qty * avgPrice)) }
        })
        const competitorQty = channelMetrics.reduce((sum, metric) => sum + metric.qty, 0)
        const competitorAmount = channelMetrics.reduce((sum, metric) => sum + metric.amount, 0)
        return {
          ...row,
          competitorQty,
          competitorAvgPrice: competitorQty > 0 ? Math.max(0, Math.round(competitorAmount / competitorQty)) : 0,
          competitorAmount,
          selfQty: row.selfQty == null ? null : Math.max(0, Math.round(row.selfQty * weighted)),
          selfAmount: row.selfAmount == null ? null : Math.max(0, Math.round(row.selfAmount * weighted)),
        }
      })
      .sort((a, b) => b.competitorQty - a.competitorQty)
  },

  getCompetitorSalesScatterGrid: async (params?: CompetitorSalesGridParams) => buildScatterGridCells(
    (await mockDashboardApi.getCompetitorSales(params))
      .filter((row): row is typeof row & { selfQty: number } => row.selfQty != null)
      .map((row) => ({ skuGroupKey: row.skuGroupKey, x: row.selfQty, y: row.competitorQty })),
    params?.xBucketSize,
    params?.yBucketSize,
    params?.maxSkuIdsPerCell,
  ),

  getSalesFilterMeta: async (params?: SalesFilterMetaParams) => {
    await sleep(60)
    const scopedSelf = selfSalesRows.map((row) => scopeMockSelfSalesRow(row, params)).filter(Boolean)
    const scopedCompetitor = competitorSalesRows.map((row) => scopeMockCompetitorSalesRow(row, params)).filter(Boolean)
    const rows = [...scopedSelf, ...scopedCompetitor] as Array<{ code: string; colorCode: string; productName: string }>
    return {
      brands,
      categories,
      codes: uniqueSortedStrings(new Set(rows.map((row) => row.code))),
      colorCodes: colorCodeOrder.filter((colorCode) => rows.some((row) => row.colorCode === colorCode)),
      productNames: uniqueSortedStrings(new Set(rows.map((row) => row.productName))),
      historicalMonths,
    }
  },

  getProductDrawerBundle: async (skuGroupKey: string, params?: ProductDrawerBundleParams) => {
    await sleep(80)
    const summary: ProductPrimarySummary = { ...scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), params) }
    return { summary }
  },

  getProductMonthlyTrend: async (skuGroupKey: string, params: ProductMonthlyTrendParams): Promise<ProductMonthlyTrend> => {
    await sleep(80)
    const primary = scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), params)
    const channel = getMockSecondaryCompetitorChannel(params.competitorChannelId)
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
        .map((point, index) => ({
          date: point.date,
          selfSales: Math.max(0, Math.round(point.sales)),
          competitorSales: point.isForecast ? null : Math.max(0, Math.round(point.sales * 10 * channel.qtySkew * (1 + Math.sin(index) * 0.06))),
          isForecast: point.isForecast,
        })),
    }
  },

  getProductSalesInsight: async (skuGroupKey: string, params: ProductSalesInsightParams): Promise<ProductSalesInsight> => {
    await sleep(80)
    const primary = scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), params)
    const secondary = scopeMockProductSecondary(requireMockProductSecondary(skuGroupKey), params)
    const channel = getMockSecondaryCompetitorChannel(params.competitorChannelId)
    return {
      skuGroupKey: primary.skuGroupKey,
      targetPeriodDays: { start: params.startDate, end: params.endDate },
      competitorChannelId: channel.id,
      competitorChannelLabel: channel.label,
      self: buildSalesKpiColumn('self', primary, secondary, channel),
      competitor: buildSalesKpiColumn('competitor', primary, secondary, channel),
    }
  },

  getProductSecondaryDetail: async (skuGroupKey: string, params?: ProductSecondaryDetailParams) => {
    await sleep(80)
    return scopeMockProductSecondary(requireMockProductSecondary(skuGroupKey), params)
  },

  getSecondaryAiComment: async (params: SecondaryAiCommentParams) => {
    await sleep(140)
    return buildSecondaryAiComment(params)
  },

  getSecondaryDailyTrend: async ({ skuGroupKey, startMonth, leadTimeDays, competitorChannelId, companyUuid }: SecondaryDailyTrendParams) => {
    await sleep(80)
    const primary = scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), { companyUuid })
    const stockTrend = scopeMockStockTrend(skuGroupKey, requireMockStockTrend(skuGroupKey), { companyUuid })
    return buildSecondaryDailyTrend(primary.monthlySalesTrend ?? [], stockTrend, startMonth, leadTimeDays, getMockSecondaryCompetitorChannel(competitorChannelId).qtySkew)
  },

  getSecondaryCompetitorChannels: async () => {
    await sleep(40)
    return secondaryCompetitorChannels
  },

  ...candidateMockApi,
  getSecondaryStockOrderCalc,
}
