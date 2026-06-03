import type { AppendCandidateItemsResponse, CandidateRecommendationParams, CandidateRecommendationResult } from '../../../api'
import type { AppendCandidateItemsPayload } from '../../../api/types'
import type { AppendRecommendedItemsResult } from './candidateStashDetailTypes'
// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi , type Mock, type MockedFunction} from 'vitest';
import {
  appendCandidateItems,
  getCandidateRecommendations,
  type CandidateItemSummary,
  type CandidateReferenceItemSummary,
  type CandidateStashItemSummary,
} from '../../../api'
import { useCandidateRecommendations } from './useCandidateRecommendations'

vi.mock('../../../api', async () : Promise<{ appendCandidateItems: Mock<(...args: unknown[]) => unknown>; getApiErrorDisplayMessage: Mock<(_err: unknown, fallback: string) => string>; getCandidateRecommendations: Mock<(...args: unknown[]) => unknown>; }> => ({
  appendCandidateItems: vi.fn(),
  getApiErrorDisplayMessage: vi.fn((_err: unknown, fallback: string) : string => fallback),
  getCandidateRecommendations: vi.fn(),
}))

export type HookArgs = Parameters<typeof useCandidateRecommendations>[0]
export type AppendResult = Awaited<ReturnType<typeof appendCandidateItems>>
export type RecommendationResult = Awaited<ReturnType<typeof getCandidateRecommendations>>
export type HookResult = ReturnType<typeof useCandidateRecommendations>

export type HookProbeProps = {
  args: HookArgs
  onRender: (value: HookResult) => void
  renderHookValue: (args: HookArgs) => HookResult
}

let root: Root | null = null
let container: HTMLDivElement | null = null

function HookProbe({ args, onRender, renderHookValue }: HookProbeProps) : null {
  onRender(renderHookValue(args))
  return null
}

function renderHook(
  renderHookValue: (args: HookArgs) => HookResult,
  options?: { initialProps: HookArgs },
) : { rerender: (args: HookArgs) => void; result: { readonly current: { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; }; }; } {
  const state: { current: HookResult | null; } = { current: null as HookResult | null }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)

  const render: (args: HookArgs) => void = (args: HookArgs) : void => {
    act(() : void => {
      root?.render(createElement(HookProbe, {
        args,
        onRender: (value: { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; }) : void => {
          state.current = value
        },
        renderHookValue,
      }))
    })
  }

  render(options?.initialProps ?? createArgs())

  return {
    rerender: render,
    result: {
      get current() : { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; } {
        if (!state.current) throw new Error('hook result is not rendered')
        return state.current
      },
    },
  }
}

function createDeferred<T>() : { promise: Promise<T>; reject: (reason?: unknown) => void; resolve: (value: T) => void; } {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise: Promise<T> = new Promise<T>((promiseResolve: (value: T | PromiseLike<T>) => void, promiseReject: (reason?: unknown) => void) : void => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, reject, resolve }
}

function createArgs(overrides: Partial<HookArgs> = {}): HookArgs {
  return {
    companyUuid: 'company-1',
    dataReferencePeriodEnd: '2026-01-31',
    dataReferencePeriodStart: '2026-01-01',
    itemMembershipKey: 'membership-1',
    itemSkuUuids: [],
    itemsRef: { current: [] as CandidateItemSummary[] },
    mountedRef: { current: true },
    onRecommendedItemsAppended: vi.fn((candidateItems: CandidateStashItemSummary[]) : number => candidateItems.length),
    refreshStashes: vi.fn().mockResolvedValue(undefined),
    setItems: vi.fn(),
    showToast: vi.fn(),
    stashUuid: 'stash-1',
    ...overrides,
  }
}

function createReferenceItem(
  overrides: Partial<CandidateReferenceItemSummary> = {},
): CandidateReferenceItemSummary {
  return {
    brand: '추천브랜드',
    code: 'code-sku-1',
    colorCode: '010',
    insight: {
      badges: [],
      bottomPercentThreshold: 10,
      competitorAmount: 2000,
      competitorChannelLabel: '크림',
      competitorQty: 20,
      expectedOpProfit: 400,
      expectedSalesAmount: 3000,
      expectedSalesQty: 30,
      rankTone: 'top',
      selfAmount: 1000,
      selfOpProfitRatePct: 9,
      selfQty: 10,
      topPercentThreshold: 10,
    },
    productName: '추천 sku-1',
    skuGroupKey: 'sku-group-1',
    uuid: 'sku-1',
    ...overrides,
  }
}

