import type {
  CandidateItemSummary,
  CandidateReferenceItemSummary,
  CandidateStashItemSummary,
} from '../../../api'

const APPEND_RESPONSE_MATCHING_INVARIANT =
  '추천 추가 응답 불일치: candidateItem.skuUuid는 선택한 추천 row uuid와 일치해야 합니다'

type RecommendationBySelectedRowUuid = ReadonlyMap<
  CandidateReferenceItemSummary['uuid'],
  CandidateReferenceItemSummary
>

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

function createRecommendationBySelectedRowUuid(
  recommendations: CandidateReferenceItemSummary[],
): RecommendationBySelectedRowUuid {
  return new Map(recommendations.map((row) => [row.uuid, row]))
}

function getMatchingRecommendationForAppendedCandidateItem(
  candidateItem: CandidateStashItemSummary,
  recommendationBySelectedRowUuid: RecommendationBySelectedRowUuid,
): CandidateReferenceItemSummary {
  const recommendation = recommendationBySelectedRowUuid.get(candidateItem.skuUuid)
  if (!recommendation) {
    throw new Error(
      `${APPEND_RESPONSE_MATCHING_INVARIANT}; candidateItem.skuUuid=${candidateItem.skuUuid}에 해당하는 추천 row가 없습니다`,
    )
  }
  return recommendation
}

export function appendRecommendedCandidateItems(
  items: CandidateItemSummary[],
  candidateItems: CandidateStashItemSummary[],
  recommendations: CandidateReferenceItemSummary[],
): CandidateItemSummary[] {
  if (!candidateItems.length) return items
  const existingSkuUuidSet = new Set(items.map((item) => item.skuUuid))
  const recommendationBySelectedRowUuid = createRecommendationBySelectedRowUuid(recommendations)
  const appendedItems: CandidateItemSummary[] = []
  for (const candidateItem of candidateItems) {
    const recommendation = getMatchingRecommendationForAppendedCandidateItem(
      candidateItem,
      recommendationBySelectedRowUuid,
    )
    if (existingSkuUuidSet.has(candidateItem.skuUuid)) continue
    appendedItems.push(toCandidateItemSummary(candidateItem, recommendation))
    existingSkuUuidSet.add(candidateItem.skuUuid)
  }
  return appendedItems.length ? [...appendedItems, ...items] : items
}
