// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteCandidateItem,
  deleteCandidateItems,
  updateCandidateItem,
  type CandidateItemSummary,
} from '../../../api'
import { useCandidateStashItemActions } from './useCandidateStashItemActions'

vi.mock('../../../api', () => ({
  deleteCandidateItem: vi.fn(),
  deleteCandidateItems: vi.fn(),
  getApiErrorDisplayMessage: vi.fn((error: unknown, fallback: string) => (
    error instanceof Error && error.message ? `${fallback}: ${error.message}` : fallback
  )),
  updateCandidateItem: vi.fn(),
}))

vi.mock('../../../utils/candidateOrderExcelExport', () => ({
  createCandidateOrderExcelExport: vi.fn(),
  downloadBlob: vi.fn(),
}))

type HookArgs = Parameters<typeof useCandidateStashItemActions>[0]
type HookResult = ReturnType<typeof useCandidateStashItemActions>

let root: Root | null = null
let container: HTMLDivElement | null = null

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

const createCandidateItemSummary = (uuid: string): CandidateItemSummary => ({
  uuid,
  stashUuid: 'stash-1',
  skuUuid: `sku-${uuid}`,
  skuGroupKey: `sku-group-${uuid}`,
  brand: '테스트 브랜드',
  code: `CODE-${uuid}`,
  productName: `상품 ${uuid}`,
  colorCode: 'BLACK',
  orderMetricStatus: 'loaded',
  qty: 0,
  expectedOrderAmount: 0,
  expectedSalesAmount: 0,
  expectedOpProfit: 0,
  insightStatus: 'loaded',
  insight: {
    competitorChannelLabel: '경쟁사',
    competitorQty: null,
    competitorAmount: null,
    selfQty: null,
    selfAmount: null,
    expectedSalesQty: 0,
    expectedSalesAmount: 0,
    expectedOpProfit: 0,
    selfOpProfitRatePct: null,
    rankTone: 'neutral',
    topPercentThreshold: 20,
    bottomPercentThreshold: 20,
    badges: [],
  },
  isLatestLlmComment: false,
  isDetailConfirmed: false,
  orderExport: null,
  dbCreatedAt: '2026-05-01T00:00:00.000Z',
  dbUpdatedAt: '2026-05-01T00:00:00.000Z',
})

function Probe({ args, onRender }: { args: HookArgs, onRender: (result: HookResult) => void }) {
  onRender(useCandidateStashItemActions(args))
  return null
}

function renderActions(args: HookArgs) {
  let current: HookResult | null = null
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root?.render(createElement(Probe, { args, onRender: (result) => { current = result } }))
  })
  return {
    get current() {
      if (!current) throw new Error('Hook result is not ready')
      return current
    },
    rerender(nextArgs: HookArgs) {
      act(() => {
        root?.render(createElement(Probe, { args: nextArgs, onRender: (result) => { current = result } }))
      })
    },
  }
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
})

