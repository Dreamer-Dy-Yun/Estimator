import type { CompetitorSalesRow, SelfSalesRow } from '../../types'
import type { ScatterSalesGridResponse, SecondaryAiCommentParams, SecondaryCompetitorChannel } from '../types'
import type { MockSecondaryCompetitorChannel } from './salesTables'
import type {
  CompetitorSalesGridParams,
  CompetitorSalesParams,
  SalesFilterMetaParams,
  SelfSalesGridParams,
  SelfSalesParams,
} from '../types'
import { uniqueSortedStrings } from '../../utils/uniqueSortedStrings'
import { candidateMockApi } from './candidateMockApi'
import { buildSecondaryAiComment } from './secondaryAiComment'
import { getSecondaryStockOrderCalc } from './secondaryStockOrderCalcApi'
import {
  brands,
  categories,
  colorCodeOrder,
  competitorSalesRows,
  getMockCompetitorSalesChannels,
  secondaryCompetitorChannels,
  selfSalesRows,
} from './salesTables'
import { buildCompetitorSalesScatterGridFromRows, buildSelfSalesScatterGridFromRows } from '../../utils/scatterGridBuild'
import { estimatePeriodWeight, historicalMonths } from './productCatalog'
import {
  scopeMockCompetitorSalesRow,
  scopeMockSelfSalesRow,
} from './mockCompanyScope'
import {
  getMockProductComparisonTargets,
  getMockProductDrawerBundle,
  getMockProductMonthlyTrend,
  getMockProductSalesInsight,
  getMockSecondaryDailyTrend,
  getMockSecondaryInboundSplitSource,
} from './mockProductComparisonApi'
import { getMockProductSecondaryDetail } from './mockProductSecondaryDetailApi'
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

export const mockDashboardApi = {
  getSelfSales: async (params?: SelfSalesParams) : Promise<SelfSalesRow[]> => {
    await sleep(80)
    const weighted: number = periodWeight(params)
    return selfSalesRows
      .map((row: SelfSalesRow) : SelfSalesRow | null => scopeMockSelfSalesRow(row, params))
      .filter((row: SelfSalesRow | null): row is NonNullable<typeof row> => row != null && matchesProductFilters(row, params))
      .map((row: SelfSalesRow) : SelfSalesRow => ({
        ...row,
        qty: Math.max(0, Math.round(row.qty * weighted)),
        amount: Math.max(0, Math.round(row.amount * weighted)),
        opMarginAmount: Math.max(0, Math.round(row.opMarginAmount * weighted)),
      }))
      .sort((a: SelfSalesRow, b: SelfSalesRow) : number => b.qty - a.qty)
  },

  getSelfSalesScatterGrid: async (params?: SelfSalesGridParams) : Promise<ScatterSalesGridResponse> => buildSelfSalesScatterGridFromRows(await mockDashboardApi.getSelfSales(params), params),

  getCompetitorSales: async (params?: CompetitorSalesParams) : Promise<CompetitorSalesRow[]> => {
    await sleep(80)
    const weighted: number = periodWeight(params)
    const channels: MockSecondaryCompetitorChannel[] = getMockCompetitorSalesChannels(params?.competitorChannelId)
    return competitorSalesRows
      .map((row: CompetitorSalesRow) : CompetitorSalesRow | null => scopeMockCompetitorSalesRow(row, params))
      .filter((row: CompetitorSalesRow | null): row is NonNullable<typeof row> => row != null && matchesProductFilters(row, params))
      .map((row: CompetitorSalesRow) : CompetitorSalesRow => {
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
      .sort((a: CompetitorSalesRow, b: CompetitorSalesRow) : number => b.competitorQty - a.competitorQty)
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

  getProductDrawerBundle: getMockProductDrawerBundle,
  getProductComparisonTargets: getMockProductComparisonTargets,
  getProductMonthlyTrend: getMockProductMonthlyTrend,
  getProductSalesInsight: getMockProductSalesInsight,
  getProductSecondaryDetail: getMockProductSecondaryDetail,

  getSecondaryAiComment: async (params: SecondaryAiCommentParams) : Promise<{ prompt: string; answer: string; generatedAt: string; }> => {
    await sleep(140)
    return buildSecondaryAiComment(params)
  },

  getSecondaryDailyTrend: getMockSecondaryDailyTrend,
  getSecondaryInboundSplitSource: getMockSecondaryInboundSplitSource,

  getSecondaryCompetitorChannels: async () : Promise<SecondaryCompetitorChannel[]> => {
    await sleep(40)
    return secondaryCompetitorChannels
  },

  ...candidateMockApi,
  getSecondaryStockOrderCalc,
}
