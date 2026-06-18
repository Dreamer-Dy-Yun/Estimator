import type { SubscribeArgs } from './useCandidateOrderMetricStream'
import type { AdminGoogleSheetConfigSummary, AdminGptKeySummary, AdminGptKeyTestResult, AdminUserSummary, ApiAdapterMode, ApiErrorResponse, ApiFailureKind, ApiHttpError, AppendCandidateItemsResponse, AuthSession, CandidateDetailBulkConfirmProgressEvent, CandidateDetailBulkConfirmStartPayload, CandidateDetailBulkConfirmStartResult, CandidateDetailBulkConfirmSubscription, CandidateItemDetail, CandidateItemListParams, CandidateItemListResult, CandidateRecommendationParams, CandidateRecommendationResult, CandidateStashExcelTemplateDownload, CandidateStashExcelUploadResult, CandidateStashLlmCommentJobProgressEvent, CandidateStashLlmCommentJobStartResult, CandidateStashLlmCommentJobSubscription, CandidateStashSummary, ChangePasswordPayload, CompanyScopeParams, CompanySummary, CompetitorSalesParams, CreateAdminGoogleSheetConfigPayload, CreateAdminGptKeyPayload, CreateAdminUserPayload, DashboardApi, DashboardEventStreamErrorListener, InventoryArrivalCollectionResult, LoginRequest, LoginResult, ProductDrawerBundle, ResetAdminUserPasswordResult, RotateAdminGptKeyPayload, SalesFilterMeta, SalesFilterMetaParams, SecondaryAiCommentParams, SecondaryAiCommentResult, SecondaryCompetitorChannel, SelfSalesParams, UpdateAdminGoogleSheetConfigPayload, UpdateAdminGptKeyPayload, UpdateAdminUserPayload, UpdateAuthUserPayload, UpdateCandidateItemPayload, UpdateCandidateItemResponse } from '../../../api'
import type { AppendCandidateItemsPayload, CandidateStashLlmCommentJobParams, CompanyMutationScopeParams, CompetitorSalesGridParams, CreateCandidateStashPayload, InventoryArrivalCollectionParams, ProductDrawerBundleParams, ScatterSalesGridResponse, SelfSalesGridParams, UpdateCandidateStashPayload } from '../../../api/types'
import type { CandidateStashListParams } from '../../../api/types/candidate'
import type { CompetitorSalesRow, SelfSalesRow } from '../../../types'
// @vitest-environment jsdom
import { act, useEffect, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi , type Mock} from 'vitest';
import type {
  CandidateItemSummary,
  CandidateOrderMetric,
  CandidateOrderMetricEvent,
  CandidateOrderMetricStreamParams,
  ProductComparisonTarget,
} from '../../../api'
import { useCandidateOrderMetricStream } from './useCandidateOrderMetricStream'

const TEST_COMPANY_UUID = '00000000-0000-4000-8000-000000000101' as const
const TEST_COMPARISON_TARGET: ProductComparisonTarget = {
  id: 'comparison:competitor-channel:kream',
  role: 'comparison',
  kind: 'competitor-channel',
  sourceId: 'kream',
  label: '크림',
}

const apiMock: { subscribeCandidateOrderMetrics: Mock<(...args: unknown[]) => unknown>; subscriptions: { params: CandidateOrderMetricStreamParams; listener: (event: CandidateOrderMetricEvent) => void; close: ReturnType<typeof vi.fn>; }[]; } = vi.hoisted(() : { subscribeCandidateOrderMetrics: Mock<(...args: unknown[]) => unknown>; subscriptions: { params: CandidateOrderMetricStreamParams; listener: (event: CandidateOrderMetricEvent) => void; close: ReturnType<typeof vi.fn>; }[]; } => ({
  subscribeCandidateOrderMetrics: vi.fn(),
  subscriptions: [] as {
    params: CandidateOrderMetricStreamParams
    listener: (event: CandidateOrderMetricEvent) => void
    close: ReturnType<typeof vi.fn>
  }[],
}))

