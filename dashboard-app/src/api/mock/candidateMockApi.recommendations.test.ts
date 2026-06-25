import type { CandidateBadge, CandidateItemListResult, CandidateItemSummary, CandidateOrderMetric, CandidateRecommendationResult, CandidateReferenceItemSummary, CandidateStashExcelUploadResult, CandidateStashSummary } from '..'
import type { ProductComparisonComparisonSubjectRef } from '../types/drawer'
import { describe, expect, it } from 'vitest'
import { MOCK_ADMIN_USER_UUID } from './authApi'
import { buildCandidateOrderMetric } from './candidateItemSummaryBuilder'
import { buildMockOrderSnapshotForCandidate } from './orderSnapshotForCandidate'
import { mockDashboardApi } from './dashboardApi'
import { skuGroupKeyByLegacyId } from './salesTables'
import { MOCK_COMPANY_UUID, defaultCandidateItemListParams } from './candidateMockApiTestHelpers'
import { getOrderSnapshotConfirmedQtyBySize, getOrderSnapshotConfirmedTotalQty } from '../../snapshot/orderSnapshotTypes'

describe('api/mock candidate recommendation contract', () : void => {
  const kreamComparison: ProductComparisonComparisonSubjectRef = {
    role: 'comparison',
    kind: 'competitor-channel',
    sourceId: 'kream',
  }
  const musinsaComparison: ProductComparisonComparisonSubjectRef = {
    role: 'comparison',
    kind: 'competitor-channel',
    sourceId: 'musinsa',
  }

  it('returns base candidate item rows with period sales totals but without eager badges', async () : Promise<void> => {
    const result: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(
      defaultCandidateItemListParams('candidatestash00000000000000000001'),
      MOCK_ADMIN_USER_UUID,
    )

    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items.every((item: CandidateItemSummary) : boolean => item.insightStatus === 'loading')).toBe(true)
    expect(result.items.every((item: CandidateItemSummary) : boolean => item.insight.badges.length === 0)).toBe(true)
    expect(result.items.some((item: CandidateItemSummary) : boolean => typeof item.insight.selfQty === 'number')).toBe(true)
    expect(result.items.some((item: CandidateItemSummary) : boolean => typeof item.insight.competitorQty === 'number')).toBe(true)
  })

  it('returns candidate item badges as DB-shaped name/color/tooltip arrays', async () : Promise<void> => {
    const stashes: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes({ companyUuid: MOCK_COMPANY_UUID })
    const target: CandidateStashSummary | undefined = stashes.find((row: CandidateStashSummary) : boolean => row.itemCount > 0)
    expect(target).toBeDefined()

    const result: CandidateRecommendationResult = await mockDashboardApi.getCandidateRecommendations(defaultCandidateItemListParams(target!.uuid))
    const itemBadges: CandidateBadge[] = result.recommendations.flatMap((item: CandidateReferenceItemSummary) : CandidateBadge[] => item.insight.badges)
    const itemBadgeNames: string[] = itemBadges.map((badge: CandidateBadge) : string => badge.name)

    expect(itemBadges.every((badge: CandidateBadge) : boolean => Boolean(badge.name && badge.color && badge.tooltip))).toBe(true)
    expect(itemBadgeNames).not.toContain('자사 매출')
    expect(itemBadgeNames).not.toContain('경쟁사 매출')
    expect(itemBadgeNames).not.toContain('자사 이익')
  })

  it('returns candidate recommendations for a requested data reference period', async () : Promise<void> => {
    const result: CandidateRecommendationResult = await mockDashboardApi.getCandidateRecommendations(
      {
        stashUuid: 'candidatestash00000000000000000001',
        dataReferencePeriodStart: '2025-01-01',
        dataReferencePeriodEnd: '2025-12-31',
        companyUuid: MOCK_COMPANY_UUID,
      },
      MOCK_ADMIN_USER_UUID,
    )

    expect(result.recommendations.length).toBeGreaterThan(0)
    expect(
      result.recommendations.every((item: CandidateReferenceItemSummary) : boolean => item.insight.rankTone === 'top' || item.insight.badges.length > 0),
    ).toBe(true)
    expect(result.recommendations.some((item: CandidateReferenceItemSummary) : boolean => item.insight.badges.length > 0)).toBe(true)
  })

  it('does not synthesize period sales totals when one side has no source data', async () : Promise<void> => {
    const result: CandidateRecommendationResult = await mockDashboardApi.getCandidateRecommendations(
      {
        stashUuid: 'candidatestash00000000000000000001',
        dataReferencePeriodStart: '2025-01-01',
        dataReferencePeriodEnd: '2025-12-31',
        limit: 100,
        companyUuid: MOCK_COMPANY_UUID,
      },
      MOCK_ADMIN_USER_UUID,
    )
    const competitorOnly: CandidateReferenceItemSummary | undefined = result.recommendations.find((item: CandidateReferenceItemSummary) : boolean => item.code === 'A')

    expect(competitorOnly).toBeDefined()
    expect(competitorOnly?.insight.competitorQty).toBeGreaterThan(0)
    expect(competitorOnly?.insight.selfQty).toBeNull()
  })

  it('keeps missing self period totals visible even when mock catalog generates order metrics', () : void => {
    const skuGroupKey: string = skuGroupKeyByLegacyId.A!
    const metric: CandidateOrderMetric = buildCandidateOrderMetric(
      {
        uuid: 'candidateitem-test-competitor-only',
        stashUuid: 'candidatestash00000000000000000001',
        skuUuid: skuGroupKey,
        skuGroupKey,
        confirmedOrderSnapshot: null,
        isLatestLlmComment: false,
        dbCreatedAt: '2026-04-20T09:00:00.000Z',
        dbUpdatedAt: '2026-04-20T09:00:00.000Z',
      },
      {
        start: '2025-01-01',
        end: '2025-12-31',
      },
      MOCK_COMPANY_UUID,
      kreamComparison,
    )

    expect(metric.source).toBe('secondary-calc')
    expect(metric.qty).toBeGreaterThanOrEqual(0)
    expect(metric.expectedOrderAmount).toBeGreaterThanOrEqual(0)
    expect(metric.orderExport.avgPrice).toBeGreaterThan(0)
    expect(metric.orderExport.avgCost).toBeGreaterThan(0)
    expect(metric.orderExport.feeRatePct).toBeGreaterThan(0)
    expect(metric.orderExport.selfQty).toBeNull()
    expect(metric.orderExport.competitorQty).toBeGreaterThan(0)
    expect(metric.orderExport.inboundRounds).toEqual([])
  })

  it('projects snapshot order metrics before applying live comparison changes', () : void => {
    const skuGroupKey: string = skuGroupKeyByLegacyId.TEST_TOP!
    const snapshot: ReturnType<typeof buildMockOrderSnapshotForCandidate> = buildMockOrderSnapshotForCandidate(skuGroupKey, {
      companyUuid: MOCK_COMPANY_UUID,
      periodStart: '2025-01-01',
      periodEnd: '2025-12-31',
    })
    const metric: CandidateOrderMetric = buildCandidateOrderMetric(
      {
        uuid: 'candidateitem-test-snapshot-first',
        stashUuid: 'candidatestash00000000000000000001',
        skuUuid: skuGroupKey,
        skuGroupKey,
        confirmedOrderSnapshot: snapshot,
        isLatestLlmComment: false,
        dbCreatedAt: '2026-04-20T09:00:00.000Z',
        dbUpdatedAt: '2026-04-20T09:00:00.000Z',
      },
      {
        start: '2025-01-01',
        end: '2025-12-31',
      },
      MOCK_COMPANY_UUID,
      musinsaComparison,
    )

    const snapshotQty: number = getOrderSnapshotConfirmedTotalQty(snapshot.drawer2.confirmed)
    const snapshotExpectedSalesAmount: number = snapshotQty * snapshot.drawer2.unitEconomics!.unitPrice
    const snapshotFeeAmount: number = Math.round((snapshot.drawer2.unitEconomics!.unitPrice * snapshot.drawer2.unitEconomics!.expectedFeeRatePct) / 100)
    const snapshotExpectedOpProfit: number = snapshotQty * Math.round(snapshot.drawer2.unitEconomics!.unitPrice - snapshot.drawer2.unitEconomics!.unitCost - snapshotFeeAmount)
    const confirmedQtyBySize: Record<string, number> = getOrderSnapshotConfirmedQtyBySize(snapshot.drawer2.confirmed)

    expect(metric.source).toBe('snapshot')
    expect(metric.qty).toBe(snapshotQty)
    expect(metric.expectedSalesAmount).toBe(snapshotExpectedSalesAmount)
    expect(metric.expectedOpProfit).toBe(snapshotExpectedOpProfit)
    expect(metric.expectedOrderAmount).toBe(snapshotQty * snapshot.drawer2.unitEconomics!.unitCost)
    expect(metric.orderExport.comparisonSubjectLabel).toBe(snapshot.drawer2.comparisonSubject.label)
    expect(metric.orderExport.inboundRounds).toEqual(snapshot.drawer2.confirmed.rounds.map((round, index: number) : {
      round: number
      inboundDate: string
      sizeOrderQty: { size: string; orderQty: number }[]
    } => ({
      round: index + 1,
      inboundDate: round.date,
      sizeOrderQty: snapshot.drawer2.sizeOrders.map((row: { size: string }) : { size: string; orderQty: number } => ({
        size: row.size,
        orderQty: round.qtyBySize[row.size] ?? 0,
      })),
    })))
    expect(metric.orderExport.inboundExpectedDate).toBe(metric.orderExport.inboundRounds[0]?.inboundDate)
    expect(metric.orderExport.sizeOrderQty).toEqual(snapshot.drawer2.sizeOrders.map((row: { size: string }) : { size: string; orderQty: number } => ({
      size: row.size,
      orderQty: confirmedQtyBySize[row.size] ?? 0,
    })))
  })

  it('uses the request comparison target for non-snapshot order metric size split', () : void => {
    let differingMetrics: { kreamMetric: CandidateOrderMetric; musinsaMetric: CandidateOrderMetric } | null = null
    for (const skuGroupKey of Object.values(skuGroupKeyByLegacyId)) {
      const row = {
        uuid: `candidateitem-test-live-comparison-${skuGroupKey}`,
        stashUuid: 'candidatestash00000000000000000001',
        skuUuid: skuGroupKey,
        skuGroupKey,
        confirmedOrderSnapshot: null,
        isLatestLlmComment: false,
        dbCreatedAt: '2026-04-20T09:00:00.000Z',
        dbUpdatedAt: '2026-04-20T09:00:00.000Z',
      } as const
      const kreamMetric: CandidateOrderMetric = buildCandidateOrderMetric(row, {
        start: '2025-01-01',
        end: '2025-12-31',
      }, MOCK_COMPANY_UUID, kreamComparison)
      const musinsaMetric: CandidateOrderMetric = buildCandidateOrderMetric(row, {
        start: '2025-01-01',
        end: '2025-12-31',
      }, MOCK_COMPANY_UUID, musinsaComparison)
      if (JSON.stringify(kreamMetric.orderExport.sizeOrderQty) !== JSON.stringify(musinsaMetric.orderExport.sizeOrderQty)) {
        differingMetrics = { kreamMetric, musinsaMetric }
        break
      }
    }

    expect(differingMetrics).not.toBeNull()
    const { kreamMetric, musinsaMetric }: { kreamMetric: CandidateOrderMetric; musinsaMetric: CandidateOrderMetric } = differingMetrics!

    expect(kreamMetric.source).toBe('secondary-calc')
    expect(musinsaMetric.source).toBe('secondary-calc')
    expect(kreamMetric.orderExport.comparisonSubjectLabel).not.toBe(musinsaMetric.orderExport.comparisonSubjectLabel)
    expect(kreamMetric.orderExport.sizeOrderQty).not.toEqual(musinsaMetric.orderExport.sizeOrderQty)
    expect(kreamMetric.orderExport.sizeOrderQty.reduce((sum: number, row: { orderQty: number }) : number => sum + row.orderQty, 0)).toBe(kreamMetric.qty)
    expect(musinsaMetric.orderExport.sizeOrderQty.reduce((sum: number, row: { orderQty: number }) : number => sum + row.orderQty, 0)).toBe(musinsaMetric.qty)
  })

  it('paginates candidate recommendations without changing badge-bearing row shape', async () : Promise<void> => {
    const first: CandidateRecommendationResult = await mockDashboardApi.getCandidateRecommendations(
      {
        ...defaultCandidateItemListParams('candidatestash00000000000000000001'),
        limit: 1,
      },
      MOCK_ADMIN_USER_UUID,
    )
    expect(first.recommendations).toHaveLength(1)
    expect(first.recommendations[0]?.insight.badges.length).toBeGreaterThan(0)
    expect(first.nextCursor).not.toBeNull()

    const second: CandidateRecommendationResult = await mockDashboardApi.getCandidateRecommendations(
      {
        ...defaultCandidateItemListParams('candidatestash00000000000000000001'),
        limit: 1,
        cursor: first.nextCursor ?? undefined,
      },
      MOCK_ADMIN_USER_UUID,
    )
    expect(second.recommendations).toHaveLength(1)
    expect(second.recommendations[0]?.skuGroupKey).not.toBe(first.recommendations[0]?.skuGroupKey)
  })

  it('seeds named verification products in the default candidate stash', async () : Promise<void> => {
    const result: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(
      defaultCandidateItemListParams('candidatestash00000000000000000001'),
      MOCK_ADMIN_USER_UUID,
    )
    const names: string[] = result.items.map((item: CandidateItemSummary) : string => item.productName)
    expect(names).toContain('테스트 상의')
    expect(names).toContain('예상입고/기존재고 분할설정 적용 테스트')
    expect(names).toContain('오더상세 20사이즈 스크롤 테스트')
    expect(names.some((name: string) : boolean => ![
      '테스트 상의',
      '예상입고/기존재고 분할설정 적용 테스트',
      '오더상세 20사이즈 스크롤 테스트',
    ].includes(name))).toBe(true)
  })

  it('creates a mock candidate stash from a valid Excel upload with explicit mock warnings', async () : Promise<void> => {
    const uploaded: CandidateStashExcelUploadResult = await mockDashboardApi.uploadCandidateStashExcel(new File(['mock'], 'candidate-upload.xlsx'), {
      companyUuid: MOCK_COMPANY_UUID,
    })

    expect(uploaded.stashName).toBe('candidate-upload')
    expect(uploaded.itemCount).toBeGreaterThan(0)
    expect(uploaded.warnings.some((warning: string) : boolean => warning.includes('실제 엑셀 내용을 파싱하지 않고'))).toBe(true)

    const stashes: CandidateStashSummary[] = await mockDashboardApi.getCandidateStashes(
      { companyUuid: MOCK_COMPANY_UUID },
      MOCK_ADMIN_USER_UUID,
    )
    const created: CandidateStashSummary | undefined = stashes.find((row: CandidateStashSummary) : boolean => row.uuid === uploaded.stashUuid)
    expect(created).toBeDefined()
    expect(created?.itemCount).toBe(uploaded.itemCount)

    const items: CandidateItemListResult = await mockDashboardApi.getCandidateItemsByStash(
      defaultCandidateItemListParams(uploaded.stashUuid),
      MOCK_ADMIN_USER_UUID,
    )
    expect(items.candidateItems).toHaveLength(uploaded.itemCount)
    expect(items.items.every((item: CandidateItemSummary) : boolean => item.hasConfirmedOrderSnapshot === false)).toBe(true)

    await mockDashboardApi.deleteCandidateStash(uploaded.stashUuid, { companyUuid: MOCK_COMPANY_UUID })
  })
})
