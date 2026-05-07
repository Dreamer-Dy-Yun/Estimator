import type { ProductPrimarySummary } from '../../types'
import type {
  AppendCandidateItemPayload,
  CandidateBadgeDefinitionMap,
  CandidateStashAnalysisHandlers,
  CandidateStashAnalysisProgressEvent,
  CandidateItemDetail,
  CandidateItemListResult,
  CandidateStashExcelUploadResult,
  CandidateStashSummary,
  CreateCandidateStashPayload,
  UpdateCandidateItemPayload,
  UpdateCandidateStashPayload,
  CompetitorSalesParams,
  ProductDrawerBundleParams,
  ProductSalesInsight,
  ProductSalesInsightParams,
  ProductSecondaryDetailParams,
  SecondaryDailyTrendParams,
  SecondaryStockOrderCalcParams,
  SecondaryStockOrderCalcResult,
} from '../types'
import { type CandidateItemRecord, type CandidateStashRecord } from './records'
import { makeUuid32, sleep } from './utils'
import { seededCandidateItems, seededCandidateStashes } from './candidateSeeds'
import {
  allKnownProductIds,
  brands,
  categories,
  competitorById,
  competitorSalesRows,
  secondaryCompetitorChannels,
  selfById,
  selfSalesRows,
} from './salesTables'
import {
  estimatePeriodWeight,
  historicalMonths,
  makeSalesTrend,
  productPrimaryById,
  productSecondaryById,
  stockTrendById,
} from './productCatalog'
import {
  buildSecondaryDailyTrend,
  dailyMeanSigma,
  forecastDailyMeanFromModel,
  zFromServiceLevelPct,
} from './secondaryDailyTrend'
import { buildSalesKpiColumn } from '../../utils/salesKpiColumn'

type CandidateAnalysisJob = {
  stashUuid: string
  items: CandidateItemRecord[]
}

const candidateAnalysisJobs = new Map<string, CandidateAnalysisJob>()

function readCandidateStashRecords(): CandidateStashRecord[] {
  return seededCandidateStashes
}

function readCandidateItemRecords(): CandidateItemRecord[] {
  return seededCandidateItems
}

function readCandidateItemsForStash(stashUuid: string): CandidateItemRecord[] {
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
    currentProductName: item?.details?.drawer1?.summary?.name ?? null,
    message,
    error: null,
  }
}

const INNER_ORDER_TOP_PERCENT_THRESHOLD = 10
const INNER_ORDER_BOTTOM_PERCENT_THRESHOLD = 10
const CANDIDATE_BADGE_DEFINITIONS = {
  크림판매: {
    color: '#0f766e',
    tooltip: `조회 기간 내 크림 경쟁사 판매수량 상위 ${INNER_ORDER_TOP_PERCENT_THRESHOLD}% 이내 후보입니다.`,
  },
  자사이익: {
    color: '#be123c',
    tooltip: '조회 기간 내 자사 영업이익률이 9% 이상인 후보입니다.',
  },
  자사판매: {
    color: '#c2410c',
    tooltip: `조회 기간 내 자사 판매수량 상위 ${INNER_ORDER_TOP_PERCENT_THRESHOLD}% 이내 후보입니다.`,
  },
} satisfies CandidateBadgeDefinitionMap

