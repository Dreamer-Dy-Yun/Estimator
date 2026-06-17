// @vitest-environment jsdom
import type { OrderSnapshotComparisonSubject, OrderSnapshotDocument } from '../../../../../snapshot/orderSnapshotTypes'
import type { SecondaryAiCommentView } from '../model/secondaryAiCommentModel'
import type { SecondaryConfirmedRound } from '../model/secondaryConfirmedRoundModel'
import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSecondaryDrawerSnapshotController, type SnapshotControllerArgs } from './useSecondaryDrawerSnapshotController'

type ControllerResult = ReturnType<typeof useSecondaryDrawerSnapshotController>

const COMPARISON_SUBJECT: OrderSnapshotComparisonSubject = {
  id: 'channel-a',
  kind: 'competitor-channel',
  label: 'Channel A',
  role: 'comparison',
  sourceId: 'channel-a',
}

const AI_COMMENT: SecondaryAiCommentView = {
  answer: 'saved answer',
  generatedAt: '2026-06-10T00:00:00.000Z',
  prompt: 'saved prompt',
}

const SAVED_ROUNDS: SecondaryConfirmedRound[] = [{
  date: '2026-07-01',
  qtyBySize: { M: 12 },
}]

const SNAPSHOT: OrderSnapshotDocument = ({
  context: {
    dailyTrendLeadTimeDays: 30,
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
      rounds: SAVED_ROUNDS,
    },
    selfWeightPct: 60,
    sizeOrders: [],
    stockOrderRequest: {
      currentOrderInboundDueDate: '2026-07-01',
      dailyMeanOverride: 11,
      leadTimeDays: 30,
      nextOrderInboundDueDate: '2026-08-01',
    },
    stockOrderResult: {
      dailyMean: 12,
    } as OrderSnapshotDocument['drawer2']['stockOrderResult'],
    unitEconomics: {
      expectedFeeRatePct: 13,
      unitCost: 1000,
      unitPrice: 2000,
    },
  },
  savedAt: '2026-06-10T00:00:00.000Z',
  schemaVersion: 4,
  skuGroupKey: 'sku-a',
}) as unknown as OrderSnapshotDocument

let root: Root | null = null
let container: HTMLDivElement | null = null
let latest: ControllerResult | null = null

function createArgs(overrides: Partial<SnapshotControllerArgs> = {}): SnapshotControllerArgs {
  return {
    candidateItemContext: { hydrateSnapshotSource: 'confirmed' } as SnapshotControllerArgs['candidateItemContext'],
    defaultInboundDueDates: { end: '2026-08-01', start: '2026-07-01' },
    minOrderDate: '2026-07-01',
    onComparisonSubjectChange: vi.fn(),
    prefillFromSnapshot: SNAPSHOT,
    primaryPrice: 2000,
    primarySkuGroupKey: 'sku-a',
    resetInboundDueDatesToLive: vi.fn(),
    setAiComment: vi.fn(),
    setCurrentOrderInboundDueDate: vi.fn(),
    setNextOrderInboundDueDate: vi.fn(),
    ...overrides,
  }
}

function Probe({ args, onValue }: { args: SnapshotControllerArgs; onValue: (value: ControllerResult) => void }): null {
  const value: ControllerResult = useSecondaryDrawerSnapshotController(args)
  useEffect((): void => {
    onValue(value)
  }, [onValue, value])
  return null
}

function renderProbe(args: SnapshotControllerArgs): void {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act((): void => {
    root?.render(<Probe args={args} onValue={(value: ControllerResult): void => {
      latest = value
    }} />)
  })
}

async function flushMicrotasks(): Promise<void> {
  await act(async (): Promise<void> => {
    await Promise.resolve()
  })
}

afterEach((): void => {
  act((): void => {
    root?.unmount()
  })
  root = null
  container?.remove()
  container = null
  latest = null
  document.body.innerHTML = ''
})

describe('useSecondaryDrawerSnapshotController', (): void => {
  it('keeps the confirmed snapshot baseline when only confirmed quantities change', async (): Promise<void> => {
    renderProbe(createArgs())
    await flushMicrotasks()

    expect(latest?.snapshotConfirmBaselineActive).toBe(true)
    expect(latest?.confirmedBaselineDraftDirty).toBe(false)

    act((): void => {
      latest?.setConfirmBySize({ M: 3 })
    })
    expect(latest?.confirmedBaselineDraftDirty).toBe(false)

    act((): void => {
      latest?.setConfirmedRounds([{ date: '2026-07-01', qtyBySize: { M: 3 } }])
    })
    expect(latest?.confirmedBaselineDraftDirty).toBe(false)
  })

  it('marks the confirmed snapshot baseline dirty when calculation inputs change', async (): Promise<void> => {
    renderProbe(createArgs())
    await flushMicrotasks()

    act((): void => {
      latest?.setBufferStock(9)
    })

    expect(latest?.confirmedBaselineDraftDirty).toBe(true)
  })
})
