import type {
  AppendCandidateItemPayload,
  AppendCandidateItemsPayload,
  CandidateBadge,
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
} from '../types'
import { MOCK_ADMIN_USER_UUID } from './authApi'
import { seededCandidateItems, seededCandidateStashes } from './candidateSeeds'
import { type CandidateItemRecord, type CandidateStashRecord } from './records'
import {
  allKnownSkuGroupKeys,
  competitorBySkuGroupKey,
  secondaryCompetitorChannels,
  selfBySkuGroupKey,
} from './salesTables'
import { estimatePeriodWeight, productPrimaryBySkuGroupKey } from './productCatalog'
import { makeUuid32, sleep } from './utils'
import { createCandidateAnalysisMockApi } from './candidateAnalysisMock'

type CandidateDataReferencePeriod = {
  start: string
  end: string
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

function readCandidateStashRecords(): CandidateStashRecord[] {
  return seededCandidateStashes
}

function readCandidateItemRecords(): CandidateItemRecord[] {
  return seededCandidateItems
}

function filterCandidateStashesForOwner(
  rows: CandidateStashRecord[],
  ownerUserUuid?: string,
): CandidateStashRecord[] {
  if (!ownerUserUuid) return rows
  return rows.filter((row) => row.userUuid === ownerUserUuid)
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
  dataReferencePeriod?: CandidateDataReferencePeriod,
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

  if (inTopPercent(competitor?.rankPercentile)) badgeNameList.push(`${channelLabel}판매`)
  if (typeof self?.opMarginRate === 'number' && self.opMarginRate >= 9) badgeNameList.push('자사이익')
  if (inTopPercent(self?.rankPercentile)) badgeNameList.push('자사판매')

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
  dataReferencePeriod?: CandidateDataReferencePeriod,
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

function buildCandidateListParamsPeriod({
  dataReferencePeriodStart,
  dataReferencePeriodEnd,
}: CandidateItemListParams | CandidateRecommendationParams): CandidateDataReferencePeriod {
  return {
    start: dataReferencePeriodStart,
    end: dataReferencePeriodEnd,
  }
}

const candidateAnalysisMockApi = createCandidateAnalysisMockApi({
  findCandidateStashForOwner,
  readCandidateItemsForStash,
  getProductName: (skuGroupKey) => productPrimaryBySkuGroupKey[skuGroupKey]?.productName ?? null,
})

export const candidateMockApi = {
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
    params: CandidateItemListParams,
    ownerUserUuid?: string,
  ): Promise<CandidateItemListResult> => {
    await sleep(60)
    return {
      items: buildCandidateItemSummariesForStash(
        params.stashUuid,
        ownerUserUuid,
        buildCandidateListParamsPeriod(params),
      ),
    }
  },
  getCandidateRecommendations: async (
    params: CandidateRecommendationParams,
    ownerUserUuid?: string,
  ): Promise<CandidateRecommendationResult> => {
    await sleep(70)
    const items = buildCandidateItemSummariesForStash(
      params.stashUuid,
      ownerUserUuid,
      buildCandidateListParamsPeriod(params),
    )
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
    if (invalidItem) throw new Error('후보군에 포함되지 않은 아이템이 있습니다.')
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
    if (unknownProduct) throw new Error(`상품을 찾을 수 없습니다: ${unknownProduct}`)
  },
  updateCandidateItem: async (payload: UpdateCandidateItemPayload, ownerUserUuid?: string): Promise<void> => {
    await sleep(70)
    const item = readCandidateItemRecords().find((row) => row.uuid === payload.itemUuid)
    if (item && !findCandidateStashForOwner(item.stashUuid, ownerUserUuid)) {
      throw new Error('후보 아이템을 찾을 수 없습니다.')
    }
    void payload
  },
  uploadCandidateStashExcel: async (
    file: File,
    ownerUserUuid?: string,
  ): Promise<CandidateStashExcelUploadResult> => {
    await sleep(140)
    void ownerUserUuid

    const fileName = file.name.trim()
    const isExcel = /\.(xlsx|xls)$/i.test(fileName)
    if (!fileName || !isExcel) throw new Error('엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다.')
    if (file.size <= 0) throw new Error('빈 엑셀 파일은 업로드할 수 없습니다.')

    return {
      stashUuid: makeUuid32(),
      stashName: `엑셀 업로드 후보군 ${fileName}`,
      itemCount: 0,
      warnings: [
        '목 API는 파일 검증과 성공 응답만 모사하며 프론트 저장소에 후보군을 만들지 않습니다.',
        '실제 백엔드는 필수 컬럼 검증 후 DB에 후보군과 후보 아이템을 저장해야 합니다.',
      ],
    }
  },
  ...candidateAnalysisMockApi,
}
