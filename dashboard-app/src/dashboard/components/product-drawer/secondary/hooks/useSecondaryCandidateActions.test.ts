import type { CandidateStashSummary } from '../../../../../api'
import type { ToastOptions } from '../../../../../components/AppToastContext'
// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi , type Mock} from 'vitest';
import { dashboardApi } from '../../../../../api'
import type { CandidateStashPickerOption } from '../CandidateStashPickerModal'
import { useSecondaryCandidateActions } from './useSecondaryCandidateActions'

const authState: { selectedCompanyUuid: string | null; } = vi.hoisted(() : { selectedCompanyUuid: string | null; } => ({
  selectedCompanyUuid: 'company-1' as string | null,
}))

vi.mock('../../../../../api', () : { dashboardApi: { appendCandidateItem: Mock<(...args: unknown[]) => unknown>; createCandidateStash: Mock<(...args: unknown[]) => unknown>; getCandidateStashes: Mock<(...args: unknown[]) => unknown>; updateCandidateItem: Mock<(...args: unknown[]) => unknown>; }; getCompanyUuidForOptionalScope: Mock<(companyUuid: string | null) => string | null>; } => ({
  dashboardApi: {
    appendCandidateItem: vi.fn(),
    createCandidateStash: vi.fn(),
    getCandidateStashes: vi.fn(),
    updateCandidateItem: vi.fn(),
  },
  getCompanyUuidForOptionalScope: vi.fn((companyUuid: string | null) : string | null => companyUuid),
}))

vi.mock('../../../../../auth/AuthContext', () : { useAuth: Mock<() => { selectedCompanyUuid: string | null; }>; } => ({
  useAuth: vi.fn(() : { selectedCompanyUuid: string | null; } => ({ selectedCompanyUuid: authState.selectedCompanyUuid })),
}))

export type HookArgs = Parameters<typeof useSecondaryCandidateActions>[0]
export type HookResult = ReturnType<typeof useSecondaryCandidateActions>

let root: Root | null = null
let container: HTMLDivElement | null = null

function Probe({ args, onRender }: { args: HookArgs, onRender: (result: HookResult) => void }) : null {
  onRender(useSecondaryCandidateActions(args))
  return null
}

