import type { ProductPrimarySummary } from '../../types'
import type {
  CompetitorSalesParams,
  CompetitorSalesGridParams,
  ProductMonthlyTrend,
  ProductMonthlyTrendParams,
  ProductSalesInsight,
  ProductSalesInsightParams,
  ProductSecondaryDetailParams,
  SecondaryDailyTrendParams,
  SelfSalesParams,
  SelfSalesGridParams,
} from '../types'
import { sleep } from './utils'
import {
  allKnownSkuGroupKeys,
  brands,
  categories,
  colorCodeOrder,
  competitorSalesRows,
  getMockCompetitorSalesChannels,
  getMockSecondaryCompetitorChannel,
  secondaryCompetitorChannels,
  selfSalesRows,
} from './salesTables'
import {
  estimatePeriodWeight,
  historicalMonths,
  makeSalesTrend,
  productPrimaryBySkuGroupKey,
  productSecondaryBySkuGroupKey,
  stockTrendBySkuGroupKey,
} from './productCatalog'
import { buildSecondaryDailyTrend } from './secondaryDailyTrend'
import { buildSalesKpiColumn } from '../../utils/salesKpiColumn'
import { uniqueSortedStrings } from '../../utils/uniqueSortedStrings'
import { buildScatterGridCells } from './scatterGrid'
import { candidateMockApi } from './candidateMockApi'
import { getSecondaryStockOrderCalc } from './secondaryStockOrderCalcApi'

