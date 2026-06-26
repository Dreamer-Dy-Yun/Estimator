import type { OrderSnapshotComparisonSubject, OrderSnapshotDocument } from '../../../../../snapshot/orderSnapshotTypes'
import type { SecondaryAiCommentView } from '../model/secondaryAiCommentModel'
// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { useSecondarySnapshotPrefill, type Args } from './useSecondarySnapshotPrefill'

const COMPARISON_SUBJECT: OrderSnapshotComparisonSubject = {
  id: 'channel-a',
  kind: 'competitor-channel',
  label: 'Channel A',
  role: 'comparison',
  sourceId: 'channel-a',
}

const AI_COMMENT: SecondaryAiCommentView = {
  answer: 'snapshot answer',
  generatedAt: '2026-06-10T00:00:00.000Z',
  prompt: 'snapshot prompt',
}

const SNAPSHOT: OrderSnapshotDocument = ({
  context: {
    dailyTrendForecastDays: 30,
    dailyTrendStartMonth: '2026-01',
    forecastMonths: 12,
    periodEnd: '2026-12-31',
    periodStart: '2026-01-01',
  },
  drawer1: {
    summary: {} as OrderSnapshotDocument['drawer1']['summary'],
  },
  drawer2: {
    aiComment: AI_COMMENT,
    baseSubject: {
      kind: 'self-company',
      role: 'base',
      sourceId: 'company-1',
    },
    bufferStock: 7,
    comparisonBasis: {} as OrderSnapshotDocument['drawer2']['comparisonBasis'],
    comparisonSubject: COMPARISON_SUBJECT,
    confirmed: {
      rounds: [{
        date: '2026-07-01',
        excludeSegmentExistingOrderInbound: false,
        qtyBySize: {},
      }],
    },
    selfWeightPct: 60,
    sizeOrders: [],
    stockOrderRequest: {
      currentOrderInboundDueDate: '2026-07-01',
      dailyMeanOverride: 11,
      orderCoverageDays: 30,
      nextOrderInboundDueDate: '2026-08-01',
    },
    stockOrderResult: {
      productIdentity: {
        productUuid: null,
        skuGroupKey: 'sku-a',
        brand: 'Brand',
        code: 'CODE',
        colorCode: 'BLK',
      },
      inboundSplitSource: {
        total: { suggestion: 0, sales: {} },
        sizeInfo: {},
        expectation: {},
        confirmed: { total_phase: 0, data: [] },
      },
      existingOrderInboundSupplyBySize: {},
      trendDailyMean: 12,
      dailyMean: 12,
      sigma: 0,
      display: {
        currentStockQtyTotal: 0,
        totalOrderBalanceTotal: 0,
        expectedInboundOrderBalanceTotal: 0,
        sizeRows: [],
      },
    },
    unitEconomics: {
      expectedFeeRatePct: 13,
      unitCost: 1000,
      unitPrice: 2000,
    },
  },
  savedAt: '2026-06-10T00:00:00.000Z',
  schemaVersion: 7,
  skuGroupKey: 'sku-a',
}) as unknown as OrderSnapshotDocument

let root: Root | null = null
let container: HTMLDivElement | null = null

function createArgs(overrides: Partial<Args> = {}) : Args {
  return {
    appliedPrefillKey: null,
    candidateItemContext: { hydrateSnapshotSource: 'confirmed' } as Args['candidateItemContext'],
    defaultInboundDueDates: { end: '2026-08-01', start: '2026-07-01' },
    minOrderDate: '2026-07-01',
    onComparisonSubjectChange: vi.fn(),
    prefillFromSnapshot: SNAPSHOT,
    prefillKey: 'item-1|2026-06-10T00:00:00.000Z|2026-01-01|2026-12-31',
    setAiComment: vi.fn(),
    setAppliedPrefillKey: vi.fn(),
    setBufferStock: vi.fn(),
    setConfirmBySize: vi.fn(),
    setConfirmedRounds: vi.fn(),
    setCurrentOrderInboundDueDate: vi.fn(),
    setDailyMeanClient: vi.fn(),
    setExpectedFeeRatePct: vi.fn(),
    setNextOrderInboundDueDate: vi.fn(),
    setSelfWeightPct: vi.fn(),
    setSnapshotConfirmBaselineActive: vi.fn(),
    setUnitCostInput: vi.fn(),
    setUnitPriceInput: vi.fn(),
    ...overrides,
  }
}

