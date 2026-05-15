import type { ProductPrimarySummary } from '../../types'
import type {
  CompetitorSalesParams,
  CompetitorSalesGridParams,
  ProductMonthlyTrend,
  ProductMonthlyTrendParams,
  ProductSalesInsight,
  ProductSalesInsightParams,
  ProductSecondaryDetailParams,
  SecondaryAiCommentParams,
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

const koNumber = new Intl.NumberFormat('ko-KR')

function formatEa(value: number | null | undefined) {
  return `${koNumber.format(Math.max(0, Math.round(value ?? 0)))}EA`
}

function formatWon(value: number | null | undefined) {
  return `${koNumber.format(Math.max(0, Math.round(value ?? 0)))}원`
}

function buildSecondaryAiComment(params: SecondaryAiCommentParams) {
  const primary = productPrimaryBySkuGroupKey[params.skuGroupKey] ?? productPrimaryBySkuGroupKey[allKnownSkuGroupKeys[0]]!
  const secondary = productSecondaryBySkuGroupKey[params.skuGroupKey] ?? productSecondaryBySkuGroupKey[allKnownSkuGroupKeys[0]]!
  const channel = getMockSecondaryCompetitorChannel(params.competitorChannelId)
  const selfCol = buildSalesKpiColumn('self', primary, secondary, channel)
  const competitorCol = buildSalesKpiColumn('competitor', primary, secondary, channel)
  const topSize = primary.sizeMix.reduce<(typeof primary.sizeMix)[number] | null>(
    (best, row) => (best == null || row.qty > best.qty ? row : best),
    null,
  )
  const competitorQty = Math.max(0, Math.round(competitorCol.qty ?? 0))
  const selfQty = Math.max(0, Math.round(selfCol.qty ?? 0))
  const qtyGap = competitorQty - selfQty
  const prompt = [
    `${primary.brand} ${primary.productName}(${primary.code}/${primary.colorCode})의 2차 드로워 AI 코멘트를 작성해 주세요.`,
    `데이터 참조기간 ${params.periodStart}~${params.periodEnd}, 예측 개월 ${params.forecastMonths}, 경쟁 채널 ${channel.label} 기준입니다.`,
    params.candidateItemUuid ? `후보 아이템 UUID: ${params.candidateItemUuid}` : '후보 아이템 저장 전 live 검토입니다.',
  ].join('\n')
  const answer = [
    `${primary.productName}은(는) ${channel.label} 기준 경쟁 판매량 ${formatEa(competitorQty)}, 자사 판매량 ${formatEa(selfQty)}로 확인됩니다.`,
    qtyGap > 0
      ? `경쟁 채널 판매량이 자사보다 ${formatEa(qtyGap)} 높아, 입고 전 판매 속도와 노출 조건을 먼저 점검하는 편이 좋습니다.`
      : `자사 판매량이 경쟁 채널 대비 밀리지 않아, 현재 오더 수량은 재고 여유와 이익률 중심으로 조정하면 됩니다.`,
    `추천 오더 기준 수량은 ${formatEa(primary.recommendedOrderQty)}, 예상 주문 원가는 약 ${formatWon(primary.recommendedOrderQty * Math.round(selfCol.avgCost ?? 0))}입니다.`,
    topSize
      ? `${topSize.size} 사이즈 판매 비중이 가장 커서 사이즈별 오더 조정 시 우선 확인하세요.`
      : '사이즈별 판매 비중 데이터가 비어 있어, 저장 전 사이즈 배분 확인이 필요합니다.',
  ].join('\n')
  return {
    llmPrompt: prompt,
    llmAnswer: answer,
    generatedAt: new Date().toISOString(),
  }
}

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
  getSecondaryAiComment: async (params: SecondaryAiCommentParams) => {
    await sleep(140)
    return buildSecondaryAiComment(params)
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