export const mockDashboardApi = {
  getSelfSales: async (params?: SelfSalesParams) => {
    await sleep(80)
    const brand = params?.brand
    const category = params?.category
    const codeQ = params?.codeQuery?.trim().toLowerCase()
    const colorCode = params?.colorCode
    const nameQ = params?.nameQuery?.trim().toLowerCase()
    const weighted = estimatePeriodWeight(params?.startDate, params?.endDate)

    return selfSalesRows
      .filter((row) => (brand ? row.brand === brand : true))
      .filter((row) => (category ? row.category === category : true))
      .filter((row) => (codeQ ? row.code.toLowerCase().includes(codeQ) : true))
      .filter((row) => (colorCode ? row.colorCode === colorCode : true))
      .filter((row) => (nameQ ? row.productName.toLowerCase().includes(nameQ) : true))
      .map((row) => {
        const qty = Math.max(1, Math.round(row.qty * weighted))
        const amount = Math.max(1, Math.round(row.amount * weighted))
        const opMarginAmount = Math.max(1, Math.round(row.opMarginAmount * weighted))
        return {
          ...row,
          qty,
          amount,
          opMarginAmount,
        }
      })
      .sort((a, b) => b.qty - a.qty)
  },
  getSelfSalesScatterGrid: async (params?: SelfSalesGridParams) => {
    const rows = await mockDashboardApi.getSelfSales(params)
    const grouped = rows.map((row) => ({
      skuGroupKey: row.skuGroupKey,
      x: row.opMarginRate,
      y: row.qty,
    }))
    return buildScatterGridCells(grouped, params?.xBucketSize, params?.yBucketSize, params?.maxSkuIdsPerCell)
  },
  getCompetitorSales: async (params?: CompetitorSalesParams) => {
    await sleep(80)
    const brand = params?.brand
    const category = params?.category
    const codeQ = params?.codeQuery?.trim().toLowerCase()
    const colorCode = params?.colorCode
    const nameQ = params?.nameQuery?.trim().toLowerCase()
    const weighted = estimatePeriodWeight(params?.startDate, params?.endDate)
    const channels = getMockCompetitorSalesChannels(params?.competitorChannelId)

    return competitorSalesRows
      .filter((row) => (brand ? row.brand === brand : true))
      .filter((row) => (category ? row.category === category : true))
      .filter((row) => (codeQ ? row.code.toLowerCase().includes(codeQ) : true))
      .filter((row) => (colorCode ? row.colorCode === colorCode : true))
      .filter((row) => (nameQ ? row.productName.toLowerCase().includes(nameQ) : true))
      .map((row) => {
        const channelMetrics = channels.map((channel) => {
          const qty = Math.max(1, Math.round(row.competitorQty * weighted * channel.qtySkew))
          const avgPrice = Math.max(1, Math.round(row.competitorAvgPrice * channel.priceSkew))
          return {
            qty,
            amount: Math.max(1, Math.round(qty * avgPrice)),
          }
        })
        const competitorQty = channelMetrics.reduce((sum, metric) => sum + metric.qty, 0)
        const competitorAmount = channelMetrics.reduce((sum, metric) => sum + metric.amount, 0)
        const competitorAvgPrice = Math.max(1, Math.round(competitorAmount / Math.max(1, competitorQty)))
        const selfQty = row.selfQty != null ? Math.max(1, Math.round(row.selfQty * weighted)) : null
        const selfAmount = row.selfAmount != null ? Math.max(1, Math.round(row.selfAmount * weighted)) : null
        return {
          ...row,
          competitorQty,
          competitorAvgPrice,
          competitorAmount,
          selfQty,
          selfAmount,
        }
      })
      .sort((a, b) => b.competitorQty - a.competitorQty)
  },
  getCompetitorSalesScatterGrid: async (params?: CompetitorSalesGridParams) => {
    const rows = await mockDashboardApi.getCompetitorSales(params)
    const grouped = rows
      .filter((row) => row.selfQty != null)
      .map((row) => ({
        skuGroupKey: row.skuGroupKey,
        x: row.selfQty ?? 0,
        y: row.competitorQty,
      }))
    return buildScatterGridCells(
      grouped,
      params?.xBucketSize,
      params?.yBucketSize,
      params?.maxSkuIdsPerCell,
    )
  },
  getSalesFilterMeta: async () => {
    await sleep(60)
    const codeSet = new Set<string>()
    const colorCodeSet = new Set<string>()
    const nameSet = new Set<string>()
    for (const r of selfSalesRows) {
      codeSet.add(r.code)
      colorCodeSet.add(r.colorCode)
      nameSet.add(r.productName)
    }
    for (const r of competitorSalesRows) {
      codeSet.add(r.code)
      colorCodeSet.add(r.colorCode)
      nameSet.add(r.productName)
    }
    const codes = uniqueSortedStrings(codeSet)
    const colorCodes = colorCodeOrder.filter((colorCode) => colorCodeSet.has(colorCode))
    const productNames = uniqueSortedStrings(nameSet)
    return {
      brands,
      categories,
      codes,
      colorCodes,
      productNames,
      historicalMonths,
    }
  },
  getProductDrawerBundle: async (skuGroupKey: string) => {
    await sleep(80)
    const primary = productPrimaryBySkuGroupKey[skuGroupKey] ?? productPrimaryBySkuGroupKey[allKnownSkuGroupKeys[0]]!
    const { monthlySalesTrend, ...summaryBase } = primary
    void monthlySalesTrend
    const summary: ProductPrimarySummary = {
      ...summaryBase,
    }
    return { summary }
  },
  getProductMonthlyTrend: async (
    skuGroupKey: string,
    params: ProductMonthlyTrendParams,
  ): Promise<ProductMonthlyTrend> => {
    await sleep(80)
    const primary = productPrimaryBySkuGroupKey[skuGroupKey] ?? productPrimaryBySkuGroupKey[allKnownSkuGroupKeys[0]]!
    const fc = Math.max(1, Math.min(24, Math.round(params.forecastMonths ?? 8)))
    const seed = skuGroupKey.charCodeAt(0)
    const base = Math.max(800, Math.round(primary.qty * 0.42))
    const selfTrend = makeSalesTrend(base, seed, fc)
    const channel = getMockSecondaryCompetitorChannel(params.competitorChannelId)
    return {
      skuGroupKey: primary.skuGroupKey,
      targetPeriodDays: {
        start: params.startDate,
        end: params.endDate,
      },
      competitorChannelId: channel.id,
      competitorChannelLabel: channel.label,
      points: selfTrend.map((point, idx) => {
        const rhythm = 1 + Math.sin((idx + seed) * 0.47) * 0.06
        return {
          date: point.date,
          selfSales: Math.max(0, Math.round(point.sales)),
          competitorSales: point.isForecast
            ? null
            : Math.max(1, Math.round(point.sales * 10 * channel.qtySkew * rhythm)),
          isForecast: point.isForecast,
        }
      }),
    }
  },
  getProductSalesInsight: async (
    skuGroupKey: string,
    params: ProductSalesInsightParams,
  ): Promise<ProductSalesInsight> => {
    await sleep(80)
    const primary = productPrimaryBySkuGroupKey[skuGroupKey] ?? productPrimaryBySkuGroupKey[allKnownSkuGroupKeys[0]]!
    const secondary = productSecondaryBySkuGroupKey[skuGroupKey] ?? productSecondaryBySkuGroupKey[allKnownSkuGroupKeys[0]]!
    const channel = getMockSecondaryCompetitorChannel(params.competitorChannelId)
    return {
      skuGroupKey: primary.skuGroupKey,
      targetPeriodDays: {
        start: params.startDate,
        end: params.endDate,
      },
      competitorChannelId: channel.id,
      competitorChannelLabel: channel.label,
      self: buildSalesKpiColumn('self', primary, secondary, channel),
      competitor: buildSalesKpiColumn('competitor', primary, secondary, channel),
    }
  },
  getProductSecondaryDetail: async (skuGroupKey: string, params?: ProductSecondaryDetailParams) => {
    void params
    await sleep(80)
    return productSecondaryBySkuGroupKey[skuGroupKey] ?? productSecondaryBySkuGroupKey[allKnownSkuGroupKeys[0]]!
  },
  getSecondaryDailyTrend: async ({
    skuGroupKey,
    startMonth,
    leadTimeDays,
    competitorChannelId,
  }: SecondaryDailyTrendParams) => {
    await sleep(80)
    const primary = productPrimaryBySkuGroupKey[skuGroupKey] ?? productPrimaryBySkuGroupKey[allKnownSkuGroupKeys[0]]!
    const stockTrend = stockTrendBySkuGroupKey[skuGroupKey] ?? stockTrendBySkuGroupKey[allKnownSkuGroupKeys[0]]!
    const channel = getMockSecondaryCompetitorChannel(competitorChannelId)
    return buildSecondaryDailyTrend(primary.monthlySalesTrend ?? [], stockTrend, startMonth, leadTimeDays, channel.qtySkew)
  },
  getSecondaryCompetitorChannels: async () => {
    await sleep(40)
    return secondaryCompetitorChannels
  },
  ...candidateMockApi,
  getSecondaryStockOrderCalc,
}
