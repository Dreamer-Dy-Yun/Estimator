import type { ProductPrimarySummary } from '../../types'
import type {
  AppendCandidateItemPayload,
  CandidateItemDetail,
  CandidateItemSummary,
  CandidateStashSummary,
  CreateCandidateStashPayload,
  UpdateCandidateItemPayload,
  UpdateCandidateStashPayload,
  CompetitorSalesParams,
  ProductDrawerBundleParams,
  ProductSecondaryDetailParams,
  SecondaryDailyTrendParams,
  SecondaryLlmAnswerParams,
  SecondaryOrderSnapshotPayload,
  SecondaryStockOrderCalcParams,
  SecondaryStockOrderCalcResult,
} from '../types'
import {
  CANDIDATE_ITEM_STORAGE_KEY,
  CANDIDATE_STASH_STORAGE_KEY,
  SNAPSHOT_STORAGE_KEY,
} from './constants'
import type { CandidateItemRecord, CandidateStashRecord } from './records'
import { logApiCalled, makeUuid32, sleep } from './utils'
import { ensureCandidateSeed } from './candidateSeeds'
import {
  allKnownProductIds,
  brands,
  categories,
  competitorSalesRows,
  secondaryCompetitorChannels,
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

export const mockDashboardApi = {
  getSelfSales: async (params?: { startDate?: string; endDate?: string; brand?: string; category?: string }) => {
    await sleep(80)
    const brand = params?.brand
    const category = params?.category
    const weighted = estimatePeriodWeight(params?.startDate, params?.endDate)

    return selfSalesRows
      .filter((row) => (brand ? row.brand === brand : true))
      .filter((row) => (category ? row.category === category : true))
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
    const weighted = estimatePeriodWeight(params?.startDate, params?.endDate)
    const channel = params?.competitorChannelId
      ? secondaryCompetitorChannels.find((c) => c.id === params.competitorChannelId)
      : undefined
    const priceSkew = channel?.priceSkew ?? 1
    const qtySkew = channel?.qtySkew ?? 1

    return competitorSalesRows
      .filter((row) => (brand ? row.brand === brand : true))
      .filter((row) => (category ? row.category === category : true))
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
    return {
      brands,
      categories,
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
  getProductSecondaryDetail: async (id: string, params?: ProductSecondaryDetailParams) => {
    void params
    await sleep(80)
    return productSecondaryById[id] ?? productSecondaryById[allKnownProductIds[0]]!
  },
  getSecondaryDailyTrend: async ({ productId, startMonth, leadTimeDays }: SecondaryDailyTrendParams) => {
    await sleep(80)
    const primary = productPrimaryById[productId] ?? productPrimaryById[allKnownProductIds[0]]!
    const stockTrend = stockTrendById[productId] ?? stockTrendById[allKnownProductIds[0]]!
    return buildSecondaryDailyTrend(primary.monthlySalesTrend, stockTrend, startMonth, leadTimeDays)
  },
  getSecondaryCompetitorChannels: async () => {
    await sleep(40)
    return secondaryCompetitorChannels
  },
  getSecondaryLlmAnswer: async (params: SecondaryLlmAnswerParams) => {
    void params
    await sleep(180)
    return [
      '현재 설정 기준으로는 리드타임 동안 수요 변동을 감안한 안전재고 수준이 양호한 편입니다.',
      '다만 시즌 전환 구간이 겹치면 완충재고를 한 단계 낮추고, 입고 주기를 짧게 가져가는 편이 유리해 보입니다.',
      '경쟁 채널 가격이 자사 대비 높게 잡혀 있으니, 프로모션 없이도 단기 수요는 유지될 가능성이 큽니다.',
    ].join('\n')
  },
  saveSecondaryOrderSnapshot: async (snapshot: SecondaryOrderSnapshotPayload) => {
    await sleep(40)
    try {
      const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY)
      const all = (raw ? JSON.parse(raw) : {}) as Record<string, SecondaryOrderSnapshotPayload[]>
      const list = all[snapshot.productId] ?? []
      list.push(snapshot)
      all[snapshot.productId] = list
      localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(all))
    } catch {
      /* ignore quota */
    }
  },
  getSecondaryOrderSnapshots: async (productId?: string) => {
    await sleep(40)
    try {
      const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY)
      const all = (raw ? JSON.parse(raw) : {}) as Record<string, SecondaryOrderSnapshotPayload[]>
      const list = productId
        ? (all[productId] ?? [])
        : Object.values(all).flat()
      return [...list].sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))
    } catch {
      return []
    }
  },
  deleteSecondaryOrderSnapshot: async (productId: string, savedAt: string) => {
    await sleep(40)
    try {
      const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY)
      const all = (raw ? JSON.parse(raw) : {}) as Record<string, SecondaryOrderSnapshotPayload[]>
      const list = all[productId] ?? []
      all[productId] = list.filter((snap) => String(snap.savedAt) !== String(savedAt))
      localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(all))
    } catch {
      /* ignore quota */
    }
  },
  getCandidateStashes: async (productId?: string): Promise<CandidateStashSummary[]> => {
    await sleep(60)
    try {
      ensureCandidateSeed()
      const rawStashes = localStorage.getItem(CANDIDATE_STASH_STORAGE_KEY)
      const rawItems = localStorage.getItem(CANDIDATE_ITEM_STORAGE_KEY)
      const stashes = (rawStashes ? JSON.parse(rawStashes) : []) as CandidateStashRecord[]
      const items = (rawItems ? JSON.parse(rawItems) : []) as CandidateItemRecord[]
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
          return {
            uuid: row.uuid,
            name: row.name,
            note: row.note ?? null,
            productId: row.productId,
            itemCount: linkedItems.length,
            dbCreatedAt: row.dbCreatedAt,
            dbUpdatedAt,
          }
        })
        .sort((a, b) => String(b.dbCreatedAt).localeCompare(String(a.dbCreatedAt)))
    } catch {
      return []
    }
  },
  getCandidateItemsByStash: async (stashUuid: string): Promise<CandidateItemSummary[]> => {
    await sleep(60)
    ensureCandidateSeed()
    const rawItems = localStorage.getItem(CANDIDATE_ITEM_STORAGE_KEY)
    const items = (rawItems ? JSON.parse(rawItems) : []) as CandidateItemRecord[]
    return items
      .filter((row) => row.stashUuid === stashUuid)
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
          dbCreatedAt: row.dbCreatedAt,
          dbUpdatedAt: row.dbUpdatedAt ?? row.dbCreatedAt,
        }
      })
      .sort((a, b) => String(b.dbCreatedAt).localeCompare(String(a.dbCreatedAt)))
  },
  getCandidateItemByUuid: async (itemUuid: string): Promise<CandidateItemDetail | null> => {
    await sleep(50)
    ensureCandidateSeed()
    const rawItems = localStorage.getItem(CANDIDATE_ITEM_STORAGE_KEY)
    const items = (rawItems ? JSON.parse(rawItems) : []) as CandidateItemRecord[]
    const row = items.find((it) => it.uuid === itemUuid)
    if (!row) return null
    if (!row.details) {
      throw new Error(`후보 상세 스냅샷 누락: ${itemUuid}`)
    }
    return {
      uuid: row.uuid,
      stashUuid: row.stashUuid,
      productId: row.skuUuid,
      details: row.details,
      dbCreatedAt: row.dbCreatedAt,
      dbUpdatedAt: row.dbUpdatedAt ?? row.dbCreatedAt,
    }
  },
  deleteCandidateItem: async (itemUuid: string): Promise<void> => {
    await sleep(60)
    logApiCalled('이너 후보 삭제 API가 호출되었습니다.')
    try {
      ensureCandidateSeed()
      const rawItems = localStorage.getItem(CANDIDATE_ITEM_STORAGE_KEY)
      const rawStashes = localStorage.getItem(CANDIDATE_STASH_STORAGE_KEY)
      const items = (rawItems ? JSON.parse(rawItems) : []) as CandidateItemRecord[]
      const target = items.find((it) => it.uuid === itemUuid)
      if (!target) return
      const nextItems = items.filter((it) => it.uuid !== itemUuid)
      localStorage.setItem(CANDIDATE_ITEM_STORAGE_KEY, JSON.stringify(nextItems))
      const now = new Date().toISOString()
      const stashes = (rawStashes ? JSON.parse(rawStashes) : []) as CandidateStashRecord[]
      const nextStashes = stashes.map((s) =>
        s.uuid === target.stashUuid ? { ...s, dbUpdatedAt: now } : s,
      )
      localStorage.setItem(CANDIDATE_STASH_STORAGE_KEY, JSON.stringify(nextStashes))
    } catch {
      /* ignore */
    }
  },
  /**
   * 후보군 삭제 — 백엔드 연동 전 스텁. 네트워크 지연만 흉내 내며 저장/목록 변경 없음.
   * 실제 구현 시 HTTP 호출 + DB 삭제 반영으로 교체.
   */
  deleteCandidateStash: async (stashUuid: string): Promise<void> => {
    void stashUuid
    await sleep(60)
    logApiCalled('후보군 삭제 API가 호출되었습니다.')
  },
  createCandidateStash: async (payload: CreateCandidateStashPayload): Promise<CandidateStashSummary> => {
    await sleep(90)
    const now = new Date().toISOString()
    const stash: CandidateStashRecord = {
      uuid: makeUuid32(),
      name: payload.name.trim() || `오더 후보군 ${now.slice(0, 10)}`,
      note: payload.note?.trim() || null,
      productId: payload.productId,
      dbCreatedAt: now,
      dbUpdatedAt: now,
    }
    try {
      ensureCandidateSeed()
      const rawStashes = localStorage.getItem(CANDIDATE_STASH_STORAGE_KEY)
      const stashes = (rawStashes ? JSON.parse(rawStashes) : []) as CandidateStashRecord[]
      stashes.push(stash)
      localStorage.setItem(CANDIDATE_STASH_STORAGE_KEY, JSON.stringify(stashes))
    } catch {
      /* ignore quota */
    }
    return {
      uuid: stash.uuid,
      name: stash.name,
      note: stash.note,
      productId: stash.productId,
      itemCount: 0,
      dbCreatedAt: stash.dbCreatedAt,
      dbUpdatedAt: stash.dbUpdatedAt,
    }
  },
  /**
   * 후보군 이름/비고 수정 — 백엔드 연동 전 스텁. 저장/목록 변경 없음.
   * 실제 구현 시 HTTP 호출 + DB 갱신 후 최신 후보군 요약을 반환.
   */
  updateCandidateStash: async (payload: UpdateCandidateStashPayload): Promise<CandidateStashSummary> => {
    await sleep(70)
    logApiCalled('후보군 이름·비고 수정 API가 호출되었습니다.')
    ensureCandidateSeed()
    const rawStashes = localStorage.getItem(CANDIDATE_STASH_STORAGE_KEY)
    const rawItems = localStorage.getItem(CANDIDATE_ITEM_STORAGE_KEY)
    const stashes = (rawStashes ? JSON.parse(rawStashes) : []) as CandidateStashRecord[]
    const items = (rawItems ? JSON.parse(rawItems) : []) as CandidateItemRecord[]
    const target = stashes.find((s) => s.uuid === payload.stashUuid)
    if (!target) {
      throw new Error('후보군을 찾을 수 없습니다.')
    }
    const linkedItems = items.filter((it) => it.stashUuid === target.uuid)
    return {
      uuid: target.uuid,
      name: target.name,
      note: target.note ?? null,
      productId: target.productId,
      itemCount: linkedItems.length,
      dbCreatedAt: target.dbCreatedAt,
      dbUpdatedAt: target.dbUpdatedAt,
    }
  },
  /**
   * 후보군 복제 — 백엔드 연동 전 스텁. 네트워크 지연만 흉내 내며 저장/목록 변경 없음.
   * 실제 구현 시 이 메서드만 HTTP 호출 + DB 반영으로 교체.
   */
  duplicateCandidateStash: async (sourceStashUuid: string): Promise<void> => {
    void sourceStashUuid
    await sleep(90)
    logApiCalled('후보군 복제 API가 호출되었습니다.')
  },
  appendCandidateItem: async (payload: AppendCandidateItemPayload): Promise<void> => {
    await sleep(70)
    const now = new Date().toISOString()
    const item: CandidateItemRecord = {
      uuid: makeUuid32(),
      stashUuid: payload.stashUuid,
      skuUuid: payload.productId,
      details: payload.details,
      dbCreatedAt: now,
      dbUpdatedAt: now,
    }
    try {
      ensureCandidateSeed()
      const rawStashes = localStorage.getItem(CANDIDATE_STASH_STORAGE_KEY)
      const rawItems = localStorage.getItem(CANDIDATE_ITEM_STORAGE_KEY)
      const stashes = (rawStashes ? JSON.parse(rawStashes) : []) as CandidateStashRecord[]
      const items = (rawItems ? JSON.parse(rawItems) : []) as CandidateItemRecord[]
      const dedup = items.filter((row) => !(row.stashUuid === payload.stashUuid && row.skuUuid === payload.productId))
      dedup.push(item)
      localStorage.setItem(CANDIDATE_ITEM_STORAGE_KEY, JSON.stringify(dedup))
      const nextStashes = stashes.map((row) => (
        row.uuid === payload.stashUuid ? { ...row, dbUpdatedAt: now } : row
      ))
      localStorage.setItem(CANDIDATE_STASH_STORAGE_KEY, JSON.stringify(nextStashes))
    } catch {
      /* ignore quota */
    }
  },
  updateCandidateItem: async (payload: UpdateCandidateItemPayload): Promise<void> => {
    await sleep(70)
    logApiCalled('이너 후보 변경 저장 API가 호출되었습니다.')
    const now = new Date().toISOString()
    try {
      ensureCandidateSeed()
      const rawStashes = localStorage.getItem(CANDIDATE_STASH_STORAGE_KEY)
      const rawItems = localStorage.getItem(CANDIDATE_ITEM_STORAGE_KEY)
      const stashes = (rawStashes ? JSON.parse(rawStashes) : []) as CandidateStashRecord[]
      const items = (rawItems ? JSON.parse(rawItems) : []) as CandidateItemRecord[]
      const idx = items.findIndex((row) => row.uuid === payload.itemUuid)
      if (idx === -1) return
      const prev = items[idx]!
      items[idx] = {
        ...prev,
        details: payload.details,
        dbUpdatedAt: now,
      }
      localStorage.setItem(CANDIDATE_ITEM_STORAGE_KEY, JSON.stringify(items))
      const stashUuid = prev.stashUuid
      const nextStashes = stashes.map((row) =>
        row.uuid === stashUuid ? { ...row, dbUpdatedAt: now } : row,
      )
      localStorage.setItem(CANDIDATE_STASH_STORAGE_KEY, JSON.stringify(nextStashes))
    } catch {
      /* ignore quota */
    }
  },
  getSecondaryStockOrderCalc: async ({
    productId,
    periodStart,
    periodEnd,
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
        : forecastDailyMeanFromModel(primary.monthlySalesTrend, periodStart, periodEnd)
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