function renderActions(args: HookArgs) : { readonly current: { loading: boolean; listOpen: boolean; stashes: CandidateStashPickerOption[]; selectedCandidate: CandidateStashPickerOption | null; companyScopeBlocked: boolean; companyScopeBlockReason: string; nameInput: string; noteInput: string; setNameInput: React.Dispatch<React.SetStateAction<string>>; setNoteInput: React.Dispatch<React.SetStateAction<string>>; setListOpen: React.Dispatch<React.SetStateAction<boolean>>; createCandidate: () => Promise<boolean>; confirmOrder: () => Promise<boolean>; refresh: () => Promise<CandidateStashSummary[] | null>; openPicker: () => Promise<void>; confirmCandidateItem: () => Promise<boolean>; unconfirmCandidateItem: () => Promise<boolean>; selectCandidate: (row: CandidateStashPickerOption) => void; }; rerender(nextArgs: HookArgs): void; } {
  let current: HookResult | null = null
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() : void => {
    root?.render(createElement(Probe, { args, onRender: (result: { loading: boolean; listOpen: boolean; stashes: CandidateStashPickerOption[]; selectedCandidate: CandidateStashPickerOption | null; companyScopeBlocked: boolean; companyScopeBlockReason: string; nameInput: string; noteInput: string; setNameInput: React.Dispatch<React.SetStateAction<string>>; setNoteInput: React.Dispatch<React.SetStateAction<string>>; setListOpen: React.Dispatch<React.SetStateAction<boolean>>; createCandidate: () => Promise<boolean>; confirmOrder: () => Promise<boolean>; refresh: () => Promise<CandidateStashSummary[] | null>; openPicker: () => Promise<void>; confirmCandidateItem: () => Promise<boolean>; unconfirmCandidateItem: () => Promise<boolean>; selectCandidate: (row: CandidateStashPickerOption) => void; }) : void => { current = result } }))
  })
  return {
    get current() : { loading: boolean; listOpen: boolean; stashes: CandidateStashPickerOption[]; selectedCandidate: CandidateStashPickerOption | null; companyScopeBlocked: boolean; companyScopeBlockReason: string; nameInput: string; noteInput: string; setNameInput: React.Dispatch<React.SetStateAction<string>>; setNoteInput: React.Dispatch<React.SetStateAction<string>>; setListOpen: React.Dispatch<React.SetStateAction<boolean>>; createCandidate: () => Promise<boolean>; confirmOrder: () => Promise<boolean>; refresh: () => Promise<CandidateStashSummary[] | null>; openPicker: () => Promise<void>; confirmCandidateItem: () => Promise<boolean>; unconfirmCandidateItem: () => Promise<boolean>; selectCandidate: (row: CandidateStashPickerOption) => void; } {
      if (!current) throw new Error('Hook result is not ready')
      return current
    },
    rerender(nextArgs: HookArgs) : void {
      act(() : void => {
        root?.render(createElement(Probe, { args: nextArgs, onRender: (result: { loading: boolean; listOpen: boolean; stashes: CandidateStashPickerOption[]; selectedCandidate: CandidateStashPickerOption | null; companyScopeBlocked: boolean; companyScopeBlockReason: string; nameInput: string; noteInput: string; setNameInput: React.Dispatch<React.SetStateAction<string>>; setNoteInput: React.Dispatch<React.SetStateAction<string>>; setListOpen: React.Dispatch<React.SetStateAction<boolean>>; createCandidate: () => Promise<boolean>; confirmOrder: () => Promise<boolean>; refresh: () => Promise<CandidateStashSummary[] | null>; openPicker: () => Promise<void>; confirmCandidateItem: () => Promise<boolean>; unconfirmCandidateItem: () => Promise<boolean>; selectCandidate: (row: CandidateStashPickerOption) => void; }) : void => { current = result } }))
      })
    },
  }
}

