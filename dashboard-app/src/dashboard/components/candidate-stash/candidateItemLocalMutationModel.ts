import type {
  CandidateItemSummary,
  CandidateReferenceItemSummary,
  CandidateStashItemSummary,
} from '../../../api'

const APPEND_RESPONSE_MATCHING_INVARIANT =
  '추천 추가 응답 불일치: candidateItem.skuUuid는 선택한 추천 row uuid와 일치해야 합니다' as const

export type RecommendationBySelectedRowUuid = ReadonlyMap<
  CandidateReferenceItemSummary['uuid'],
  CandidateReferenceItemSummary
>

export function removeCandidateItemsByUuid(
  items: CandidateItemSummary[],
  itemUuids: string[],
): CandidateItemSummary[] {
  if (!items.length || !itemUuids.length) return items
  const deleteUuidSet: Set<string> = new Set(itemUuids)
  const nextItems: CandidateItemSummary[] = items.filter((item: CandidateItemSummary) : boolean => !deleteUuidSet.has(item.uuid))
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
    thumbnailUrl: recommendation.thumbnailUrl,
    orderMetricStatus: 'loading',
    qty: 0,
    expectedOrderAmount: 0,
    expectedSalesAmount: 0,
    expectedOpProfit: 0,
    insightStatus: 'loaded',
    insight: recommendation.insight,
    isLatestLlmComment: item.isLatestLlmComment,
    hasConfirmedOrderSnapshot: item.hasConfirmedOrderSnapshot,
    orderExport: null,
    dbCreatedAt: item.dbCreatedAt,
    dbUpdatedAt: item.dbUpdatedAt,
  }
}

function createRecommendationBySelectedRowUuid(
  recommendations: CandidateReferenceItemSummary[],
): RecommendationBySelectedRowUuid {
  return new Map(recommendations.map((row: CandidateReferenceItemSummary) : [string, CandidateReferenceItemSummary] => [row.uuid, row]))
}

function getMatchingRecommendationForAppendedCandidateItem(
  candidateItem: CandidateStashItemSummary,
  recommendationBySelectedRowUuid: RecommendationBySelectedRowUuid,
): CandidateReferenceItemSummary {
  const recommendation: CandidateReferenceItemSummary | undefined = recommendationBySelectedRowUuid.get(candidateItem.skuUuid)
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
  const existingSkuUuidSet: Set<string> = new Set(items.map((item: CandidateItemSummary) : string => item.skuUuid))
  const recommendationBySelectedRowUuid: RecommendationBySelectedRowUuid = createRecommendationBySelectedRowUuid(recommendations)
  const appendedItems: CandidateItemSummary[] = []
  for (const candidateItem of candidateItems) {
    const recommendation: CandidateReferenceItemSummary = getMatchingRecommendationForAppendedCandidateItem(
      candidateItem,
      recommendationBySelectedRowUuid,
    )
    if (existingSkuUuidSet.has(candidateItem.skuUuid)) continue
    appendedItems.push(toCandidateItemSummary(candidateItem, recommendation))
    existingSkuUuidSet.add(candidateItem.skuUuid)
  }
  return appendedItems.length ? [...appendedItems, ...items] : items
}
