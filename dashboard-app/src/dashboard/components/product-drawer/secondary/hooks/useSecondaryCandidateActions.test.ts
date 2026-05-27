// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardApi } from '../../../../../api'
import type { CandidateStashPickerOption } from '../CandidateStashPickerModal'
import { useSecondaryCandidateActions } from './useSecondaryCandidateActions'

const authState = vi.hoisted(() => ({
  selectedCompanyUuid: 'company-1' as string | null,
}))

vi.mock('../../../../../api', () => ({
  dashboardApi: {
    appendCandidateItem: vi.fn(),
    createCandidateStash: vi.fn(),
    getCandidateStashes: vi.fn(),
    updateCandidateItem: vi.fn(),
  },
  getCompanyUuidForOptionalScope: vi.fn((companyUuid: string | null) => companyUuid),
}))

vi.mock('../../../../../auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({ selectedCompanyUuid: authState.selectedCompanyUuid })),
}))

type HookArgs = Parameters<typeof useSecondaryCandidateActions>[0]
type HookResult = ReturnType<typeof useSecondaryCandidateActions>

let root: Root | null = null
let container: HTMLDivElement | null = null

function Probe({ args, onRender }: { args: HookArgs, onRender: (result: HookResult) => void }) {
  onRender(useSecondaryCandidateActions(args))
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

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

function makeSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 2,
    skuGroupKey: 'sku-1',
    context: {
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      forecastMonths: 3,
      dailyTrendStartMonth: '2026-05',
      dailyTrendLeadTimeDays: 7,
    },
    drawer1: { summary: {} },
    drawer2: {
      competitorBasis: {},
      competitorChannelId: 'naver',
      competitorChannelLabel: 'Naver',
      stockOrderRequest: {
        currentOrderInboundDueDate: '2026-06-01',
        nextOrderInboundDueDate: '2026-06-15',
        leadTimeDays: 7,
      },
      unitEconomics: { unitPrice: 1000, unitCost: 700, expectedFeeRatePct: 13 },
      selfWeightPct: 50,
      bufferStock: 0,
      aiComment: { prompt: '', answer: '' },
      confirmedTotals: {
        orderQty: 1,
        expectedSalesAmount: 1000,
        expectedOpProfit: 170,
        expectedOpProfitRatePct: 17,
      },
      sizeOrders: [{ size: 'M', selfSharePct: 100, competitorSharePct: 0, blendedSharePct: 100, forecastQty: 1, recommendedQty: 1, confirmQty: 1 }],
    },
    ...overrides,
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

describe('useSecondaryCandidateActions', () => {
  beforeEach(() => {
    authState.selectedCompanyUuid = 'company-1'
    vi.clearAllMocks()
  })

  const setup = (overrides: Partial<HookArgs> = {}) => {
    const args: HookArgs = {
      skuGroupKey: 'sku-1',
      companyUuid: 'company-1',
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      forecastMonths: 3,
      hasSavedSnapshot: false,
      candidateItemContext: null,
      buildSnapshot: vi.fn(() => makeSnapshot() as never),
      showToast: vi.fn(),
      ...overrides,
    }

    const hook = renderActions(args)
    return { args, hook }
  }

  it('does not report candidate creation failure when refresh fails after creation', async () => {
    vi.mocked(dashboardApi.createCandidateStash).mockResolvedValue({ uuid: 'stash-1' } as never)
    vi.mocked(dashboardApi.getCandidateStashes).mockRejectedValue(new Error('refresh failed'))
    const { args, hook } = setup()

    act(() => {
      hook.current.setNameInput('new stash')
    })

    let result = true
    await act(async () => {
      result = await hook.current.createCandidate()
    })

    expect(result).toBe(true)
    expect(dashboardApi.createCandidateStash).toHaveBeenCalledWith(expect.objectContaining({
      name: 'new stash',
      companyUuid: 'company-1',
    }))
    expect(args.showToast).toHaveBeenCalledWith(
      '후보군은 생성됐지만 목록 새로고침에 실패했습니다. 목록을 다시 불러와 주세요.',
      { variant: 'warning' },
    )
    expect(vi.mocked(args.showToast).mock.calls.some(([message]) => message === '후보군을 생성했습니다.')).toBe(true)
  })

  it('reports candidate creation sync miss when refresh succeeds without the created row', async () => {
    vi.mocked(dashboardApi.createCandidateStash).mockResolvedValue({ uuid: 'stash-created' } as never)
    vi.mocked(dashboardApi.getCandidateStashes).mockResolvedValue([
      {
        uuid: 'stash-other',
        name: 'other stash',
        note: '',
        dbCreatedAt: '2026-05-22T00:00:00.000Z',
      },
    ] as never)
    const { args, hook } = setup()

    act(() => {
      hook.current.setNameInput('new stash')
    })

    let result = true
    await act(async () => {
      result = await hook.current.createCandidate()
    })

    expect(result).toBe(false)
    expect(args.showToast).toHaveBeenCalledWith(
      '후보군은 생성됐지만 목록에서 생성 항목을 확인하지 못했습니다. 목록을 다시 불러와 주세요.',
      { variant: 'warning' },
    )
    expect(vi.mocked(args.showToast).mock.calls.some(([message]) => message === '후보군을 생성했습니다.')).toBe(true)
  })

  it('keeps loading active when an older action finishes after a newer action starts', async () => {
    const firstAppend = deferred<void>()
    const secondAppend = deferred<void>()
    vi.mocked(dashboardApi.appendCandidateItem)
      .mockReturnValueOnce(firstAppend.promise as never)
      .mockReturnValueOnce(secondAppend.promise as never)
    const { hook } = setup()

    act(() => {
      hook.current.selectCandidate({
        uuid: 'stash-1',
        name: 'selected stash',
        note: '',
        dbCreatedAt: '2026-05-22T00:00:00.000Z',
      })
    })

    let firstPromise!: Promise<boolean>
    let secondPromise!: Promise<boolean>
    act(() => {
      firstPromise = hook.current.confirmOrder()
    })
    act(() => {
      secondPromise = hook.current.confirmOrder()
    })

    let firstResult = true
    await act(async () => {
      firstAppend.resolve()
      firstResult = await firstPromise
    })

    expect(firstResult).toBe(false)
    expect(hook.current.loading).toBe(true)

    let secondResult = false
    await act(async () => {
      secondAppend.resolve()
      secondResult = await secondPromise
    })

    expect(secondResult).toBe(true)
    expect(hook.current.loading).toBe(false)
  })

  it('does not apply a candidate item confirmation result after the company changes', async () => {
    const updateResult = deferred<{ uuid: string }>()
    const onConfirmed = vi.fn()
    const onSaved = vi.fn()
    vi.mocked(dashboardApi.updateCandidateItem).mockReturnValue(updateResult.promise as never)
    const { args, hook } = setup({
      candidateItemContext: {
        itemUuid: 'item-1',
        onConfirmed,
        onSaved,
      } as never,
    })

    let confirmPromise!: Promise<boolean>
    act(() => {
      confirmPromise = hook.current.confirmCandidateItem()
    })

    hook.rerender({ ...args, companyUuid: 'company-2' })

    let result = true
    await act(async () => {
      updateResult.resolve({ uuid: 'item-1' })
      result = await confirmPromise
    })

    expect(result).toBe(false)
    expect(onConfirmed).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
    expect(vi.mocked(args.showToast).mock.calls.some(([message]) => message === '상세확정했습니다.')).toBe(false)
  })

  it('does not apply a candidate item confirmation result after the period changes', async () => {
    const updateResult = deferred<{ uuid: string }>()
    const onConfirmed = vi.fn()
    const onSaved = vi.fn()
    vi.mocked(dashboardApi.updateCandidateItem).mockReturnValue(updateResult.promise as never)
    const { args, hook } = setup({
      candidateItemContext: {
        itemUuid: 'item-1',
        onConfirmed,
        onSaved,
      } as never,
    })

    let confirmPromise!: Promise<boolean>
    act(() => {
      confirmPromise = hook.current.confirmCandidateItem()
    })

    hook.rerender({ ...args, periodStart: '2026-06-01', periodEnd: '2026-06-30' })

    let result = true
    await act(async () => {
      updateResult.resolve({ uuid: 'item-1' })
      result = await confirmPromise
    })

    expect(result).toBe(false)
    expect(onConfirmed).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('does not apply append result after the selected candidate changes', async () => {
    const appendResult = deferred<void>()
    vi.mocked(dashboardApi.appendCandidateItem).mockReturnValue(appendResult.promise as never)
    const { args, hook } = setup()

    act(() => {
      hook.current.selectCandidate({
        uuid: 'stash-1',
        name: 'first stash',
        note: '',
        dbCreatedAt: '2026-05-22T00:00:00.000Z',
      })
    })

    let appendPromise!: Promise<boolean>
    act(() => {
      appendPromise = hook.current.confirmOrder()
    })

    act(() => {
      hook.current.selectCandidate({
        uuid: 'stash-2',
        name: 'second stash',
        note: '',
        dbCreatedAt: '2026-05-22T00:00:00.000Z',
      })
    })

    let result = true
    await act(async () => {
      appendResult.resolve()
      result = await appendPromise
    })

    expect(result).toBe(false)
    expect(hook.current.selectedCandidate?.uuid).toBe('stash-2')
    expect(vi.mocked(args.showToast).mock.calls.some(([message]) => message === '후보군에 아이템을 저장했습니다.')).toBe(false)
  })

  it('does not apply a confirmation result after the snapshot mutation input changes', async () => {
    const updateResult = deferred<{ uuid: string }>()
    const onConfirmed = vi.fn()
    const onSaved = vi.fn()
    vi.mocked(dashboardApi.updateCandidateItem).mockReturnValue(updateResult.promise as never)
    const { args, hook } = setup({
      candidateItemContext: {
        itemUuid: 'item-1',
        onConfirmed,
        onSaved,
      } as never,
      buildSnapshot: vi.fn(() => makeSnapshot() as never),
    })

    let confirmPromise!: Promise<boolean>
    act(() => {
      confirmPromise = hook.current.confirmCandidateItem()
    })

    hook.rerender({
      ...args,
      buildSnapshot: vi.fn(() => makeSnapshot({
        drawer2: {
          ...makeSnapshot().drawer2,
          stockOrderRequest: {
            currentOrderInboundDueDate: '2026-06-15',
            nextOrderInboundDueDate: '2026-06-30',
            leadTimeDays: 7,
          },
        },
      }) as never),
    })

    let result = true
    await act(async () => {
      updateResult.resolve({ uuid: 'item-1' })
      result = await confirmPromise
    })

    expect(result).toBe(false)
    expect(onConfirmed).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('does not select a created candidate when the sku group changes before refresh completes', async () => {
    const createResult = deferred<{ uuid: string }>()
    const refreshResult = deferred<CandidateStashPickerOption[]>()
    vi.mocked(dashboardApi.createCandidateStash).mockReturnValue(createResult.promise as never)
    vi.mocked(dashboardApi.getCandidateStashes).mockReturnValue(refreshResult.promise as never)
    const { args, hook } = setup()

    act(() => {
      hook.current.setNameInput('new stash')
    })

    let createPromise!: Promise<boolean>
    act(() => {
      createPromise = hook.current.createCandidate()
    })


    hook.rerender({ ...args, skuGroupKey: 'sku-2' })
    createResult.resolve({ uuid: 'stash-created' })

    refreshResult.resolve([
      {
        uuid: 'stash-created',
        name: 'created stash',
        note: '',
        dbCreatedAt: '2026-05-22T00:00:00.000Z',
      },
    ])
    let result = true
    await act(async () => {
      result = await createPromise
    })

    expect(result).toBe(false)
    expect(hook.current.selectedCandidate).toBeNull()
    expect(vi.mocked(args.showToast).mock.calls.some(([message]) => message === '후보군을 생성했습니다.')).toBe(false)
  })
})