function getCandidateBadgeDefinitions(): CandidateBadgeDefinitionMap {
  return { ...CANDIDATE_BADGE_DEFINITIONS }
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
    productId: row.productId,
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
  productId: string,
  expectedSalesQty: number,
  expectedSalesAmount: number,
  expectedOpProfit: number,
) {
  const competitor = competitorById[productId]
  const self = selfById[productId]
  const channelLabel = secondaryCompetitorChannels[0]?.label ?? '크림'
  const badgeNames: string[] = []

  if (inTopPercent(competitor?.rankPercentile)) {
    badgeNames.push(`${channelLabel}판매`)
  }
  if (typeof self?.opMarginRate === 'number' && self.opMarginRate >= 9) {
    badgeNames.push('자사이익')
  }
  if (inTopPercent(self?.rankPercentile)) {
    badgeNames.push('자사판매')
  }

  const top = badgeNames.length > 0
  const bottom = !top && (inBottomPercent(competitor?.rankPercentile) || inBottomPercent(self?.rankPercentile))

  return {
    competitorChannelLabel: channelLabel,
    competitorQty: competitor?.competitorQty ?? null,
    competitorAmount: competitor?.competitorAmount ?? null,
    selfQty: self?.qty ?? competitor?.selfQty ?? null,
    selfAmount: self?.amount ?? competitor?.selfAmount ?? null,
    expectedSalesQty,
    expectedSalesAmount,
    expectedOpProfit,
    selfOpProfitRatePct: self?.opMarginRate ?? null,
    rankTone: top ? 'top' as const : bottom ? 'bottom' as const : 'neutral' as const,
    topPercentThreshold: INNER_ORDER_TOP_PERCENT_THRESHOLD,
    bottomPercentThreshold: INNER_ORDER_BOTTOM_PERCENT_THRESHOLD,
    badgeNames,
  }
}

