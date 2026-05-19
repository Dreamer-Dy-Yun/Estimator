import type {
  CandidateItemSummary,
  CandidateReferenceItemSummary,
  CandidateStashItemSummary,
} from '../../../api'

export function removeCandidateItemsByUuid(
  items: CandidateItemSummary[],
  itemUuids: string[],
): CandidateItemSummary[] {
  if (!items.length || !itemUuids.length) return items
  const deleteUuidSet = new Set(itemUuids)
  const nextItems = items.filter((item) => !deleteUuidSet.has(item.uuid))
  return nextItems.length === items.length ? items : nextItems
}

function toCandidateItemSummary(
  item: CandidateStashItemSummary,
  recommendation: CandidateReferenceItemSummary,
): CandidateItemSummary {
  return {
    uuid: item.uuid,
    stashUuid: item.stashUuid,
    skuUuid: item.skuUuid,
    skuGroupKey: item.skuGroupKey,
    brand: recommendation.brand,
    code: recommendation.code,
    productName: recommendation.productName,
    colorCode: recommendation.colorCode,
    orderMetricStatus: 'loading',
    qty: 0,
    expectedOrderAmount: 0,
    expectedSalesAmount: 0,
    expectedOpProfit: 0,
    insightStatus: 'loaded',
    insight: recommendation.insight,
    isLatestLlmComment: item.isLatestLlmComment,
    isDetailConfirmed: item.hasSnapshot,
    orderExport: null,
    dbCreatedAt: item.dbCreatedAt,
    dbUpdatedAt: item.dbUpdatedAt,
  }
}

export function appendRecommendedCandidateItems(
  items: CandidateItemSummary[],
  candidateItems: CandidateStashItemSummary[],
  recommendations: CandidateReferenceItemSummary[],
): CandidateItemSummary[] {
  if (!candidateItems.length) return items
  const existingSkuUuidSet = new Set(items.map((item) => item.skuUuid))
  const recommendationBySkuUuid = new Map(recommendations.map((row) => [row.uuid, row]))
  const appendedItems: CandidateItemSummary[] = []
  for (const candidateItem of candidateItems) {
    if (existingSkuUuidSet.has(candidateItem.skuUuid)) continue
    const recommendation = recommendationBySkuUuid.get(candidateItem.skuUuid)
    if (!recommendation) {
      throw new Error(`추천 후보 응답과 신규 후보 아이템을 매칭할 수 없습니다: ${candidateItem.skuUuid}`)
    }
    appendedItems.push(toCandidateItemSummary(candidateItem, recommendation))
    existingSkuUuidSet.add(candidateItem.skuUuid)
  }
  return appendedItems.length ? [...appendedItems, ...items] : items
}