describe('useCandidateStashItemActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const setup = (overrides: Partial<HookArgs> = {}) => {
    const args: HookArgs = {
      stashUuid: 'stash-1',
      companyUuid: 'company-1',
      detailTarget: null,
      items: [],
      itemDeleteTarget: createCandidateItemSummary('item-1'),
      openedItemUuid: null,
      closeDrawer: vi.fn(),
      refreshStashes: vi.fn().mockResolvedValue(undefined),
      showToast: vi.fn(),
      onItemsDeleted: vi.fn(),
      onItemsUnconfirmed: vi.fn(),
      ...overrides,
    }

    const hook = renderActions(args)
    return { args, hook }
  }

  it('does not report delete mutation failure when refresh fails after item deletion', async () => {
    vi.mocked(deleteCandidateItem).mockResolvedValue({} as never)
    const { args, hook } = setup({
      refreshStashes: vi.fn().mockRejectedValue(new Error('refresh failed')),
    })

    await act(async () => {
      await hook.current.confirmDeleteItem()
    })

    expect(args.onItemsDeleted).toHaveBeenCalledWith(['item-1'])
    expect(args.showToast).toHaveBeenCalledWith(
      '후보를 삭제했지만 목록을 새로고침하지 못했습니다.',
      { variant: 'error' },
    )
    expect(vi.mocked(args.showToast).mock.calls.map(([message]) => message)).not.toContain('후보를 삭제했습니다.')
    expect(vi.mocked(args.showToast).mock.calls.some(([message]) => message.includes('삭제하지 못했습니다'))).toBe(false)
  })

  it('marks item delete mutation failure toast as error', async () => {
    vi.mocked(deleteCandidateItem).mockRejectedValue(new Error('delete failed'))
    const { args, hook } = setup()

    await expect(act(async () => {
      await hook.current.confirmDeleteItem()
    })).rejects.toThrow('delete failed')

    expect(args.refreshStashes).not.toHaveBeenCalled()
    expect(args.showToast).toHaveBeenCalledWith(
      '후보를 삭제하지 못했습니다.: delete failed',
      { variant: 'error' },
    )
  })

  it('marks bulk delete mutation failure toast as error', async () => {
    vi.mocked(deleteCandidateItems).mockRejectedValue(new Error('bulk delete failed'))
    const { args, hook } = setup({ itemDeleteTarget: null })

    await expect(act(async () => {
      await hook.current.confirmDeleteItems(['item-1', 'item-2'])
    })).rejects.toThrow('bulk delete failed')

    expect(args.refreshStashes).not.toHaveBeenCalled()
    expect(args.showToast).toHaveBeenCalledWith(
      '선택 후보를 삭제하지 못했습니다.: bulk delete failed',
      { variant: 'error' },
    )
  })

  it('reports missing company as bulk unconfirm setup failure', async () => {
    const { args, hook } = setup({
      companyUuid: undefined,
      itemDeleteTarget: null,
    })

    await expect(act(async () => {
      await hook.current.confirmUnconfirmItems(['item-1'])
    })).rejects.toThrow('오더 후보군은 회사 선택이 필요합니다.')

    expect(args.refreshStashes).not.toHaveBeenCalled()
    expect(args.showToast).toHaveBeenCalledWith(
      '선택 후보 상세 확정을 해제하지 못했습니다.: 오더 후보군은 회사 선택이 필요합니다.',
      { variant: 'error' },
    )
  })

  it('marks partial bulk unconfirm toast as error', async () => {
    vi.mocked(updateCandidateItem)
      .mockResolvedValueOnce({ uuid: 'item-1' } as never)
      .mockRejectedValueOnce(new Error('update failed'))
    const { args, hook } = setup({ itemDeleteTarget: null })

    await expect(act(async () => {
      await hook.current.confirmUnconfirmItems(['item-1', 'item-2'])
    })).rejects.toThrow('update failed')

    expect(args.refreshStashes).toHaveBeenCalledTimes(1)
    expect(args.showToast).toHaveBeenCalledWith(
      '상세 확정 해제: 1개 성공/1개 실패했습니다.',
      { variant: 'error' },
    )
  })

  it('ignores stale item delete after stash scope changes', async () => {
    const deleteDeferred = createDeferred<never>()
    vi.mocked(deleteCandidateItem).mockReturnValue(deleteDeferred.promise)
    const { args, hook } = setup({
      openedItemUuid: 'item-1',
    })

    let mutationPromise!: Promise<void>
    act(() => {
      mutationPromise = hook.current.confirmDeleteItem()
    })

    hook.rerender({
      ...args,
      stashUuid: 'stash-2',
    })

    await act(async () => {
      deleteDeferred.resolve({} as never)
      await mutationPromise
    })

    expect(args.closeDrawer).not.toHaveBeenCalled()
    expect(args.onItemsDeleted).not.toHaveBeenCalled()
    expect(args.refreshStashes).not.toHaveBeenCalled()
    expect(args.showToast).not.toHaveBeenCalled()
  })

  it('ignores stale item delete after drawer item changes', async () => {
    const deleteDeferred = createDeferred<never>()
    vi.mocked(deleteCandidateItem).mockReturnValue(deleteDeferred.promise)
    const { args, hook } = setup({
      openedItemUuid: 'item-1',
    })

    let mutationPromise!: Promise<void>
    act(() => {
      mutationPromise = hook.current.confirmDeleteItem()
    })

    hook.rerender({
      ...args,
      openedItemUuid: 'item-2',
    })

    await act(async () => {
      deleteDeferred.resolve({} as never)
      await mutationPromise
    })

    expect(args.closeDrawer).not.toHaveBeenCalled()
    expect(args.onItemsDeleted).not.toHaveBeenCalled()
    expect(args.refreshStashes).not.toHaveBeenCalled()
    expect(args.showToast).not.toHaveBeenCalled()
  })

  it('keeps newer item delete busy state when an older action completes', async () => {
    const firstDeleteDeferred = createDeferred<never>()
    const secondDeleteDeferred = createDeferred<never>()
    vi.mocked(deleteCandidateItem)
      .mockReturnValueOnce(firstDeleteDeferred.promise)
      .mockReturnValueOnce(secondDeleteDeferred.promise)
    const { args, hook } = setup()

    let firstMutationPromise!: Promise<void>
    act(() => {
      firstMutationPromise = hook.current.confirmDeleteItem()
    })

    hook.rerender({
      ...args,
      itemDeleteTarget: createCandidateItemSummary('item-2'),
    })

    let secondMutationPromise!: Promise<void>
    act(() => {
      secondMutationPromise = hook.current.confirmDeleteItem()
    })

    await act(async () => {
      firstDeleteDeferred.resolve({} as never)
      await firstMutationPromise
    })

    expect(hook.current.itemDeleteBusy).toBe(true)
    expect(args.onItemsDeleted).not.toHaveBeenCalledWith(['item-1'])

    await act(async () => {
      secondDeleteDeferred.resolve({} as never)
      await secondMutationPromise
    })

    expect(hook.current.itemDeleteBusy).toBe(false)
    expect(args.onItemsDeleted).toHaveBeenCalledWith(['item-2'])
  })

  it('ignores stale bulk delete after company scope changes', async () => {
    const deleteDeferred = createDeferred<never>()
    vi.mocked(deleteCandidateItems).mockReturnValue(deleteDeferred.promise)
    const { args, hook } = setup({
      itemDeleteTarget: null,
      openedItemUuid: 'item-2',
    })

    let mutationPromise!: Promise<void>
    act(() => {
      mutationPromise = hook.current.confirmDeleteItems(['item-1', 'item-2'])
    })

    hook.rerender({
      ...args,
      companyUuid: 'company-2',
    })

    await act(async () => {
      deleteDeferred.resolve({} as never)
      await mutationPromise
    })

    expect(args.closeDrawer).not.toHaveBeenCalled()
    expect(args.onItemsDeleted).not.toHaveBeenCalled()
    expect(args.refreshStashes).not.toHaveBeenCalled()
    expect(args.showToast).not.toHaveBeenCalled()
  })

  it('ignores stale bulk unconfirm after stash scope changes', async () => {
    const updateDeferred = createDeferred<never>()
    vi.mocked(updateCandidateItem).mockReturnValue(updateDeferred.promise)
    const { args, hook } = setup({
      itemDeleteTarget: null,
      openedItemUuid: 'item-1',
    })

    let mutationPromise!: Promise<void>
    act(() => {
      mutationPromise = hook.current.confirmUnconfirmItems(['item-1'])
    })

    hook.rerender({
      ...args,
      stashUuid: 'stash-2',
    })

    await act(async () => {
      updateDeferred.resolve({ uuid: 'item-1' } as never)
      await mutationPromise
    })

    expect(args.closeDrawer).not.toHaveBeenCalled()
    expect(args.onItemsUnconfirmed).not.toHaveBeenCalled()
    expect(args.refreshStashes).not.toHaveBeenCalled()
    expect(args.showToast).not.toHaveBeenCalled()
  })
})
