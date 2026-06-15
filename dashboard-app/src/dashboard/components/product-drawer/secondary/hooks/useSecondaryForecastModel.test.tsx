// @vitest-environment jsdom
import type { SecondaryStockOrderCalcResult } from '../../../../../api'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'

const hookMocks = vi.hoisted((): {
  useSecondaryDrawerRequests: Mock<(...args: unknown[]) => unknown>
  useSecondaryOrderCalculations: Mock<(...args: unknown[]) => unknown>
  useSecondaryCandidateActions: Mock<(...args: unknown[]) => unknown>
} => ({
  useSecondaryDrawerRequests: vi.fn(),
  useSecondaryOrderCalculations: vi.fn(),
  useSecondaryCandidateActions: vi.fn(),
}))

vi.mock('./useSecondaryDrawerRequests', () => ({
  useSecondaryDrawerRequests: hookMocks.useSecondaryDrawerRequests,
}))

vi.mock('./useSecondaryOrderCalculations', () => ({
  useSecondaryOrderCalculations: hookMocks.useSecondaryOrderCalculations,
}))

vi.mock('./useSecondaryCandidateActions', () => ({
  useSecondaryCandidateActions: hookMocks.useSecondaryCandidateActions,
}))

import { useSecondaryForecastModel } from './useSecondaryForecastModel'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type HookArgs = Parameters<typeof useSecondaryForecastModel>[0]
type HookResult = ReturnType<typeof useSecondaryForecastModel>

const STOCK_ORDER_CALC: SecondaryStockOrderCalcResult = {
  trendDailyMean: 10,
  dailyMean: 10,
  sigma: 1,
  display: {
    currentStockQtyTotal: 1,
    totalOrderBalanceTotal: 2,
    expectedInboundOrderBalanceTotal: 3,
    sizeRows: [{ size: 'S', currentStockQty: 1, totalOrderBalance: 2, expectedInboundOrderBalance: 3 }],
  },
  safetyStockCalc: {
    safetyStock: 1,
    recommendedOrderQty: 2,
    expectedOrderAmount: 3,
    expectedSalesAmount: 4,
    expectedOpProfit: 5,
  },
  forecastQtyCalc: {
    safetyStock: null,
    recommendedOrderQty: 2,
    expectedOrderAmount: 3,
    expectedSalesAmount: 4,
    expectedOpProfit: 5,
  },
}

let root: Root | null = null
let container: HTMLDivElement | null = null

function createCandidateActions(): HookResult['candidateActions'] {
  return {
    loading: false,
    listOpen: false,
    stashes: [],
    selectedCandidate: null,
    companyScopeBlocked: false,
    companyScopeBlockReason: '',
    nameInput: '',
    noteInput: '',
    setNameInput: vi.fn(),
    setNoteInput: vi.fn(),
    setListOpen: vi.fn(),
    createCandidate: vi.fn(async (): Promise<boolean> => true),
    confirmOrder: vi.fn(async (): Promise<boolean> => true),
    refresh: vi.fn(async (): Promise<[]> => []),
    openPicker: vi.fn(async (): Promise<void> => {}),
    confirmCandidateItem: vi.fn(async (): Promise<boolean> => true),
    unconfirmCandidateItem: vi.fn(async (): Promise<boolean> => true),
    selectCandidate: vi.fn(),
  }
}

function setupMocks(): void {
  hookMocks.useSecondaryDrawerRequests.mockReturnValue({
    dailyTrend: {
      dailyTrendSeries: [],
      dailyTrendLoading: false,
      dailyTrendError: null,
      dailyPeriodShade: { x1: 0, x2: 0 },
      dailyForecastShade: null,
      dailyTickIndices: [],
    },
    inboundSplitSource: null,
    inboundSplitSourceLoading: false,
    inboundSplitSourceError: null,
    forecastCalc: STOCK_ORDER_CALC,
    forecastCalcError: null,
    forecastCalcLoading: false,
    selfCol: {},
    compCol: {},
    salesInsightError: null,
    salesInsightLoading: false,
  })
  hookMocks.useSecondaryOrderCalculations.mockReturnValue({
    stockOrderCalculationReady: true,
    stockOrderDisplayInputs: { trendDailyMean: 10, dailyMean: 10, sigma: 1 },
    sizeRows: [],
    manualConfirmDerived: {},
    dailyTrendSizeOptions: [],
  })
  hookMocks.useSecondaryCandidateActions.mockReturnValue(createCandidateActions())
}