function deferred<T>() : { promise: Promise<T>; resolve: (value: T) => void; reject: (reason?: unknown) => void; } {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise: Promise<T> = new Promise<T>((promiseResolve: (value: T | PromiseLike<T>) => void, promiseReject: (reason?: unknown) => void) : void => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

function makeSnapshot(overrides: Record<string, unknown> = {}) : { schemaVersion: number; skuGroupKey: string; context: { periodStart: string; periodEnd: string; forecastMonths: number; dailyTrendStartMonth: string; dailyTrendLeadTimeDays: number; }; drawer1: { summary: Record<string, never>; }; drawer2: { competitorBasis: Record<string, never>; competitorChannelId: string; competitorChannelLabel: string; stockOrderRequest: { currentOrderInboundDueDate: string; nextOrderInboundDueDate: string; leadTimeDays: number; }; unitEconomics: { unitPrice: number; unitCost: number; expectedFeeRatePct: number; }; selfWeightPct: number; bufferStock: number; aiComment: { prompt: string; answer: string; generatedAt: null; }; confirmedTotals: { orderQty: number; expectedSalesAmount: number; expectedOpProfit: number; expectedOpProfitRatePct: number; }; sizeOrders: { size: string; selfSharePct: number; competitorSharePct: number; blendedSharePct: number; forecastQty: number; recommendedQty: number; confirmQty: number; }[]; }; } {
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
      aiComment: { prompt: '', answer: '', generatedAt: null },
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

afterEach(() : void => {
  act(() : void => {
    root?.unmount()
  })
  root = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
})

describe('useSecondaryCandidateActions', () : void => {
  beforeEach(() : void => {
    authState.selectedCompanyUuid = 'company-1'
    vi.clearAllMocks()
  })

  const setup: (overrides?: Partial<HookArgs>) => { args: HookArgs; hook: { readonly current: { loading: boolean; listOpen: boolean; stashes: CandidateStashPickerOption[]; selectedCandidate: CandidateStashPickerOption | null; companyScopeBlocked: boolean; companyScopeBlockReason: string; nameInput: string; noteInput: string; setNameInput: React.Dispatch<React.SetStateAction<string>>; setNoteInput: React.Dispatch<React.SetStateAction<string>>; setListOpen: React.Dispatch<React.SetStateAction<boolean>>; createCandidate: () => Promise<boolean>; confirmOrder: () => Promise<boolean>; refresh: () => Promise<CandidateStashSummary[] | null>; openPicker: () => Promise<void>; confirmCandidateItem: () => Promise<boolean>; unconfirmCandidateItem: () => Promise<boolean>; selectCandidate: (row: CandidateStashPickerOption) => void; }; rerender(nextArgs: HookArgs): void; }; } = (overrides: Partial<HookArgs> = {}) : { args: HookArgs; hook: { readonly current: { loading: boolean; listOpen: boolean; stashes: CandidateStashPickerOption[]; selectedCandidate: CandidateStashPickerOption | null; companyScopeBlocked: boolean; companyScopeBlockReason: string; nameInput: string; noteInput: string; setNameInput: React.Dispatch<React.SetStateAction<string>>; setNoteInput: React.Dispatch<React.SetStateAction<string>>; setListOpen: React.Dispatch<React.SetStateAction<boolean>>; createCandidate: () => Promise<boolean>; confirmOrder: () => Promise<boolean>; refresh: () => Promise<CandidateStashSummary[] | null>; openPicker: () => Promise<void>; confirmCandidateItem: () => Promise<boolean>; unconfirmCandidateItem: () => Promise<boolean>; selectCandidate: (row: CandidateStashPickerOption) => void; }; rerender(nextArgs: HookArgs): void; }; } => {
    const args: HookArgs = {
      skuGroupKey: 'sku-1',
      companyUuid: 'company-1',
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      forecastMonths: 3,
      hasSavedSnapshot: false,
      candidateItemContext: null,
      buildSnapshot: vi.fn(() : never => makeSnapshot() as never),
      showToast: vi.fn(),
      ...overrides,
    }

    const hook: { readonly current: { loading: boolean; listOpen: boolean; stashes: CandidateStashPickerOption[]; selectedCandidate: CandidateStashPickerOption | null; companyScopeBlocked: boolean; companyScopeBlockReason: string; nameInput: string; noteInput: string; setNameInput: React.Dispatch<React.SetStateAction<string>>; setNoteInput: React.Dispatch<React.SetStateAction<string>>; setListOpen: React.Dispatch<React.SetStateAction<boolean>>; createCandidate: () => Promise<boolean>; confirmOrder: () => Promise<boolean>; refresh: () => Promise<CandidateStashSummary[] | null>; openPicker: () => Promise<void>; confirmCandidateItem: () => Promise<boolean>; unconfirmCandidateItem: () => Promise<boolean>; selectCandidate: (row: CandidateStashPickerOption) => void; }; rerender(nextArgs: HookArgs): void; } = renderActions(args)
    return { args, hook }
  }

  it('does not report candidate creation failure when refresh fails after creation', async () : Promise<void> => {
    vi.mocked(dashboardApi.createCandidateStash).mockResolvedValue({ uuid: 'stash-1' } as never)
    vi.mocked(dashboardApi.getCandidateStashes).mockRejectedValue(new Error('refresh failed'))
    const { args, hook }: { args: HookArgs; hook: { readonly current: { loading: boolean; listOpen: boolean; stashes: CandidateStashPickerOption[]; selectedCandidate: CandidateStashPickerOption | null; companyScopeBlocked: boolean; companyScopeBlockReason: string; nameInput: string; noteInput: string; setNameInput: React.Dispatch<React.SetStateAction<string>>; setNoteInput: React.Dispatch<React.SetStateAction<string>>; setListOpen: React.Dispatch<React.SetStateAction<boolean>>; createCandidate: () => Promise<boolean>; confirmOrder: () => Promise<boolean>; refresh: () => Promise<CandidateStashSummary[] | null>; openPicker: () => Promise<void>; confirmCandidateItem: () => Promise<boolean>; unconfirmCandidateItem: () => Promise<boolean>; selectCandidate: (row: CandidateStashPickerOption) => void; }; rerender(nextArgs: HookArgs): void; }; } = setup()

    act(() : void => {
      hook.current.setNameInput('new stash')
    })

    let result: boolean = true
    await act(async () : Promise<void> => {
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
    expect(vi.mocked(args.showToast).mock.calls.some(([message]: [message: string, options?: ToastOptions | undefined]) : boolean => message === '후보군을 생성했습니다.')).toBe(true)
  })

  it('reports candidate creation sync miss when refresh succeeds without the created row', async () : Promise<void> => {
    vi.mocked(dashboardApi.createCandidateStash).mockResolvedValue({ uuid: 'stash-created' } as never)
    vi.mocked(dashboardApi.getCandidateStashes).mockResolvedValue([
      {
        uuid: 'stash-other',
        name: 'other stash',
        note: '',
        dbCreatedAt: '2026-05-22T00:00:00.000Z',
      },
    ] as never)
    const { args, hook }: { args: HookArgs; hook: { readonly current: { loading: boolean; listOpen: boolean; stashes: CandidateStashPickerOption[]; selectedCandidate: CandidateStashPickerOption | null; companyScopeBlocked: boolean; companyScopeBlockReason: string; nameInput: string; noteInput: string; setNameInput: React.Dispatch<React.SetStateAction<string>>; setNoteInput: React.Dispatch<React.SetStateAction<string>>; setListOpen: React.Dispatch<React.SetStateAction<boolean>>; createCandidate: () => Promise<boolean>; confirmOrder: () => Promise<boolean>; refresh: () => Promise<CandidateStashSummary[] | null>; openPicker: () => Promise<void>; confirmCandidateItem: () => Promise<boolean>; unconfirmCandidateItem: () => Promise<boolean>; selectCandidate: (row: CandidateStashPickerOption) => void; }; rerender(nextArgs: HookArgs): void; }; } = setup()

    act(() : void => {
      hook.current.setNameInput('new stash')
    })

    let result: boolean = true
    await act(async () : Promise<void> => {
      result = await hook.current.createCandidate()
    })

    expect(result).toBe(false)
    expect(args.showToast).toHaveBeenCalledWith(
      '후보군은 생성됐지만 목록에서 생성 항목을 확인하지 못했습니다. 목록을 다시 불러와 주세요.',
      { variant: 'warning' },
    )
    expect(vi.mocked(args.showToast).mock.calls.some(([message]: [message: string, options?: ToastOptions | undefined]) : boolean => message === '후보군을 생성했습니다.')).toBe(true)
  })

  it('keeps loading active when an older action finishes after a newer action starts', async () : Promise<void> => {
    const firstAppend: { promise: Promise<void>; resolve: (value: void) => void; reject: (reason?: unknown) => void; } = deferred<void>()
    const secondAppend: { promise: Promise<void>; resolve: (value: void) => void; reject: (reason?: unknown) => void; } = deferred<void>()
    vi.mocked(dashboardApi.appendCandidateItem)
      .mockReturnValueOnce(firstAppend.promise as never)
      .mockReturnValueOnce(secondAppend.promise as never)
    const { hook }: { args: HookArgs; hook: { readonly current: { loading: boolean; listOpen: boolean; stashes: CandidateStashPickerOption[]; selectedCandidate: CandidateStashPickerOption | null; companyScopeBlocked: boolean; companyScopeBlockReason: string; nameInput: string; noteInput: string; setNameInput: React.Dispatch<React.SetStateAction<string>>; setNoteInput: React.Dispatch<React.SetStateAction<string>>; setListOpen: React.Dispatch<React.SetStateAction<boolean>>; createCandidate: () => Promise<boolean>; confirmOrder: () => Promise<boolean>; refresh: () => Promise<CandidateStashSummary[] | null>; openPicker: () => Promise<void>; confirmCandidateItem: () => Promise<boolean>; unconfirmCandidateItem: () => Promise<boolean>; selectCandidate: (row: CandidateStashPickerOption) => void; }; rerender(nextArgs: HookArgs): void; }; } = setup()

    act(() : void => {
      hook.current.selectCandidate({
        uuid: 'stash-1',
        name: 'selected stash',
        note: '',
        dbCreatedAt: '2026-05-22T00:00:00.000Z',
      })
    })

    let firstPromise!: Promise<boolean>
    let secondPromise!: Promise<boolean>
    act(() : void => {
      firstPromise = hook.current.confirmOrder()
    })
    act(() : void => {
      secondPromise = hook.current.confirmOrder()
    })

    let firstResult: boolean = true
    await act(async () : Promise<void> => {
      firstAppend.resolve()
      firstResult = await firstPromise
    })

    expect(firstResult).toBe(false)
    expect(hook.current.loading).toBe(true)

    let secondResult: boolean = false
    await act(async () : Promise<void> => {
      secondAppend.resolve()
      secondResult = await secondPromise
    })

    expect(secondResult).toBe(true)
    expect(hook.current.loading).toBe(false)
  })

  it('does not apply a candidate item confirmation result after the company changes', async () : Promise<void> => {
    const updateResult: { promise: Promise<{ uuid: string; }>; resolve: (value: { uuid: string; }) => void; reject: (reason?: unknown) => void; } = deferred<{ uuid: string }>()
    const onConfirmed: Mock<(...args: unknown[]) => unknown> = vi.fn()
    const onSaved: Mock<(...args: unknown[]) => unknown> = vi.fn()
    vi.mocked(dashboardApi.updateCandidateItem).mockReturnValue(updateResult.promise as never)
    const { args, hook }: { args: HookArgs; hook: { readonly current: { loading: boolean; listOpen: boolean; stashes: CandidateStashPickerOption[]; selectedCandidate: CandidateStashPickerOption | null; companyScopeBlocked: boolean; companyScopeBlockReason: string; nameInput: string; noteInput: string; setNameInput: React.Dispatch<React.SetStateAction<string>>; setNoteInput: React.Dispatch<React.SetStateAction<string>>; setListOpen: React.Dispatch<React.SetStateAction<boolean>>; createCandidate: () => Promise<boolean>; confirmOrder: () => Promise<boolean>; refresh: () => Promise<CandidateStashSummary[] | null>; openPicker: () => Promise<void>; confirmCandidateItem: () => Promise<boolean>; unconfirmCandidateItem: () => Promise<boolean>; selectCandidate: (row: CandidateStashPickerOption) => void; }; rerender(nextArgs: HookArgs): void; }; } = setup({
      candidateItemContext: {
        itemUuid: 'item-1',
        onConfirmed,
        onSaved,
      } as never,
    })

    let confirmPromise!: Promise<boolean>
    act(() : void => {
      confirmPromise = hook.current.confirmCandidateItem()
    })

    hook.rerender({ ...args, companyUuid: 'company-2' })

    let result: boolean = true
    await act(async () : Promise<void> => {
      updateResult.resolve({ uuid: 'item-1' })
      result = await confirmPromise
    })

    expect(result).toBe(false)
    expect(onConfirmed).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
    expect(vi.mocked(args.showToast).mock.calls.some(([message]: [message: string, options?: ToastOptions | undefined]) : boolean => message === '상세확정했습니다.')).toBe(false)
  })

  it('does not apply a candidate item confirmation result after the period changes', async () : Promise<void> => {
    const updateResult: { promise: Promise<{ uuid: string; }>; resolve: (value: { uuid: string; }) => void; reject: (reason?: unknown) => void; } = deferred<{ uuid: string }>()
    const onConfirmed: Mock<(...args: unknown[]) => unknown> = vi.fn()
    const onSaved: Mock<(...args: unknown[]) => unknown> = vi.fn()
    vi.mocked(dashboardApi.updateCandidateItem).mockReturnValue(updateResult.promise as never)
    const { args, hook }: { args: HookArgs; hook: { readonly current: { loading: boolean; listOpen: boolean; stashes: CandidateStashPickerOption[]; selectedCandidate: CandidateStashPickerOption | null; companyScopeBlocked: boolean; companyScopeBlockReason: string; nameInput: string; noteInput: string; setNameInput: React.Dispatch<React.SetStateAction<string>>; setNoteInput: React.Dispatch<React.SetStateAction<string>>; setListOpen: React.Dispatch<React.SetStateAction<boolean>>; createCandidate: () => Promise<boolean>; confirmOrder: () => Promise<boolean>; refresh: () => Promise<CandidateStashSummary[] | null>; openPicker: () => Promise<void>; confirmCandidateItem: () => Promise<boolean>; unconfirmCandidateItem: () => Promise<boolean>; selectCandidate: (row: CandidateStashPickerOption) => void; }; rerender(nextArgs: HookArgs): void; }; } = setup({
      candidateItemContext: {
        itemUuid: 'item-1',
        onConfirmed,
        onSaved,
      } as never,
    })

    let confirmPromise!: Promise<boolean>
    act(() : void => {
      confirmPromise = hook.current.confirmCandidateItem()
    })

    hook.rerender({ ...args, periodStart: '2026-06-01', periodEnd: '2026-06-30' })

    let result: boolean = true
    await act(async () : Promise<void> => {
      updateResult.resolve({ uuid: 'item-1' })
      result = await confirmPromise
    })

    expect(result).toBe(false)
    expect(onConfirmed).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('does not apply append result after the selected candidate changes', async () : Promise<void> => {
    const appendResult: { promise: Promise<void>; resolve: (value: void) => void; reject: (reason?: unknown) => void; } = deferred<void>()
    vi.mocked(dashboardApi.appendCandidateItem).mockReturnValue(appendResult.promise as never)
    const { args, hook }: { args: HookArgs; hook: { readonly current: { loading: boolean; listOpen: boolean; stashes: CandidateStashPickerOption[]; selectedCandidate: CandidateStashPickerOption | null; companyScopeBlocked: boolean; companyScopeBlockReason: string; nameInput: string; noteInput: string; setNameInput: React.Dispatch<React.SetStateAction<string>>; setNoteInput: React.Dispatch<React.SetStateAction<string>>; setListOpen: React.Dispatch<React.SetStateAction<boolean>>; createCandidate: () => Promise<boolean>; confirmOrder: () => Promise<boolean>; refresh: () => Promise<CandidateStashSummary[] | null>; openPicker: () => Promise<void>; confirmCandidateItem: () => Promise<boolean>; unconfirmCandidateItem: () => Promise<boolean>; selectCandidate: (row: CandidateStashPickerOption) => void; }; rerender(nextArgs: HookArgs): void; }; } = setup()

    act(() : void => {
      hook.current.selectCandidate({
        uuid: 'stash-1',
        name: 'first stash',
        note: '',
        dbCreatedAt: '2026-05-22T00:00:00.000Z',
      })
    })

    let appendPromise!: Promise<boolean>
    act(() : void => {
      appendPromise = hook.current.confirmOrder()
    })

    act(() : void => {
      hook.current.selectCandidate({
        uuid: 'stash-2',
        name: 'second stash',
        note: '',
        dbCreatedAt: '2026-05-22T00:00:00.000Z',
      })
    })

    let result: boolean = true
    await act(async () : Promise<void> => {
      appendResult.resolve()
      result = await appendPromise
    })

    expect(result).toBe(false)
    expect(hook.current.selectedCandidate?.uuid).toBe('stash-2')
    expect(vi.mocked(args.showToast).mock.calls.some(([message]: [message: string, options?: ToastOptions | undefined]) : boolean => message === '후보군에 아이템을 저장했습니다.')).toBe(false)
  })

  it('does not apply a confirmation result after the snapshot mutation input changes', async () : Promise<void> => {
    const updateResult: { promise: Promise<{ uuid: string; }>; resolve: (value: { uuid: string; }) => void; reject: (reason?: unknown) => void; } = deferred<{ uuid: string }>()
    const onConfirmed: Mock<(...args: unknown[]) => unknown> = vi.fn()
    const onSaved: Mock<(...args: unknown[]) => unknown> = vi.fn()
    vi.mocked(dashboardApi.updateCandidateItem).mockReturnValue(updateResult.promise as never)
    const { args, hook }: { args: HookArgs; hook: { readonly current: { loading: boolean; listOpen: boolean; stashes: CandidateStashPickerOption[]; selectedCandidate: CandidateStashPickerOption | null; companyScopeBlocked: boolean; companyScopeBlockReason: string; nameInput: string; noteInput: string; setNameInput: React.Dispatch<React.SetStateAction<string>>; setNoteInput: React.Dispatch<React.SetStateAction<string>>; setListOpen: React.Dispatch<React.SetStateAction<boolean>>; createCandidate: () => Promise<boolean>; confirmOrder: () => Promise<boolean>; refresh: () => Promise<CandidateStashSummary[] | null>; openPicker: () => Promise<void>; confirmCandidateItem: () => Promise<boolean>; unconfirmCandidateItem: () => Promise<boolean>; selectCandidate: (row: CandidateStashPickerOption) => void; }; rerender(nextArgs: HookArgs): void; }; } = setup({
      candidateItemContext: {
        itemUuid: 'item-1',
        onConfirmed,
        onSaved,
      } as never,
      buildSnapshot: vi.fn(() : never => makeSnapshot() as never),
    })

    let confirmPromise!: Promise<boolean>
    act(() : void => {
      confirmPromise = hook.current.confirmCandidateItem()
    })

    hook.rerender({
      ...args,
      buildSnapshot: vi.fn(() : never => makeSnapshot({
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

    let result: boolean = true
    await act(async () : Promise<void> => {
      updateResult.resolve({ uuid: 'item-1' })
      result = await confirmPromise
    })

    expect(result).toBe(false)
    expect(onConfirmed).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('does not select a created candidate when the sku group changes before refresh completes', async () : Promise<void> => {
    const createResult: { promise: Promise<{ uuid: string; }>; resolve: (value: { uuid: string; }) => void; reject: (reason?: unknown) => void; } = deferred<{ uuid: string }>()
    const refreshResult: { promise: Promise<CandidateStashPickerOption[]>; resolve: (value: CandidateStashPickerOption[]) => void; reject: (reason?: unknown) => void; } = deferred<CandidateStashPickerOption[]>()
    vi.mocked(dashboardApi.createCandidateStash).mockReturnValue(createResult.promise as never)
    vi.mocked(dashboardApi.getCandidateStashes).mockReturnValue(refreshResult.promise as never)
    const { args, hook }: { args: HookArgs; hook: { readonly current: { loading: boolean; listOpen: boolean; stashes: CandidateStashPickerOption[]; selectedCandidate: CandidateStashPickerOption | null; companyScopeBlocked: boolean; companyScopeBlockReason: string; nameInput: string; noteInput: string; setNameInput: React.Dispatch<React.SetStateAction<string>>; setNoteInput: React.Dispatch<React.SetStateAction<string>>; setListOpen: React.Dispatch<React.SetStateAction<boolean>>; createCandidate: () => Promise<boolean>; confirmOrder: () => Promise<boolean>; refresh: () => Promise<CandidateStashSummary[] | null>; openPicker: () => Promise<void>; confirmCandidateItem: () => Promise<boolean>; unconfirmCandidateItem: () => Promise<boolean>; selectCandidate: (row: CandidateStashPickerOption) => void; }; rerender(nextArgs: HookArgs): void; }; } = setup()

    act(() : void => {
      hook.current.setNameInput('new stash')
    })

    let createPromise!: Promise<boolean>
    act(() : void => {
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
    let result: boolean = true
    await act(async () : Promise<void> => {
      result = await createPromise
    })

    expect(result).toBe(false)
    expect(hook.current.selectedCandidate).toBeNull()
    expect(vi.mocked(args.showToast).mock.calls.some(([message]: [message: string, options?: ToastOptions | undefined]) : boolean => message === '후보군을 생성했습니다.')).toBe(false)
  })
})