vi.mock('../../../api', async (importOriginal: <T = unknown>() => Promise<T>) : Promise<{ subscribeCandidateOrderMetrics: Mock<(...args: unknown[]) => unknown>; API_ADAPTER_MODE: ApiAdapterMode; ApiHttpError: typeof ApiHttpError; USE_MOCK_API: boolean; classifyApiFailureStatus: (status: number) => ApiFailureKind; getApiErrorDisplayMessage: (error: unknown, fallback?: string) => string; isApiErrorResponse: (body: unknown) => body is ApiErrorResponse; ALL_COMPANY_UUID: '00000000-0000-4000-8000-000000000100'; getCompanyUuidForOptionalScope: (companyUuid: string | null | undefined) => string | undefined; isAllCompanyScope: (companyUuid: string | null | undefined) => boolean; isAllCompanyUuid: (companyUuid: string | null | undefined) => boolean; normalizeCompanyScopeParams: <T extends CompanyScopeParams>(params?: T) => T | undefined; DAILY_TREND_AS_OF_DATE: '2025-12-31'; changeCurrentUserPassword: (payload: ChangePasswordPayload) => Promise<void>; collectInventoryArrivalDates: (params: InventoryArrivalCollectionParams) => Promise<InventoryArrivalCollectionResult>; createAdminGptKey: (payload: CreateAdminGptKeyPayload) => Promise<AdminGptKeySummary>; createAdminGoogleSheetConfig: (payload: CreateAdminGoogleSheetConfigPayload) => Promise<AdminGoogleSheetConfigSummary>; createAdminUser: (payload: CreateAdminUserPayload) => Promise<AdminUserSummary>; createCandidateStash: (payload: CreateCandidateStashPayload) => Promise<CandidateStashSummary>; dashboardApi: DashboardApi; deleteAdminGptKey: (keyUuid: string) => Promise<void>; deleteAdminGoogleSheetConfig: (configUuid: string, params: CompanyMutationScopeParams) => Promise<void>; deleteAdminUser: (userUuid: string) => Promise<void>; getAdminGptKeys: () => Promise<AdminGptKeySummary[]>; getAdminGoogleSheetConfigs: (params?: CompanyScopeParams) => Promise<AdminGoogleSheetConfigSummary[]>; getAdminUsers: () => Promise<AdminUserSummary[]>; getCompanies: () => Promise<CompanySummary[]>; getCurrentAuthSession: () => Promise<AuthSession | null>; getCompetitorSales: (params?: CompetitorSalesParams) => Promise<CompetitorSalesRow[]>; getCompetitorSalesScatterGrid: (params?: CompetitorSalesGridParams) => Promise<ScatterSalesGridResponse>; getProductDrawerBundle: (skuGroupKey: string, params: ProductDrawerBundleParams) => Promise<ProductDrawerBundle>; getSecondaryCompetitorChannels: () => Promise<SecondaryCompetitorChannel[]>; getSecondaryAiComment: (params: SecondaryAiCommentParams) => Promise<SecondaryAiCommentResult>; getCandidateStashes: (params?: CandidateStashListParams) => Promise<CandidateStashSummary[]>; getCandidateItemsByStash: (params: CandidateItemListParams) => Promise<CandidateItemListResult>; getCandidateRecommendations: (params: CandidateRecommendationParams) => Promise<CandidateRecommendationResult>; getCandidateItemByUuid: (itemUuid: string, params?: CompanyScopeParams) => Promise<CandidateItemDetail | null>; getCandidateStashExcelTemplateDownload: () => CandidateStashExcelTemplateDownload; deleteCandidateItem: (itemUuid: string, params: CompanyMutationScopeParams) => Promise<void>; deleteCandidateItems: (stashUuid: string, itemUuids: string[], params: CompanyMutationScopeParams) => Promise<void>; deleteCandidateStash: (stashUuid: string, params: CompanyMutationScopeParams) => Promise<void>; appendCandidateItems: (payload: AppendCandidateItemsPayload) => Promise<AppendCandidateItemsResponse>; updateCandidateItem: (payload: UpdateCandidateItemPayload) => Promise<UpdateCandidateItemResponse>; updateCandidateStash: (payload: UpdateCandidateStashPayload) => Promise<CandidateStashSummary>; duplicateCandidateStash: (stashUuid: string, params: CompanyMutationScopeParams) => Promise<void>; uploadCandidateStashExcel: (file: File, params: CompanyMutationScopeParams) => Promise<CandidateStashExcelUploadResult>; getSelfSales: (params?: SelfSalesParams) => Promise<SelfSalesRow[]>; getSelfSalesScatterGrid: (params?: SelfSalesGridParams) => Promise<ScatterSalesGridResponse>; getSalesFilterMeta: (params?: SalesFilterMetaParams) => Promise<SalesFilterMeta>; login: (payload: LoginRequest) => Promise<LoginResult>; logout: () => Promise<void>; resetAdminUserPassword: (userUuid: string) => Promise<ResetAdminUserPasswordResult>; rotateAdminGptKey: (payload: RotateAdminGptKeyPayload) => Promise<AdminGptKeySummary>; startCandidateStashLlmCommentJob: (stashUuid: string, params: CandidateStashLlmCommentJobParams) => Promise<CandidateStashLlmCommentJobStartResult>; startCandidateDetailBulkConfirm: (payload: CandidateDetailBulkConfirmStartPayload) => Promise<CandidateDetailBulkConfirmStartResult>; subscribeCandidateDetailBulkConfirm: (jobId: string, listener: (event: CandidateDetailBulkConfirmProgressEvent) => void, onError: DashboardEventStreamErrorListener | undefined, params: CompanyMutationScopeParams) => CandidateDetailBulkConfirmSubscription; subscribeCandidateStashLlmCommentJob: (jobId: string, listener: (event: CandidateStashLlmCommentJobProgressEvent) => void, onError: DashboardEventStreamErrorListener | undefined, params: CandidateStashLlmCommentJobParams) => CandidateStashLlmCommentJobSubscription; testAdminGptKey: (keyUuid: string) => Promise<AdminGptKeyTestResult>; updateAdminGptKey: (payload: UpdateAdminGptKeyPayload) => Promise<AdminGptKeySummary>; updateAdminGoogleSheetConfig: (payload: UpdateAdminGoogleSheetConfigPayload) => Promise<AdminGoogleSheetConfigSummary>; updateAdminUser: (payload: UpdateAdminUserPayload) => Promise<AdminUserSummary>; updateCurrentUser: (payload: UpdateAuthUserPayload) => Promise<AuthSession>; }> => {
  const actual: typeof import("../../../api") = await importOriginal<typeof import('../../../api')>()
  return {
    ...actual,
    subscribeCandidateOrderMetrics: apiMock.subscribeCandidateOrderMetrics,
  }
})