function createArgs(overrides: Partial<HookArgs> = {}): HookArgs {
  return {
    primary: { skuGroupKey: 'sku-a', price: 1000 } as HookArgs['primary'],
    secondary: { sizeRows: [], comparisonRatioBySize: {} } as unknown as HookArgs['secondary'],
    pageName: 'test',
    periodStart: '2025-01-01',
    periodEnd: '2025-12-31',
    selectedStartMonth: '2025-01',
    selectedEndMonth: '2025-12',
    forecastMonths: 12,
    companyUuid: 'company-1',
    baseSubject: { role: 'base', kind: 'self-company', sourceId: 'company-1' },
    prefillFromSnapshot: null,
    candidateItemContext: null,
    comparisonTarget: { id: 'self', label: 'Self', role: 'comparison', kind: 'self-company', sourceId: 'company-1' },
    snapshotConfirmBySize: {},
    useSnapshotConfirmBaseline: false,
    dailyMeanClient: null,
    setDailyMeanClient: vi.fn(),
    currentOrderInboundDueDate: '2026-04-01',
    nextOrderInboundDueDate: '2026-05-01',
    leadTimeDays: 30,
    selfWeightPct: 50,
    bufferStock: 0,
    confirmBySize: {},
    setConfirmBySize: vi.fn(),
    confirmedRounds: [{ date: '2026-04-01', qtyBySize: { S: 3 } }],
    setConfirmedRounds: vi.fn(),
    unitPriceInput: 1000,
    unitCostInput: 700,
    expectedFeeRatePct: 10,
    aiComment: { prompt: '', answer: '', generatedAt: '' },
    hasSavedSnapshot: false,
    showToast: vi.fn(),
    ...overrides,
  }
}

function Probe({ args, onRender }: { args: HookArgs; onRender: (result: HookResult) => void }): null {
  const result: HookResult = useSecondaryForecastModel(args)
  onRender(result)
  return null
}

function renderModel(initialArgs: HookArgs): { rerender: (nextArgs: HookArgs) => void } {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  let currentArgs: HookArgs = initialArgs
  const render: () => void = (): void => {
    act((): void => {
      root?.render(<Probe args={currentArgs} onRender={(): void => {}} />)
    })
  }
  render()
  return {
    rerender: (nextArgs: HookArgs): void => {
      currentArgs = nextArgs
      render()
    },
  }
}

afterEach((): void => {
  act((): void => {
    root?.unmount()
  })
  root = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  hookMocks.useSecondaryDrawerRequests.mockReset()
  hookMocks.useSecondaryOrderCalculations.mockReset()
  hookMocks.useSecondaryCandidateActions.mockReset()
})

describe('useSecondaryForecastModel split confirmation scope', (): void => {
  it('clears split confirmed rounds when a live calculation input changes', (): void => {
    setupMocks()
    const args: HookArgs = createArgs()
    const view: { rerender: (nextArgs: HookArgs) => void } = renderModel(args)
    const setConfirmBySize: Mock = args.setConfirmBySize as Mock
    const setConfirmedRounds: Mock = args.setConfirmedRounds as Mock
    setConfirmBySize.mockClear()
    setConfirmedRounds.mockClear()

    view.rerender({ ...args, selfWeightPct: 70 })

    expect(setConfirmBySize).toHaveBeenCalledWith({})
    expect(setConfirmedRounds).toHaveBeenCalledWith([])
  })

  it('keeps split confirmed rounds while the saved snapshot baseline is active', (): void => {
    setupMocks()
    const args: HookArgs = createArgs({ useSnapshotConfirmBaseline: true })
    const view: { rerender: (nextArgs: HookArgs) => void } = renderModel(args)
    const setConfirmBySize: Mock = args.setConfirmBySize as Mock
    const setConfirmedRounds: Mock = args.setConfirmedRounds as Mock

    view.rerender({ ...args, selfWeightPct: 70 })

    expect(setConfirmBySize).not.toHaveBeenCalled()
    expect(setConfirmedRounds).not.toHaveBeenCalled()
  })
})