function createCandidateItem(
  overrides: Partial<CandidateStashItemSummary> = {},
): CandidateStashItemSummary {
  return {
    dbCreatedAt: '2026-05-19T01:00:00.000Z',
    dbUpdatedAt: '2026-05-19T01:00:00.000Z',
    hasSnapshot: false,
    isLatestLlmComment: false,
    skuGroupKey: 'sku-group-1',
    skuUuid: 'sku-1',
    stashUuid: 'stash-1',
    uuid: 'item-1',
    ...overrides,
  }
}

function createAppendResult(candidateItems: CandidateStashItemSummary[]): AppendResult {
  return { candidateItems } as AppendResult
}

describe('useCandidateRecommendations', () : void => {
  const mockAppendCandidateItems: MockedFunction<(payload: AppendCandidateItemsPayload) => Promise<AppendCandidateItemsResponse>> = vi.mocked(appendCandidateItems)
  const mockGetCandidateRecommendations: MockedFunction<(params: CandidateRecommendationParams) => Promise<CandidateRecommendationResult>> = vi.mocked(getCandidateRecommendations)

  beforeEach(() : void => {
    vi.clearAllMocks()
  })

  afterEach(() : void => {
    act(() : void => {
      root?.unmount()
    })
    root = null
    container?.remove()
    container = null
    document.body.innerHTML = ''
  })

  it('returns applied and reflects appended recommendation items to the caller', async () : Promise<void> => {
    const args: HookArgs = createArgs()
    const recommendation: CandidateReferenceItemSummary = createReferenceItem()
    const candidateItem: CandidateStashItemSummary = createCandidateItem()
    mockAppendCandidateItems.mockResolvedValue(createAppendResult([candidateItem]))

    const { result }: { rerender: (args: HookArgs) => void; result: { readonly current: { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; }; }; } = renderHook(() : { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; } => useCandidateRecommendations(args))

    let appendResult: unknown
    await act(async () : Promise<void> => {
      appendResult = await result.current.appendRecommendedItems([recommendation])
    })

    expect(appendResult).toEqual({ appendedCount: 1, status: 'applied' })
    expect(mockAppendCandidateItems).toHaveBeenCalledWith({
      companyUuid: 'company-1',
      skuGroupKeys: ['sku-group-1'],
      stashUuid: 'stash-1',
    })
    expect(args.onRecommendedItemsAppended).toHaveBeenCalledWith([candidateItem], [recommendation])
    expect(args.refreshStashes).toHaveBeenCalledTimes(1)
    expect(args.showToast).toHaveBeenCalledWith('추천 후보 1개를 후보군에 추가했습니다.')
    expect(result.current.recommendationAppendBusy).toBe(false)
  })

  it('rejects append responses that do not match selected recommendations', async () : Promise<void> => {
    const args: HookArgs = createArgs()
    const recommendation: CandidateReferenceItemSummary = createReferenceItem()
    const candidateItem: CandidateStashItemSummary = createCandidateItem({ skuUuid: 'other-sku' })
    mockAppendCandidateItems.mockResolvedValue(createAppendResult([candidateItem]))

    const { result }: { rerender: (args: HookArgs) => void; result: { readonly current: { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; }; }; } = renderHook(() : { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; } => useCandidateRecommendations(args))

    await act(async () : Promise<void> => {
      await expect(result.current.appendRecommendedItems([recommendation])).rejects.toThrow(/does not match selected recommendations/)
    })

    expect(args.onRecommendedItemsAppended).not.toHaveBeenCalled()
  })

  it('returns stale for a duplicate append while the first append is busy', async () : Promise<void> => {
    const args: HookArgs = createArgs()
    const recommendation: CandidateReferenceItemSummary = createReferenceItem()
    const candidateItem: CandidateStashItemSummary = createCandidateItem()
    const deferred: { promise: Promise<AppendCandidateItemsResponse>; reject: (reason?: unknown) => void; resolve: (value: AppendCandidateItemsResponse) => void; } = createDeferred<AppendResult>()
    mockAppendCandidateItems.mockReturnValue(deferred.promise)

    const { result }: { rerender: (args: HookArgs) => void; result: { readonly current: { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; }; }; } = renderHook(() : { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; } => useCandidateRecommendations(args))

    let firstAppend!: Promise<unknown>
    await act(async () : Promise<void> => {
      firstAppend = result.current.appendRecommendedItems([recommendation])
    })

    let duplicateResult: unknown
    await act(async () : Promise<void> => {
      duplicateResult = await result.current.appendRecommendedItems([recommendation])
    })

    expect(duplicateResult).toEqual({ status: 'stale' })
    expect(result.current.recommendationAppendBusy).toBe(true)
    expect(mockAppendCandidateItems).toHaveBeenCalledTimes(1)

    let firstResult: unknown
    await act(async () : Promise<void> => {
      deferred.resolve(createAppendResult([candidateItem]))
      firstResult = await firstAppend
    })

    expect(firstResult).toEqual({ appendedCount: 1, status: 'applied' })
    expect(result.current.recommendationAppendBusy).toBe(false)
    expect(args.onRecommendedItemsAppended).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['scope', { companyUuid: 'company-2' }],
    ['missing company', { companyUuid: undefined }],
    ['period start', { dataReferencePeriodStart: '2026-02-01' }],
    ['period end', { dataReferencePeriodEnd: '2026-02-28' }],
    ['membership', { itemMembershipKey: 'membership-2' }],
  ])('returns stale and prevents caller success reflection after %s mismatch', async (_label: string, overrides: { companyUuid: string; } | { companyUuid: undefined; } | { dataReferencePeriodStart: string; } | { dataReferencePeriodEnd: string; } | { itemMembershipKey: string; }) : Promise<void> => {
    const args: HookArgs = createArgs()
    const recommendation: CandidateReferenceItemSummary = createReferenceItem()
    const candidateItem: CandidateStashItemSummary = createCandidateItem()
    const deferred: { promise: Promise<AppendCandidateItemsResponse>; reject: (reason?: unknown) => void; resolve: (value: AppendCandidateItemsResponse) => void; } = createDeferred<AppendResult>()
    mockAppendCandidateItems.mockReturnValue(deferred.promise)

    const { rerender, result }: { rerender: (args: HookArgs) => void; result: { readonly current: { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; }; }; } = renderHook(
      (hookArgs: HookArgs) : { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; } => useCandidateRecommendations(hookArgs),
      { initialProps: args },
    )

    let appendPromise!: Promise<unknown>
    await act(async () : Promise<void> => {
      appendPromise = result.current.appendRecommendedItems([recommendation])
    })

    await act(async () : Promise<void> => {
      rerender({ ...args, ...overrides })
    })

    let appendResult: unknown
    await act(async () : Promise<void> => {
      deferred.resolve(createAppendResult([candidateItem]))
      appendResult = await appendPromise
    })

    expect(appendResult).toEqual({ status: 'stale' })
    expect(args.onRecommendedItemsAppended).not.toHaveBeenCalled()
    expect(args.refreshStashes).not.toHaveBeenCalled()
    expect(args.showToast).not.toHaveBeenCalled()
  })

  it('returns stale without caller success reflection after unmount', async () : Promise<void> => {
    const args: HookArgs = createArgs()
    const recommendation: CandidateReferenceItemSummary = createReferenceItem()
    const candidateItem: CandidateStashItemSummary = createCandidateItem()
    const deferred: { promise: Promise<AppendCandidateItemsResponse>; reject: (reason?: unknown) => void; resolve: (value: AppendCandidateItemsResponse) => void; } = createDeferred<AppendResult>()
    mockAppendCandidateItems.mockReturnValue(deferred.promise)

    const { result }: { rerender: (args: HookArgs) => void; result: { readonly current: { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; }; }; } = renderHook(() : { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; } => useCandidateRecommendations(args))

    let appendPromise!: Promise<unknown>
    await act(async () : Promise<void> => {
      appendPromise = result.current.appendRecommendedItems([recommendation])
    })

    args.mountedRef.current = false

    let appendResult: unknown
    await act(async () : Promise<void> => {
      deferred.resolve(createAppendResult([candidateItem]))
      appendResult = await appendPromise
    })

    expect(appendResult).toEqual({ status: 'stale' })
    expect(args.onRecommendedItemsAppended).not.toHaveBeenCalled()
    expect(args.refreshStashes).not.toHaveBeenCalled()
    expect(args.showToast).not.toHaveBeenCalled()
  })

  it('returns no-op and keeps recommendation state when append API creates no new item', async () : Promise<void> => {
    const args: HookArgs = createArgs()
    const recommendation: CandidateReferenceItemSummary = createReferenceItem()
    mockGetCandidateRecommendations.mockResolvedValue({
      recommendations: [recommendation],
      nextCursor: null,
    } as RecommendationResult)
    mockAppendCandidateItems.mockResolvedValue(createAppendResult([]))

    const { result }: { rerender: (args: HookArgs) => void; result: { readonly current: { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; }; }; } = renderHook(() : { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; } => useCandidateRecommendations(args))

    await act(async () : Promise<void> => {
      await result.current.loadRecommendations()
    })

    let appendResult: unknown
    await act(async () : Promise<void> => {
      appendResult = await result.current.appendRecommendedItems([recommendation])
    })

    expect(appendResult).toEqual({ status: 'no-op' })
    expect(result.current.recommendationItems).toEqual([recommendation])
    expect(mockAppendCandidateItems).toHaveBeenCalledWith({
      companyUuid: 'company-1',
      skuGroupKeys: ['sku-group-1'],
      stashUuid: 'stash-1',
    })
    expect(args.onRecommendedItemsAppended).not.toHaveBeenCalled()
    expect(args.refreshStashes).not.toHaveBeenCalled()
    expect(args.showToast).not.toHaveBeenCalled()
    expect(result.current.recommendationAppendBusy).toBe(false)
  })

  it('returns no-op and keeps recommendation state when local append reflects no new row', async () : Promise<void> => {
    const args: HookArgs = createArgs({
      onRecommendedItemsAppended: vi.fn(() : number => 0),
    })
    const recommendation: CandidateReferenceItemSummary = createReferenceItem()
    const candidateItem: CandidateStashItemSummary = createCandidateItem()
    mockGetCandidateRecommendations.mockResolvedValue({
      recommendations: [recommendation],
      nextCursor: null,
    } as RecommendationResult)
    mockAppendCandidateItems.mockResolvedValue(createAppendResult([candidateItem]))

    const { result }: { rerender: (args: HookArgs) => void; result: { readonly current: { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; }; }; } = renderHook(() : { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; } => useCandidateRecommendations(args))

    await act(async () : Promise<void> => {
      await result.current.loadRecommendations()
    })

    let appendResult: unknown
    await act(async () : Promise<void> => {
      appendResult = await result.current.appendRecommendedItems([recommendation])
    })

    expect(appendResult).toEqual({ status: 'no-op' })
    expect(result.current.recommendationItems).toEqual([recommendation])
    expect(args.onRecommendedItemsAppended).toHaveBeenCalledWith([candidateItem], [recommendation])
    expect(args.refreshStashes).not.toHaveBeenCalled()
    expect(args.showToast).not.toHaveBeenCalled()
    expect(result.current.recommendationAppendBusy).toBe(false)
  })

  it('rejects and shows failure when local append reflection fails', async () : Promise<void> => {
    const localAppendError: Error = new Error('local append mismatch')
    const args: HookArgs = createArgs({
      onRecommendedItemsAppended: vi.fn(() : never => {
        throw localAppendError
      }),
    })
    const recommendation: CandidateReferenceItemSummary = createReferenceItem()
    const candidateItem: CandidateStashItemSummary = createCandidateItem()
    mockAppendCandidateItems.mockResolvedValue(createAppendResult([candidateItem]))

    const { result }: { rerender: (args: HookArgs) => void; result: { readonly current: { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; }; }; } = renderHook(() : { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; } => useCandidateRecommendations(args))

    await act(async () : Promise<void> => {
      await expect(result.current.appendRecommendedItems([recommendation])).rejects.toThrow(
        'local append mismatch',
      )
    })

    expect(args.refreshStashes).not.toHaveBeenCalled()
    expect(args.showToast).toHaveBeenCalledWith('추천 후보 추가에 실패했습니다.', { variant: 'error' })
    expect(result.current.recommendationAppendBusy).toBe(false)
  })

  it('returns empty-selection without calling append API when no recommendation rows are provided', async () : Promise<void> => {
    const args: HookArgs = createArgs()
    const { result }: { rerender: (args: HookArgs) => void; result: { readonly current: { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; }; }; } = renderHook(() : { recommendationItems: CandidateReferenceItemSummary[]; recommendationLoading: boolean; recommendationAppendBusy: boolean; recommendationError: string | null; clearRecommendationItems: () => void; loadRecommendations: (force?: boolean) => Promise<CandidateReferenceItemSummary[]>; appendRecommendedItems: (rows: CandidateReferenceItemSummary[]) => Promise<AppendRecommendedItemsResult>; } => useCandidateRecommendations(args))

    let appendResult: unknown
    await act(async () : Promise<void> => {
      appendResult = await result.current.appendRecommendedItems([])
    })

    expect(appendResult).toEqual({ status: 'empty-selection' })
    expect(mockAppendCandidateItems).not.toHaveBeenCalled()
    expect(args.onRecommendedItemsAppended).not.toHaveBeenCalled()
    expect(args.showToast).not.toHaveBeenCalled()
  })
})