const BASE_INSIGHT: { competitorSalesSourceLabel: string; competitorQty: null; competitorAmount: null; selfQty: null; selfAmount: null; expectedSalesQty: number; expectedSalesAmount: number; expectedOpProfit: number; selfOpProfitRatePct: null; rankTone: 'neutral'; topPercentThreshold: number; bottomPercentThreshold: number; badges: never[]; } = {
  competitorSalesSourceLabel: '크림',
  competitorQty: null,
  competitorAmount: null,
  selfQty: null,
  selfAmount: null,
  expectedSalesQty: 0,
  expectedSalesAmount: 0,
  expectedOpProfit: 0,
  selfOpProfitRatePct: null,
  rankTone: 'neutral' as const,
  topPercentThreshold: 10,
  bottomPercentThreshold: 10,
  badges: [],
}

function candidateItem(uuid: string): CandidateItemSummary {
  return {
    uuid,
    stashUuid: 'stash-1',
    skuUuid: `${uuid}-sku`,
    skuGroupKey: `${uuid}-group`,
    brand: '브랜드',
    code: 'CODE',
    productName: '상품',
    colorCode: '010',
    thumbnailUrl: null,
    orderMetricStatus: 'loading',
    qty: 0,
    expectedOrderAmount: 0,
    expectedSalesAmount: 0,
    expectedOpProfit: 0,
    insightStatus: 'loading',
    insight: BASE_INSIGHT,
    isLatestLlmComment: false,
    hasConfirmedOrderSnapshot: false,
    orderExport: null,
    dbCreatedAt: '2026-05-19T00:00:00.000Z',
    dbUpdatedAt: '2026-05-19T00:00:00.000Z',
  }
}

function metric(itemUuid: string): CandidateOrderMetric {
  return {
    itemUuid,
    skuUuid: `${itemUuid}-sku`,
    source: 'secondary-calc',
    qty: 10,
    expectedOrderAmount: 1000,
    expectedSalesAmount: 1500,
    expectedOpProfit: 200,
    orderExport: {
      comparisonSubjectLabel: '크림',
      selfQty: null,
      competitorQty: null,
      expectedSalesQty: 10,
      expectedOrderAmount: 1000,
      avgCost: null,
      avgPrice: null,
      feeRatePct: null,
      opMarginRatePct: null,
      inboundExpectedDate: null,
      sizeOrderQty: [],
    },
  }
}

