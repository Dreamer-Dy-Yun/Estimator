import type { ProductPrimarySummary } from '../../types'
import type {
  AppendCandidateItemPayload,
  AppendCandidateItemsPayload,
  CandidateBadge,
  CandidateStashAnalysisHandlers,
  CandidateStashAnalysisProgressEvent,
  CandidateItemDetail,
  CandidateItemListParams,
  CandidateItemListResult,
  CandidateItemSummary,
  CandidateRecommendationParams,
  CandidateRecommendationResult,
  CandidateStashExcelUploadResult,
  CandidateStashSummary,
  CreateCandidateStashPayload,
  UpdateCandidateItemPayload,
  UpdateCandidateStashPayload,
  CompetitorSalesParams,
  ProductMonthlyTrend,
  ProductMonthlyTrendParams,
  ProductSalesInsight,
  ProductSalesInsightParams,
  ProductSecondaryDetailParams,
  SecondaryDailyTrendParams,
  SecondaryStockOrderCalcParams,
  SecondaryStockOrderCalcResult,
  SelfSalesParams,
} from '../types'
import { type CandidateItemRecord, type CandidateStashRecord } from './records'
import { makeUuid32, sleep } from './utils'
import { seededCandidateItems, seededCandidateStashes } from './candidateSeeds'
import { MOCK_ADMIN_USER_UUID } from './authApi'
import {
  allKnownSkuGroupKeys,
  brands,
  categories,
  colorCodeOrder,
  competitorBySkuGroupKey,
  competitorSalesRows,
  getMockSecondaryCompetitorChannel,
  secondaryCompetitorChannels,
  selfBySkuGroupKey,
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
import {
  buildSecondaryDailyTrend,
  dailyMeanSigma,
  forecastDailyMeanFromModel,
  zFromServiceLevelPct,
} from './secondaryDailyTrend'
import { buildSalesKpiColumn } from '../../utils/salesKpiColumn'
import { uniqueSortedStrings } from '../../utils/uniqueSortedStrings'

type CandidateAnalysisJob = {
  stashUuid: string
  items: CandidateItemRecord[]
}

const candidateAnalysisJobs = new Map<string, CandidateAnalysisJob>()

function readCandidateStashRecords(): CandidateStashRecord[] {
  return seededCandidateStashes
}

function filterCandidateStashesForOwner(
  rows: CandidateStashRecord[],
  ownerUserUuid?: string,
): CandidateStashRecord[] {
  if (!ownerUserUuid) return rows
  return rows.filter((row) => row.userUuid === ownerUserUuid)
}

function readCandidateItemRecords(): CandidateItemRecord[] {
  return seededCandidateItems
}

function findCandidateStashForOwner(stashUuid: string, ownerUserUuid?: string): CandidateStashRecord | null {
  const stash = readCandidateStashRecords().find((row) => row.uuid === stashUuid) ?? null
  if (!stash) return null
  if (ownerUserUuid && stash.userUuid !== ownerUserUuid) return null
  return stash
}

function readCandidateItemsForStash(stashUuid: string, ownerUserUuid?: string): CandidateItemRecord[] {
  if (!findCandidateStashForOwner(stashUuid, ownerUserUuid)) return []
  return readCandidateItemRecords().filter((row) => row.stashUuid === stashUuid)
}

function buildCandidateAnalysisEvent(
  jobId: string,
  stashUuid: string,
  status: CandidateStashAnalysisProgressEvent['status'],
  totalItems: number,
  completedItems: number,
  message: string,
  item?: CandidateItemRecord | null,
): CandidateStashAnalysisProgressEvent {
  return {
    jobId,
    stashUuid,
    status,
    totalItems,
    completedItems,
    currentItemUuid: item?.uuid ?? null,
    currentProductName: item ? (item.details?.drawer1?.summary?.productName ?? productPrimaryBySkuGroupKey[item.skuGroupKey]?.productName ?? null) : null,
    message,
    error: null,
  }
}

const INNER_ORDER_TOP_PERCENT_THRESHOLD = 10
const INNER_ORDER_BOTTOM_PERCENT_THRESHOLD = 10
const CANDIDATE_BADGES_BY_NAME: Record<string, CandidateBadge> = {
  크림판매: {
    name: '크림판매',
    color: '#0f766e',
    tooltip: `조회 기간 내 크림 경쟁사 판매수량 상위 ${INNER_ORDER_TOP_PERCENT_THRESHOLD}% 이내 후보입니다.`,
  },
  자사이익: {
    name: '자사이익',
    color: '#be123c',
    tooltip: '조회 기간 내 자사 영업이익률이 9% 이상인 후보입니다.',
  },
  자사판매: {
    name: '자사판매',
    color: '#c2410c',
    tooltip: `조회 기간 내 자사 판매수량 상위 ${INNER_ORDER_TOP_PERCENT_THRESHOLD}% 이내 후보입니다.`,
  },
}

function toCandidateBadges(names: string[]): CandidateBadge[] {
  return names.flatMap((name) => {
    const badge = CANDIDATE_BADGES_BY_NAME[name]
    return badge ? [badge] : []
  })
}

function toCandidateStashSummary(
  row: CandidateStashRecord,
  itemCount: number,
  dbUpdatedAt = row.dbUpdatedAt ?? row.dbCreatedAt,
): CandidateStashSummary {
  return {
    uuid: row.uuid,
    name: row.name,
    note: row.note ?? null,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    forecastMonths: row.forecastMonths,
    itemCount,
    dbCreatedAt: row.dbCreatedAt,
    dbUpdatedAt,
  }
}

function inTopPercent(rankPercentile: number | null | undefined) {
  return typeof rankPercentile === 'number' && rankPercentile >= 100 - INNER_ORDER_TOP_PERCENT_THRESHOLD
}

function inBottomPercent(rankPercentile: number | null | undefined) {
  return typeof rankPercentile === 'number' && rankPercentile <= INNER_ORDER_BOTTOM_PERCENT_THRESHOLD
}

function buildCandidateItemInsight(
  skuGroupKey: string,
  expectedSalesQty: number,
  expectedSalesAmount: number,
  expectedOpProfit: number,
  dataReferencePeriod?: { start: string; end: string },
) {
  const competitor = competitorBySkuGroupKey[skuGroupKey]
  const self = selfBySkuGroupKey[skuGroupKey]
  const channelLabel = secondaryCompetitorChannels[0]?.label ?? '크림'
  const badgeNameList: string[] = []
  const periodWeight = dataReferencePeriod
    ? estimatePeriodWeight(dataReferencePeriod.start, dataReferencePeriod.end)
    : 1
  const weightedNumber = (value: number | null | undefined) =>
    typeof value === 'number' ? Math.max(1, Math.round(value * periodWeight)) : null

  if (inTopPercent(competitor?.rankPercentile)) {
    badgeNameList.push(`${channelLabel}판매`)
  }
  if (typeof self?.opMarginRate === 'number' && self.opMarginRate >= 9) {
    badgeNameList.push('자사이익')
  }
  if (inTopPercent(self?.rankPercentile)) {
    badgeNameList.push('자사판매')
  }

  const top = badgeNameList.length > 0
  const bottom = !top && (inBottomPercent(competitor?.rankPercentile) || inBottomPercent(self?.rankPercentile))

  return {
    competitorChannelLabel: channelLabel,
    competitorQty: weightedNumber(competitor?.competitorQty),
    competitorAmount: weightedNumber(competitor?.competitorAmount),
    selfQty: weightedNumber(self?.qty ?? competitor?.selfQty),
    selfAmount: weightedNumber(self?.amount ?? competitor?.selfAmount),
    expectedSalesQty,
    expectedSalesAmount,
    expectedOpProfit,
    selfOpProfitRatePct: self?.opMarginRate ?? null,
    rankTone: top ? 'top' as const : bottom ? 'bottom' as const : 'neutral' as const,
    topPercentThreshold: INNER_ORDER_TOP_PERCENT_THRESHOLD,
    bottomPercentThreshold: INNER_ORDER_BOTTOM_PERCENT_THRESHOLD,
    badges: toCandidateBadges(badgeNameList),
  }
}

function buildCandidateItemSummariesForStash(
  stashUuid: string,
  ownerUserUuid?: string,
  dataReferencePeriod?: { start: string; end: string },
): CandidateItemSummary[] {
  const periodWeight = dataReferencePeriod
    ? estimatePeriodWeight(dataReferencePeriod.start, dataReferencePeriod.end)
    : 1

  return readCandidateItemsForStash(stashUuid, ownerUserUuid)
    .map((row) => {
      const skuGroupKey = row.skuGroupKey
      const primary = productPrimaryBySkuGroupKey[skuGroupKey] ?? productPrimaryBySkuGroupKey[allKnownSkuGroupKeys[0]]!
      const self = selfBySkuGroupKey[skuGroupKey]
      const competitor = competitorBySkuGroupKey[skuGroupKey]
      const avgPrice = Math.max(1, Math.round(self?.avgPrice ?? primary.price))
      const avgCost = Math.max(1, Math.round(self?.avgCost ?? primary.price * 0.78))
      const feeRatePct = Math.max(0, Math.round((self?.feeRate ?? 13) * 10) / 10)
      const baseQty = Math.max(1, Math.round((self?.qty ?? competitor?.selfQty ?? primary.qty) * 0.58))
      const qty = Math.max(1, Math.round(baseQty * periodWeight))
      const expectedOrderAmount = qty * avgCost
      const expectedSalesAmount = qty * avgPrice
      const expectedOpProfit = qty * Math.round(avgPrice - avgCost - (avgPrice * feeRatePct) / 100)
      const opMarginRatePct = expectedSalesAmount > 0 ? (expectedOpProfit / expectedSalesAmount) * 100 : null
      const sizeMix = primary.sizeMix.length ? primary.sizeMix : [{ size: '-', ratio: 1 }]
      const sizeRatioSum = sizeMix.reduce((acc, sizeRow) => acc + Math.max(0, sizeRow.ratio), 0) || 1
      const insight = buildCandidateItemInsight(
        skuGroupKey,
        qty,
        expectedSalesAmount,
        expectedOpProfit,
        dataReferencePeriod,
      )
      return {
        uuid: row.uuid,
        stashUuid: row.stashUuid,
        skuGroupKey,
        brand: primary.brand,
        code: primary.code,
        productName: primary.productName,
        colorCode: primary.colorCode,
        qty,
        expectedOrderAmount,
        expectedSalesAmount,
        expectedOpProfit,
        insight,
        isLatestLlmComment: row.isLatestLlmComment,
        isDetailConfirmed: row.details != null,
        orderExport: {
          competitorChannelLabel: insight.competitorChannelLabel,
          selfQty: insight.selfQty,
          competitorQty: insight.competitorQty,
          expectedSalesQty: qty,
          expectedOrderAmount,
          avgCost,
          avgPrice,
          feeRatePct,
          opMarginRatePct,
          inboundExpectedDate: row.details?.drawer2.stockInputs.leadTimeEndDate ?? null,
          sizeOrderQty: sizeMix.map((sizeRow) => ({
            size: sizeRow.size,
            orderQty: Math.max(0, Math.round(qty * (Math.max(0, sizeRow.ratio) / sizeRatioSum))),
          })),
        },
        dbCreatedAt: row.dbCreatedAt,
        dbUpdatedAt: row.dbUpdatedAt ?? row.dbCreatedAt,
      }
    })
    .sort((a, b) => String(b.dbCreatedAt).localeCompare(String(a.dbCreatedAt)))
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
  },
  getCompetitorSales: async (params?: CompetitorSalesParams) => {
    await sleep(80)
    const brand = params?.brand
    const category = params?.category
    const codeQ = params?.codeQuery?.trim().toLowerCase()
    const colorCode = params?.colorCode
    const nameQ = params?.nameQuery?.trim().toLowerCase()
    const weighted = estimatePeriodWeight(params?.startDate, params?.endDate)
    const channel = getMockSecondaryCompetitorChannel(params?.competitorChannelId)
    const priceSkew = channel.priceSkew
    const qtySkew = channel.qtySkew

    return competitorSalesRows
      .filter((row) => (brand ? row.brand === brand : true))
      .filter((row) => (category ? row.category === category : true))
      .filter((row) => (codeQ ? row.code.toLowerCase().includes(codeQ) : true))
      .filter((row) => (colorCode ? row.colorCode === colorCode : true))
      .filter((row) => (nameQ ? row.productName.toLowerCase().includes(nameQ) : true))
      .map((row) => {
        const compQty = Math.max(1, Math.round(row.competitorQty * weighted * qtySkew))
        const compAvg = Math.max(1, Math.round(row.competitorAvgPrice * priceSkew))
        const competitorAmount = Math.max(1, Math.round(compQty * compAvg))
        const selfQty = row.selfQty != null ? Math.max(1, Math.round(row.selfQty * weighted)) : null
        const selfAmount = row.selfAmount != null ? Math.max(1, Math.round(row.selfAmount * weighted)) : null
        return {
          ...row,
          competitorQty: compQty,
          competitorAvgPrice: compAvg,
          competitorAmount,
          selfQty,
          selfAmount,
        }
      })
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
  getCandidateStashes: async (ownerUserUuid?: string): Promise<CandidateStashSummary[]> => {
    await sleep(60)
    const stashes = readCandidateStashRecords()
    const items = readCandidateItemRecords()
    const owned = filterCandidateStashesForOwner(stashes, ownerUserUuid)
    return owned
      .map((row) => {
        const linkedItems = items.filter((it) => it.stashUuid === row.uuid)
        const latestItemTs = linkedItems.reduce<string>(
          (latest, it) => (String(it.dbCreatedAt) > latest ? String(it.dbCreatedAt) : latest),
          '',
        )
        const recordUpdatedAt = row.dbUpdatedAt ?? row.dbCreatedAt
        const dbUpdatedAt = latestItemTs && latestItemTs > recordUpdatedAt ? latestItemTs : recordUpdatedAt
        return toCandidateStashSummary(row, linkedItems.length, dbUpdatedAt)
      })
      .sort((a, b) => String(b.dbCreatedAt).localeCompare(String(a.dbCreatedAt)))
  },
  getCandidateItemsByStash: async (
    {
      stashUuid,
      dataReferencePeriodStart,
      dataReferencePeriodEnd,
    }: CandidateItemListParams,
    ownerUserUuid?: string,
  ): Promise<CandidateItemListResult> => {
    await sleep(60)
    const items = buildCandidateItemSummariesForStash(stashUuid, ownerUserUuid, {
      start: dataReferencePeriodStart,
      end: dataReferencePeriodEnd,
    })
    return { items }
  },
  getCandidateRecommendations: async (
    {
      stashUuid,
      dataReferencePeriodStart,
      dataReferencePeriodEnd,
    }: CandidateRecommendationParams,
    ownerUserUuid?: string,
  ): Promise<CandidateRecommendationResult> => {
    await sleep(70)
    const items = buildCandidateItemSummariesForStash(stashUuid, ownerUserUuid, {
      start: dataReferencePeriodStart,
      end: dataReferencePeriodEnd,
    })
    const recommendedItems = items.filter(
      (item) => item.insight.rankTone === 'top' || item.insight.badges.length > 0,
    )
    return { items: recommendedItems.length ? recommendedItems : items }
  },
  getCandidateItemByUuid: async (itemUuid: string, ownerUserUuid?: string): Promise<CandidateItemDetail | null> => {
    await sleep(50)
    const row = readCandidateItemRecords().find((it) => it.uuid === itemUuid)
    if (!row) return null
    if (!findCandidateStashForOwner(row.stashUuid, ownerUserUuid)) return null
    return {
      uuid: row.uuid,
      stashUuid: row.stashUuid,
      skuGroupKey: row.skuGroupKey,
      details: row.details,
      isLatestLlmComment: row.isLatestLlmComment,
      dbCreatedAt: row.dbCreatedAt,
      dbUpdatedAt: row.dbUpdatedAt ?? row.dbCreatedAt,
    }
  },
  deleteCandidateItem: async (itemUuid: string, ownerUserUuid?: string): Promise<void> => {
    await sleep(60)
    const row = readCandidateItemRecords().find((it) => it.uuid === itemUuid)
    if (row && !findCandidateStashForOwner(row.stashUuid, ownerUserUuid)) {
      throw new Error('후보 아이템을 찾을 수 없습니다.')
    }
  },
  deleteCandidateItems: async (
    stashUuid: string,
    itemUuids: string[],
    ownerUserUuid?: string,
  ): Promise<void> => {
    await sleep(80)
    if (!findCandidateStashForOwner(stashUuid, ownerUserUuid)) {
      throw new Error('후보군을 찾을 수 없습니다.')
    }
    const uuidSet = new Set(itemUuids)
    const invalidItem = readCandidateItemRecords().find(
      (item) => uuidSet.has(item.uuid) && item.stashUuid !== stashUuid,
    )
    if (invalidItem) {
      throw new Error('후보군에 포함되지 않은 아이템이 있습니다.')
    }
  },
  deleteCandidateStash: async (stashUuid: string, ownerUserUuid?: string): Promise<void> => {
    await sleep(60)
    if (!findCandidateStashForOwner(stashUuid, ownerUserUuid)) {
      throw new Error('후보군을 찾을 수 없습니다.')
    }
  },
  createCandidateStash: async (
    payload: CreateCandidateStashPayload,
    ownerUserUuid = MOCK_ADMIN_USER_UUID,
  ): Promise<CandidateStashSummary> => {
    await sleep(90)
    const now = new Date().toISOString()
    const stash: CandidateStashRecord = {
      uuid: makeUuid32(),
      name: payload.name.trim() || `오더 후보군 ${now.slice(0, 10)}`,
      note: payload.note?.trim() || null,
      userUuid: ownerUserUuid,
      periodStart: payload.periodStart,
      periodEnd: payload.periodEnd,
      forecastMonths: payload.forecastMonths,
      dbCreatedAt: now,
      dbUpdatedAt: now,
    }
    return toCandidateStashSummary(stash, 0)
  },
  updateCandidateStash: async (
    payload: UpdateCandidateStashPayload,
    ownerUserUuid?: string,
  ): Promise<CandidateStashSummary> => {
    await sleep(70)
    const stashes = readCandidateStashRecords()
    const items = readCandidateItemRecords()
    const target = stashes.find((s) => s.uuid === payload.stashUuid)
    if (!target || !findCandidateStashForOwner(target.uuid, ownerUserUuid)) {
      throw new Error('후보군을 찾을 수 없습니다.')
    }
    const now = new Date().toISOString()
    const updated: CandidateStashRecord = {
      ...target,
      name: payload.name.trim() || target.name,
      note: payload.note?.trim() || null,
      dbUpdatedAt: now,
    }
    const linkedItems = items.filter((it) => it.stashUuid === target.uuid)
    return toCandidateStashSummary(updated, linkedItems.length)
  },
  duplicateCandidateStash: async (sourceStashUuid: string, ownerUserUuid?: string): Promise<void> => {
    await sleep(90)
    const stashes = readCandidateStashRecords()
    const source = stashes.find((row) => row.uuid === sourceStashUuid)
    if (!source || !findCandidateStashForOwner(source.uuid, ownerUserUuid)) {
      throw new Error('복제할 후보군을 찾을 수 없습니다.')
    }
  },
  appendCandidateItem: async (payload: AppendCandidateItemPayload, ownerUserUuid?: string): Promise<void> => {
    await sleep(70)
    if (!findCandidateStashForOwner(payload.stashUuid, ownerUserUuid)) {
      throw new Error('후보군을 찾을 수 없습니다.')
    }
    void payload
  },
  appendCandidateItems: async (payload: AppendCandidateItemsPayload, ownerUserUuid?: string): Promise<void> => {
    await sleep(70)
    if (!findCandidateStashForOwner(payload.stashUuid, ownerUserUuid)) {
      throw new Error('후보군을 찾을 수 없습니다.')
    }
    const unknownProduct = payload.skuGroupKeys.find((skuGroupKey) => !productPrimaryBySkuGroupKey[skuGroupKey])
    if (unknownProduct) {
      throw new Error(`상품을 찾을 수 없습니다: ${unknownProduct}`)
    }
  },
  updateCandidateItem: async (payload: UpdateCandidateItemPayload, ownerUserUuid?: string): Promise<void> => {
    await sleep(70)
    const item = readCandidateItemRecords().find((row) => row.uuid === payload.itemUuid)
    if (item && !findCandidateStashForOwner(item.stashUuid, ownerUserUuid)) {
      throw new Error('후보 아이템을 찾을 수 없습니다.')
    }
    void payload
  },
  uploadCandidateStashExcel: async (file: File): Promise<CandidateStashExcelUploadResult> => {
    await sleep(140)

    const fileName = file.name.trim()
    const isExcel = /\.(xlsx|xls)$/i.test(fileName)
    if (!fileName || !isExcel) {
      throw new Error('엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다.')
    }
    if (file.size <= 0) {
      throw new Error('빈 엑셀 파일은 업로드할 수 없습니다.')
    }

    const stashUuid = makeUuid32()

    return {
      stashUuid,
      stashName: `엑셀 업로드 후보군 ${fileName}`,
      itemCount: 0,
      warnings: [
        '목 API는 파일 검증과 성공 응답만 모사하며 프론트 저장소에 후보군을 만들지 않습니다.',
        '실제 백엔드는 필수 컬럼 검증 후 DB에 후보군과 후보 아이템을 저장해야 합니다.',
      ],
    }
  },
  startCandidateStashAnalysis: async (stashUuid: string, ownerUserUuid?: string) => {
    await sleep(60)
    if (!findCandidateStashForOwner(stashUuid, ownerUserUuid)) {
      throw new Error('후보군을 찾을 수 없습니다.')
    }
    const items = readCandidateItemsForStash(stashUuid, ownerUserUuid)
    const jobId = `candidate-analysis-${stashUuid}-${Date.now()}`
    candidateAnalysisJobs.set(jobId, { stashUuid, items })
    return {
      jobId,
      stashUuid,
      itemCount: items.length,
    }
  },
  subscribeCandidateStashAnalysis: (jobId: string, handlers: CandidateStashAnalysisHandlers) => {
    const job = candidateAnalysisJobs.get(jobId)
    let closed = false
    const timers: Array<ReturnType<typeof setTimeout>> = []
    const queue = (delayMs: number, fn: () => void) => {
      const timer = setTimeout(() => {
        if (!closed) fn()
      }, delayMs)
      timers.push(timer)
    }
    const emit = (event: CandidateStashAnalysisProgressEvent) => {
      if (!closed) handlers.onEvent(event)
    }
    const closeFromServer = () => {
      if (closed) return
      closed = true
      timers.forEach((timer) => clearTimeout(timer))
      handlers.onClose?.()
    }

    if (!job) {
      queue(0, () => {
        handlers.onError?.(new Error(`후보군 분석 작업을 찾을 수 없습니다: ${jobId}`))
        closeFromServer()
      })
      return {
        close: () => {
          closed = true
          timers.forEach((timer) => clearTimeout(timer))
        },
      }
    }

    const totalItems = job.items.length
    queue(0, () => {
      emit(buildCandidateAnalysisEvent(
        jobId,
        job.stashUuid,
        'queued',
        totalItems,
        0,
        '백엔드가 후보군 스냅샷 AI 분석 작업을 접수했습니다.',
      ))
    })

    if (totalItems === 0) {
      queue(260, () => {
        emit(buildCandidateAnalysisEvent(
          jobId,
          job.stashUuid,
          'completed',
          0,
          0,
          '분석할 후보 스냅샷이 없습니다.',
        ))
        closeFromServer()
      })
    } else {
      job.items.forEach((item, index) => {
        const productName = item.details?.drawer1?.summary?.productName ?? item.skuGroupKey
        queue(260 + (index * 420), () => {
          emit(buildCandidateAnalysisEvent(
            jobId,
            job.stashUuid,
            'running',
            totalItems,
            index,
            `${productName} 스냅샷을 AI로 분석하는 중입니다.`,
            item,
          ))
        })
        queue(480 + (index * 420), () => {
          emit(buildCandidateAnalysisEvent(
            jobId,
            job.stashUuid,
            'running',
            totalItems,
            index + 1,
            `${productName} 분석을 완료했습니다.`,
            item,
          ))
        })
      })
      queue(700 + (totalItems * 420), () => {
        emit(buildCandidateAnalysisEvent(
          jobId,
          job.stashUuid,
          'completed',
          totalItems,
          totalItems,
          `후보 스냅샷 ${totalItems}건의 AI 분석을 완료했습니다.`,
        ))
        closeFromServer()
      })
    }

    return {
      close: () => {
        closed = true
        timers.forEach((timer) => clearTimeout(timer))
      },
    }
  },
  getSecondaryStockOrderCalc: async ({
    skuGroupKey,
    periodStart,
    periodEnd,
    forecastPeriodEnd,
    serviceLevelPct,
    leadTimeDays,
    safetyStockMode,
    manualSafetyStock,
    dailyMean: dailyMeanParam,
  }: SecondaryStockOrderCalcParams): Promise<SecondaryStockOrderCalcResult> => {
    await sleep(70)
    const primary = productPrimaryBySkuGroupKey[skuGroupKey] ?? productPrimaryBySkuGroupKey[allKnownSkuGroupKeys[0]]!
    const fromTrend = dailyMeanSigma(primary.monthlySalesTrend ?? [], periodStart, periodEnd)
    /** 기간 산술평균: 월 판매 단순 평균의 일환산(일평균 판매량). */
    const trendMuRaw = fromTrend.dailyMean
    const trendDailyMean = Math.round(trendMuRaw * 10) / 10

    /** 예측 수량연산: 가중 일평균(또는 UI에서 넘긴 μ). */
    const forecastMuRaw =
      dailyMeanParam !== undefined && Number.isFinite(dailyMeanParam)
        ? Math.max(0, dailyMeanParam)
        : forecastDailyMeanFromModel(primary.monthlySalesTrend ?? [], periodStart, forecastPeriodEnd ?? periodEnd)
    const dailyMeanRounded = Math.round(forecastMuRaw * 10) / 10

    const sigma = fromTrend.sigma
    const safeLead = Math.max(0, Math.round(leadTimeDays))
    const z = zFromServiceLevelPct(serviceLevelPct)
    const formulaSafetyStock = Math.max(0, Math.round(z * sigma * Math.sqrt(safeLead) + trendMuRaw * safeLead))
    const safetyStock =
      safetyStockMode === 'manual'
        ? Math.max(0, Math.round(manualSafetyStock))
        : formulaSafetyStock
    const safetyRecQty = Math.max(0, Math.round(safetyStock - primary.availableStock + trendMuRaw * safeLead))
    const forecastRecQty = Math.max(0, Math.round(forecastMuRaw * safeLead * 1.05))

    const avgCost = Math.round(primary.price * 0.78)
    const opMarginPerUnit = primary.price - avgCost - Math.round(primary.price * 0.13)
    const toAmounts = (qty: number) => ({
      expectedOrderAmount: qty * avgCost,
      expectedSalesAmount: qty * primary.price,
      expectedOpProfit: qty * opMarginPerUnit,
    })

    return {
      trendDailyMean,
      dailyMean: dailyMeanRounded,
      sigma,
      display: {
        currentStockQtyTotal: 1330,
        totalOrderBalanceTotal: 520,
        expectedInboundOrderBalanceTotal: 230,
        currentStockQtyBySize: [95, 110, 120, 130, 125, 140, 160, 155, 150, 145],
        totalOrderBalanceBySize: [28, 36, 42, 48, 52, 58, 66, 64, 63, 63],
        expectedInboundOrderBalanceBySize: [10, 14, 18, 21, 23, 26, 31, 29, 29, 29],
      },
      safetyStockCalc: {
        safetyStock,
        recommendedOrderQty: safetyRecQty,
        ...toAmounts(safetyRecQty),
      },
      forecastQtyCalc: {
        safetyStock: null,
        recommendedOrderQty: forecastRecQty,
        ...toAmounts(forecastRecQty),
      },
    }
  },
}