function Probe({ args }: { args: Args }) : null {
  useSecondarySnapshotPrefill(args)
  return null
}

function renderProbe(args: Args) : void {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() : void => {
    root?.render(<Probe args={args} />)
  })
}

function rerenderProbe(args: Args) : void {
  act(() : void => {
    root?.render(<Probe args={args} />)
  })
}

async function flushMicrotasks() : Promise<void> {
  await act(async () : Promise<void> => {
    await Promise.resolve()
  })
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

describe('useSecondarySnapshotPrefill', () : void => {
  it('does not apply the same snapshot prefill again after the prefill key is marked applied', async () : Promise<void> => {
    const firstComparisonSetter: Mock<(next: OrderSnapshotComparisonSubject) => void> = vi.fn()
    const secondComparisonSetter: Mock<(next: OrderSnapshotComparisonSubject) => void> = vi.fn()
    const setBufferStock: Mock<(value: number) => void> = vi.fn()
    const setAppliedPrefillKey: Mock<(value: string | null) => void> = vi.fn()
    const args: Args = createArgs({
      onComparisonSubjectChange: firstComparisonSetter,
      setAppliedPrefillKey,
      setBufferStock,
    })

    renderProbe(args)
    await flushMicrotasks()

    expect(firstComparisonSetter).toHaveBeenCalledTimes(1)
    expect(firstComparisonSetter).toHaveBeenCalledWith(COMPARISON_SUBJECT)
    expect(setBufferStock).toHaveBeenCalledTimes(1)
    expect(setAppliedPrefillKey).toHaveBeenCalledWith(args.prefillKey)

    rerenderProbe({
      ...args,
      appliedPrefillKey: args.prefillKey,
      onComparisonSubjectChange: secondComparisonSetter,
    })
    await flushMicrotasks()

    expect(secondComparisonSetter).not.toHaveBeenCalled()
    expect(setBufferStock).toHaveBeenCalledTimes(1)
    expect(setAppliedPrefillKey).toHaveBeenCalledTimes(1)
  })

  it('updates the confirmed baseline flag when only the snapshot source changes', async () : Promise<void> => {
    const onComparisonSubjectChange: Mock<(next: OrderSnapshotComparisonSubject) => void> = vi.fn()
    const setSnapshotConfirmBaselineActive: Mock<(value: boolean) => void> = vi.fn()
    const setBufferStock: Mock<(value: number) => void> = vi.fn()
    const prefillKey: string = 'item-1|2026-06-10T00:00:00.000Z|2026-01-01|2026-12-31'
    const args: Args = createArgs({
      appliedPrefillKey: prefillKey,
      candidateItemContext: { hydrateSnapshotSource: 'confirmed' } as Args['candidateItemContext'],
      onComparisonSubjectChange,
      prefillKey,
      setBufferStock,
      setSnapshotConfirmBaselineActive,
    })

    renderProbe(args)
    await flushMicrotasks()

    expect(setSnapshotConfirmBaselineActive).toHaveBeenCalledWith(true)
    expect(onComparisonSubjectChange).not.toHaveBeenCalled()
    expect(setBufferStock).not.toHaveBeenCalled()

    rerenderProbe({
      ...args,
      candidateItemContext: { hydrateSnapshotSource: 'live' } as Args['candidateItemContext'],
    })
    await flushMicrotasks()

    expect(setSnapshotConfirmBaselineActive).toHaveBeenLastCalledWith(false)
    expect(onComparisonSubjectChange).not.toHaveBeenCalled()
    expect(setBufferStock).not.toHaveBeenCalled()
  })
})