export const mockDashboardApi = {
  getSelfSales: async (params?: { startDate?: string; endDate?: string; brand?: string; category?: string; nameQuery?: string }) => {
    await sleep(80)
    const brand = params?.brand
    const category = params?.category
    const nameQ = params?.nameQuery?.trim().toLowerCase()
    const weighted = estimatePeriodWeight(params?.startDate, params?.endDate)

    return selfSalesRows
      .filter((row) => (brand ? row.brand === brand : true))
      .filter((row) => (category ? row.category === category : true))
      .filter((row) => (nameQ ? row.name.toLowerCase().includes(nameQ) : true))
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
    const nameQ = params?.nameQuery?.trim().toLowerCase()
    const weighted = estimatePeriodWeight(params?.startDate, params?.endDate)
    const channel = params?.competitorChannelId
      ? secondaryCompetitorChannels.find((c) => c.id === params.competitorChannelId)
      : undefined
    const priceSkew = channel?.priceSkew ?? 1
    const qtySkew = channel?.qtySkew ?? 1

    return competitorSalesRows
      .filter((row) => (brand ? row.brand === brand : true))
      .filter((row) => (category ? row.category === category : true))
      .filter((row) => (nameQ ? row.name.toLowerCase().includes(nameQ) : true))
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
  getSelfSalesFilterMeta: async () => {
    await sleep(60)
    const nameSet = new Set<string>()
    for (const r of selfSalesRows) nameSet.add(r.name)
    for (const r of competitorSalesRows) nameSet.add(r.name)
    const productNames = [...nameSet].sort((a, b) => a.localeCompare(b, 'ko'))
    return {
      brands,
      categories,
      productNames,
      historicalMonths,
    }
  },
  getProductDrawerBundle: async (id: string, params?: ProductDrawerBundleParams) => {
    await sleep(80)
    const primary = productPrimaryById[id] ?? productPrimaryById[allKnownProductIds[0]]!
    const stockTrend = stockTrendById[id] ?? stockTrendById[allKnownProductIds[0]]!
    const fc = Math.max(1, Math.min(24, Math.round(params?.forecastMonths ?? 8)))
    const seed = id.charCodeAt(0)
    const base = Math.max(800, Math.round(primary.qty * 0.42))
    const summary: ProductPrimarySummary = {
      ...primary,
      monthlySalesTrend: makeSalesTrend(base, seed, fc),
    }
    return { summary, stockTrend }
  },
  getProductSalesInsight: async (
    id: string,
    params: ProductSalesInsightParams,
  ): Promise<ProductSalesInsight> => {
    await sleep(80)
    const primary = productPrimaryById[id] ?? productPrimaryById[allKnownProductIds[0]]!
    const secondary = productSecondaryById[id] ?? productSecondaryById[allKnownProductIds[0]]!
    const channel =
      secondaryCompetitorChannels.find((ch) => ch.id === params.competitorChannelId)
      ?? secondaryCompetitorChannels[0]!
    return {
      productId: primary.id,
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
  getProductSecondaryDetail: async (id: string, params?: ProductSecondaryDetailParams) => {
    void params
    await sleep(80)
    return productSecondaryById[id] ?? productSecondaryById[allKnownProductIds[0]]!
  },
  getSecondaryDailyTrend: async ({
    productId,
    startMonth,
    leadTimeDays,
    competitorChannelId,
  }: SecondaryDailyTrendParams) => {
    await sleep(80)
    const primary = productPrimaryById[productId] ?? productPrimaryById[allKnownProductIds[0]]!
    const stockTrend = stockTrendById[productId] ?? stockTrendById[allKnownProductIds[0]]!
    const channel =
      secondaryCompetitorChannels.find((ch) => ch.id === competitorChannelId)
      ?? secondaryCompetitorChannels[0]!
    return buildSecondaryDailyTrend(primary.monthlySalesTrend, stockTrend, startMonth, leadTimeDays, channel.qtySkew)
  },
  getSecondaryCompetitorChannels: async () => {
    await sleep(40)
    return secondaryCompetitorChannels
  },
  getCandidateStashes: async (productId?: string): Promise<CandidateStashSummary[]> => {
    await sleep(60)
    const stashes = readCandidateStashRecords()
    const items = readCandidateItemRecords()
    const filtered = productId ? stashes.filter((row) => row.productId === productId) : stashes
    return filtered
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
  getCandidateItemsByStash: async (stashUuid: string): Promise<CandidateItemListResult> => {
    await sleep(60)
    const items = readCandidateItemsForStash(stashUuid)
      .map((row) => {
        const productId = row.skuUuid
        const summary = row.details?.drawer1?.summary
        const drawer2 = row.details?.drawer2
        if (!summary || !drawer2) {
          throw new Error(`후보 스냅샷 누락: ${row.uuid}`)
        }
        const qty = drawer2.sizeRows.reduce((acc, r) => acc + Math.max(0, Math.round(r.confirmQty ?? 0)), 0)
        const expectedOrderAmount = drawer2.stockDerived?.expectedOrderAmount
        const expectedSalesAmount = drawer2.stockDerived?.expectedSalesAmount
        const expectedOpProfit = drawer2.stockDerived?.expectedOpProfit
        if (
          typeof expectedOrderAmount !== 'number'
          || typeof expectedSalesAmount !== 'number'
          || typeof expectedOpProfit !== 'number'
        ) {
          throw new Error(`후보 스냅샷 수치 누락: ${row.uuid}`)
        }
        return {
          uuid: row.uuid,
          stashUuid: row.stashUuid,
          productId,
          brand: summary.brand,
          productCode: summary.productCode,
          productName: summary.name,
          qty,
          expectedOrderAmount,
          expectedSalesAmount,
          expectedOpProfit,
          insight: buildCandidateItemInsight(productId, qty, expectedSalesAmount, expectedOpProfit),
          isLatestLlmComment: row.isLatestLlmComment,
          dbCreatedAt: row.dbCreatedAt,
          dbUpdatedAt: row.dbUpdatedAt ?? row.dbCreatedAt,
        }
      })
      .sort((a, b) => String(b.dbCreatedAt).localeCompare(String(a.dbCreatedAt)))
    return {
      items,
      badgeDefinitions: getCandidateBadgeDefinitions(),
    }
  },
  getCandidateItemByUuid: async (itemUuid: string): Promise<CandidateItemDetail | null> => {
    await sleep(50)
    const row = readCandidateItemRecords().find((it) => it.uuid === itemUuid)
    if (!row) return null
    if (!row.details) {
      throw new Error(`후보 상세 스냅샷 누락: ${itemUuid}`)
    }
    return {
      uuid: row.uuid,
      stashUuid: row.stashUuid,
      productId: row.skuUuid,
      details: row.details,
      isLatestLlmComment: row.isLatestLlmComment,
      dbCreatedAt: row.dbCreatedAt,
      dbUpdatedAt: row.dbUpdatedAt ?? row.dbCreatedAt,
    }
  },
  deleteCandidateItem: async (itemUuid: string): Promise<void> => {
    await sleep(60)
    void itemUuid
  },
  deleteCandidateStash: async (stashUuid: string): Promise<void> => {
    await sleep(60)
    void stashUuid
  },
  createCandidateStash: async (payload: CreateCandidateStashPayload): Promise<CandidateStashSummary> => {
    await sleep(90)
    const now = new Date().toISOString()
    const stash: CandidateStashRecord = {
      uuid: makeUuid32(),
      name: payload.name.trim() || `오더 후보군 ${now.slice(0, 10)}`,
      note: payload.note?.trim() || null,
      productId: payload.productId,
      periodStart: payload.periodStart,
      periodEnd: payload.periodEnd,
      forecastMonths: payload.forecastMonths,
      dbCreatedAt: now,
      dbUpdatedAt: now,
    }
    return toCandidateStashSummary(stash, 0)
  },
  updateCandidateStash: async (payload: UpdateCandidateStashPayload): Promise<CandidateStashSummary> => {
    await sleep(70)
    const stashes = readCandidateStashRecords()
    const items = readCandidateItemRecords()
    const target = stashes.find((s) => s.uuid === payload.stashUuid)
    if (!target) {
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
  duplicateCandidateStash: async (sourceStashUuid: string): Promise<void> => {
    await sleep(90)
    const stashes = readCandidateStashRecords()
    const source = stashes.find((row) => row.uuid === sourceStashUuid)
    if (!source) throw new Error('복제할 후보군을 찾을 수 없습니다.')
  },
  appendCandidateItem: async (payload: AppendCandidateItemPayload): Promise<void> => {
    await sleep(70)
    void payload
  },
  updateCandidateItem: async (payload: UpdateCandidateItemPayload): Promise<void> => {
    await sleep(70)
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
  startCandidateStashAnalysis: async (stashUuid: string) => {
    await sleep(60)
    const items = readCandidateItemsForStash(stashUuid)
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
        '백엔드가 후보군 스냅샷 LLM 분석 작업을 접수했습니다.',
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
        const productName = item.details?.drawer1?.summary?.name ?? item.skuUuid
        queue(260 + (index * 420), () => {
          emit(buildCandidateAnalysisEvent(
            jobId,
            job.stashUuid,
            'running',
            totalItems,
            index,
            `${productName} 스냅샷을 LLM으로 분석하는 중입니다.`,
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
          `후보 스냅샷 ${totalItems}건의 LLM 분석을 완료했습니다.`,
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
    productId,
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
    const primary = productPrimaryById[productId] ?? productPrimaryById[allKnownProductIds[0]]!
    const fromTrend = dailyMeanSigma(primary.monthlySalesTrend, periodStart, periodEnd)
    /** 기간 산술평균: 월 판매 단순 평균의 일환산(일평균 판매량). */
    const trendMuRaw = fromTrend.dailyMean
    const trendDailyMean = Math.round(trendMuRaw * 10) / 10

    /** 예측 수량연산: 가중 일평균(또는 UI에서 넘긴 μ). */
    const forecastMuRaw =
      dailyMeanParam !== undefined && Number.isFinite(dailyMeanParam)
        ? Math.max(0, dailyMeanParam)
        : forecastDailyMeanFromModel(primary.monthlySalesTrend, periodStart, forecastPeriodEnd ?? periodEnd)
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
