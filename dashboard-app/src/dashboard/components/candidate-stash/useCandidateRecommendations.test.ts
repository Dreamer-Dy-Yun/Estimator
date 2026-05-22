// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  appendCandidateItems,
  type CandidateItemSummary,
  type CandidateReferenceItemSummary,
  type CandidateStashItemSummary,
} from '../../../api'
import { useCandidateRecommendations } from './useCandidateRecommendations'

vi.mock('../../../api', async () => ({
  appendCandidateItems: vi.fn(),
  getApiErrorDisplayMessage: vi.fn((_err: unknown, fallback: string) => fallback),
  getCandidateRecommendations: vi.fn(),
}))

type HookArgs = Parameters<typeof useCandidateRecommendations>[0]
type AppendResult = Awaited<ReturnType<typeof appendCandidateItems>>
type HookResult = ReturnType<typeof useCandidateRecommendations>

type HookProbeProps = {
  args: HookArgs
  onRender: (value: HookResult) => void
  renderHookValue: (args: HookArgs) => HookResult
}

let root: Root | null = null
let container: HTMLDivElement | null = null

function HookProbe({ args, onRender, renderHookValue }: HookProbeProps) {
  onRender(renderHookValue(args))
  return null
}

function renderHook(
  renderHookValue: (args: HookArgs) => HookResult,
  options?: { initialProps: HookArgs },
) {
  const state = { current: null as HookResult | null }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)

  const render = (args: HookArgs) => {
    act(() => {
      root?.render(createElement(HookProbe, {
        args,
        onRender: (value) => {
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
      get current() {
        if (!state.current) throw new Error('hook result is not rendered')
        return state.current
      },
    },
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
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
    onRecommendedItemsAppended: vi.fn(),
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

describe('useCandidateRecommendations', () => {
  const mockAppendCandidateItems = vi.mocked(appendCandidateItems)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    root = null
    container?.remove()
    container = null
    document.body.innerHTML = ''
  })

  it('returns applied and reflects appended recommendation items to the caller', async () => {
    const args = createArgs()
    const recommendation = createReferenceItem()
    const candidateItem = createCandidateItem()
    mockAppendCandidateItems.mockResolvedValue(createAppendResult([candidateItem]))

    const { result } = renderHook(() => useCandidateRecommendations(args))

    let appendResult: unknown
    await act(async () => {
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

  it('returns stale for a duplicate append while the first append is busy', async () => {
    const args = createArgs()
    const recommendation = createReferenceItem()
    const candidateItem = createCandidateItem()
    const deferred = createDeferred<AppendResult>()
    mockAppendCandidateItems.mockReturnValue(deferred.promise)

    const { result } = renderHook(() => useCandidateRecommendations(args))

    let firstAppend!: Promise<unknown>
    await act(async () => {
      firstAppend = result.current.appendRecommendedItems([recommendation])
    })

    let duplicateResult: unknown
    await act(async () => {
      duplicateResult = await result.current.appendRecommendedItems([recommendation])
    })

    expect(duplicateResult).toEqual({ status: 'stale' })
    expect(result.current.recommendationAppendBusy).toBe(true)
    expect(mockAppendCandidateItems).toHaveBeenCalledTimes(1)

    let firstResult: unknown
    await act(async () => {
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
  ])('returns stale and prevents caller success reflection after %s mismatch', async (_label, overrides) => {
    const args = createArgs()
    const recommendation = createReferenceItem()
    const candidateItem = createCandidateItem()
    const deferred = createDeferred<AppendResult>()
    mockAppendCandidateItems.mockReturnValue(deferred.promise)

    const { rerender, result } = renderHook(
      (hookArgs: HookArgs) => useCandidateRecommendations(hookArgs),
      { initialProps: args },
    )

    let appendPromise!: Promise<unknown>
    await act(async () => {
      appendPromise = result.current.appendRecommendedItems([recommendation])
    })

    await act(async () => {
      rerender({ ...args, ...overrides })
    })

    let appendResult: unknown
    await act(async () => {
      deferred.resolve(createAppendResult([candidateItem]))
      appendResult = await appendPromise
    })

    expect(appendResult).toEqual({ status: 'stale' })
    expect(args.onRecommendedItemsAppended).not.toHaveBeenCalled()
    expect(args.refreshStashes).not.toHaveBeenCalled()
    expect(args.showToast).not.toHaveBeenCalled()
  })

  it('returns stale without caller success reflection after unmount', async () => {
    const args = createArgs()
    const recommendation = createReferenceItem()
    const candidateItem = createCandidateItem()
    const deferred = createDeferred<AppendResult>()
    mockAppendCandidateItems.mockReturnValue(deferred.promise)

    const { result } = renderHook(() => useCandidateRecommendations(args))

    let appendPromise!: Promise<unknown>
    await act(async () => {
      appendPromise = result.current.appendRecommendedItems([recommendation])
    })

    args.mountedRef.current = false

    let appendResult: unknown
    await act(async () => {
      deferred.resolve(createAppendResult([candidateItem]))
      appendResult = await appendPromise
    })

    expect(appendResult).toEqual({ status: 'stale' })
    expect(args.onRecommendedItemsAppended).not.toHaveBeenCalled()
    expect(args.refreshStashes).not.toHaveBeenCalled()
    expect(args.showToast).not.toHaveBeenCalled()
  })

  it('returns empty when append API creates no new item', async () => {
    const args = createArgs()
    const recommendation = createReferenceItem()
    mockAppendCandidateItems.mockResolvedValue(createAppendResult([]))

    const { result } = renderHook(() => useCandidateRecommendations(args))

    let appendResult: unknown
    await act(async () => {
      appendResult = await result.current.appendRecommendedItems([recommendation])
    })

    expect(appendResult).toEqual({ status: 'empty' })
    expect(mockAppendCandidateItems).toHaveBeenCalledWith({
      companyUuid: 'company-1',
      skuGroupKeys: ['sku-group-1'],
      stashUuid: 'stash-1',
    })
    expect(args.onRecommendedItemsAppended).toHaveBeenCalledWith([], [recommendation])
    expect(args.refreshStashes).toHaveBeenCalledTimes(1)
    expect(args.showToast).toHaveBeenCalledWith('새로 추가할 추천 후보가 없습니다.')
    expect(result.current.recommendationAppendBusy).toBe(false)
  })

  it('rejects and shows failure when local append reflection fails', async () => {
    const localAppendError = new Error('local append mismatch')
    const args = createArgs({
      onRecommendedItemsAppended: vi.fn(() => {
        throw localAppendError
      }),
    })
    const recommendation = createReferenceItem()
    const candidateItem = createCandidateItem()
    mockAppendCandidateItems.mockResolvedValue(createAppendResult([candidateItem]))

    const { result } = renderHook(() => useCandidateRecommendations(args))

    await act(async () => {
      await expect(result.current.appendRecommendedItems([recommendation])).rejects.toThrow(
        'local append mismatch',
      )
    })

    expect(args.refreshStashes).not.toHaveBeenCalled()
    expect(args.showToast).toHaveBeenCalledWith('추천 후보 추가에 실패했습니다.')
    expect(result.current.recommendationAppendBusy).toBe(false)
  })

  it('returns empty without calling append API when no recommendation rows are provided', async () => {
    const args = createArgs()
    const { result } = renderHook(() => useCandidateRecommendations(args))

    let appendResult: unknown
    await act(async () => {
      appendResult = await result.current.appendRecommendedItems([])
    })

    expect(appendResult).toEqual({ status: 'empty' })
    expect(mockAppendCandidateItems).not.toHaveBeenCalled()
    expect(args.onRecommendedItemsAppended).not.toHaveBeenCalled()
    expect(args.showToast).not.toHaveBeenCalled()
  })
})