export type Controls = ReturnType<typeof useCandidateOrderMetricStream>

let root: Root | null = null
let container: HTMLDivElement | null = null
let controls: Controls | null = null

function Probe({ onControls }: { onControls: (nextControls: Controls) => void }) : React.JSX.Element {
  const mountedRef: React.RefObject<boolean> = useRef(true)
  const [, setItems]: [CandidateItemSummary[], React.Dispatch<React.SetStateAction<CandidateItemSummary[]>>] = useState<CandidateItemSummary[]>([
    candidateItem('item-1'),
    candidateItem('item-2'),
  ])
  const nextControls: { beginItemLoad: () => number; closeMetricSubscription: () => void; getCurrentItemLoadSeq: () => number; isCurrentItemLoad: (seq: number) => boolean; subscribeOrderMetrics: (args: SubscribeArgs) => void; } = useCandidateOrderMetricStream({
    stashUuid: 'stash-1',
    companyUuid: TEST_COMPANY_UUID,
    mountedRef,
    setItems,
  })
  useEffect(() : void => {
    onControls(nextControls)
  }, [nextControls, onControls])
  useEffect(() : () => void => () : void => {
    mountedRef.current = false
  }, [])
  return <output />
}

function renderProbe() : void {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() : void => {
    root?.render(<Probe onControls={(nextControls: { beginItemLoad: () => number; closeMetricSubscription: () => void; getCurrentItemLoadSeq: () => number; isCurrentItemLoad: (seq: number) => boolean; subscribeOrderMetrics: (args: SubscribeArgs) => void; }) : void => {
      controls = nextControls
    }} />)
  })
}

afterEach(() : void => {
  act(() : void => {
    root?.unmount()
  })
  root = null
  container?.remove()
  container = null
  controls = null
  apiMock.subscribeCandidateOrderMetrics.mockReset()
  apiMock.subscriptions = []
})

describe('useCandidateOrderMetricStream', () : void => {
  it('does not reopen an identical pending stream and closes after every item settles', () : void => {
    apiMock.subscribeCandidateOrderMetrics.mockImplementation((params: unknown, listener: unknown) : { close: Mock<(...args: unknown[]) => unknown>; } => {
      const close: Mock<(...args: unknown[]) => unknown> = vi.fn()
      apiMock.subscriptions.push({ params: params as CandidateOrderMetricStreamParams, listener: listener as (event: CandidateOrderMetricEvent) => void, close })
      return { close }
    })
    renderProbe()

    let seq: number = 0
    act(() : void => {
      seq = controls?.beginItemLoad() ?? 0
      controls?.subscribeOrderMetrics({
        seq,
        dataReferencePeriodStart: '2026-04-01',
        dataReferencePeriodEnd: '2026-05-31',
        candidateItemUuids: ['item-2', 'item-1', 'item-2'],
        comparison: TEST_COMPARISON_TARGET,
      })
      controls?.subscribeOrderMetrics({
        seq,
        dataReferencePeriodStart: '2026-04-01',
        dataReferencePeriodEnd: '2026-05-31',
        candidateItemUuids: ['item-1', 'item-2'],
        comparison: TEST_COMPARISON_TARGET,
      })
    })

    expect(apiMock.subscribeCandidateOrderMetrics).toHaveBeenCalledTimes(1)
    expect(apiMock.subscriptions[0].params.companyUuid).toBe(TEST_COMPANY_UUID)
    expect(apiMock.subscriptions[0].params.candidateItemUuids).toEqual(['item-1', 'item-2'])
    expect(apiMock.subscriptions[0].params.comparison).toEqual(TEST_COMPARISON_TARGET)

    act(() : void => {
      apiMock.subscriptions[0].listener({
        type: 'item',
        requestId: apiMock.subscriptions[0].params.requestId,
        itemUuid: 'item-1',
        skuUuid: 'item-1-sku',
        metric: metric('item-1'),
      })
    })
    expect(apiMock.subscriptions[0].close).not.toHaveBeenCalled()

    act(() : void => {
      apiMock.subscriptions[0].listener({
        type: 'item',
        requestId: apiMock.subscriptions[0].params.requestId,
        itemUuid: 'item-2',
        skuUuid: 'item-2-sku',
        metric: metric('item-2'),
      })
    })
    expect(apiMock.subscriptions[0].close).toHaveBeenCalledTimes(1)
  })
})
