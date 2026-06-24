// @vitest-environment jsdom
import type { SecondaryInboundSplitSource } from '../../../../../api/types'
import type { SecondaryConfirmedRound } from '../model/secondaryConfirmedRoundModel'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { SecondarySizeOrderDisplayRow } from '../model/secondarySizeOrderRows'
import type { InboundSplitScheduleRow } from './inboundSplitScheduleModel'
import { useInboundSplitScheduleController, type UseInboundSplitScheduleControllerArgs, type UseInboundSplitScheduleControllerResult } from './useInboundSplitScheduleController'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const SIZE_ROWS: SecondarySizeOrderDisplayRow[] = [
  { size: 'S', baseSharePct: 50, comparisonSharePct: 50, blendedSharePct: 50, forecastQty: 10, recommendedQty: 10, confirmQty: 10 },
  { size: 'M', baseSharePct: 50, comparisonSharePct: 50, blendedSharePct: 50, forecastQty: 5, recommendedQty: 5, confirmQty: 5 },
]

const SPLIT_SOURCE: SecondaryInboundSplitSource = {
  total: {
    suggestion: 8,
    sales: {
      '2026-04-01': 2,
      '2026-04-02': 2,
      '2026-04-03': 2,
      '2026-04-04': 2,
    },
  },
  sizeInfo: {
    S: { salesRate: 0.5, baseStock: 0 },
    M: { salesRate: 0.5, baseStock: 0 },
  },
  expectation: { S: [], M: [] },
  confirmed: { total_phase: 0, data: [] },
}

function row(id: string, round: number, inboundDate: string, s: number, m?: number): InboundSplitScheduleRow {
  return {
    id,
    round,
    inboundDate,
    ignoreExistingOrderInbound: false,
    suggestedQuantitiesBySize: { S: s, ...(m == null ? {} : { M: m }) },
    quantitiesBySize: { S: s, ...(m == null ? {} : { M: m }) },
  }
}

let root: Root | null = null
let container: HTMLDivElement | null = null

function Probe({
  args,
  onRender,
}: {
  args: UseInboundSplitScheduleControllerArgs
  onRender: (result: UseInboundSplitScheduleControllerResult) => void
}): null {
  const result: UseInboundSplitScheduleControllerResult = useInboundSplitScheduleController(args)
  onRender(result)
  return null
}

function renderController(overrides: Partial<UseInboundSplitScheduleControllerArgs> = {}): {
  readonly current: UseInboundSplitScheduleControllerResult
  args: UseInboundSplitScheduleControllerArgs
  rerender: (nextOverrides: Partial<UseInboundSplitScheduleControllerArgs>) => void
} {
  const state: { current: UseInboundSplitScheduleControllerResult | null; args: UseInboundSplitScheduleControllerArgs } = {
    current: null,
    args: {
      sizeRows: SIZE_ROWS,
      stockOrderDisplay: null,
      currentOrderInboundDueDate: '2026-04-01',
      nextOrderInboundDueDate: '2026-04-05',
      calculationBaseDate: '2026-03-30',
      inboundSplitSource: SPLIT_SOURCE,
      inboundSplitSourceLoading: false,
      inboundSplitSourceError: null,
      calculationReady: true,
      confirmedRounds: [],
      onConfirmQtyChange: vi.fn(),
      onConfirmedRoundsChange: vi.fn(),
      ...overrides,
    },
  }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const render: () => void = (): void => {
    act((): void => {
      root?.render(<Probe args={state.args} onRender={(result: UseInboundSplitScheduleControllerResult): void => {
        state.current = result
      }} />)
    })
  }
  render()
  return {
    get current(): UseInboundSplitScheduleControllerResult {
      if (state.current == null) throw new Error('controller result is not rendered')
      return state.current
    },
    args: state.args,
    rerender: (nextOverrides: Partial<UseInboundSplitScheduleControllerArgs>): void => {
      state.args = { ...state.args, ...nextOverrides }
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
})

describe('useInboundSplitScheduleController', (): void => {
  it('blocks open and apply until stock-order calculation is ready', (): void => {
    const controller: ReturnType<typeof renderController> = renderController({ calculationReady: false })

    expect(controller.current.scheduleReady).toBe(false)
    act((): void => {
      controller.current.openDialog()
      controller.current.dialogProps.onApply([row('r1', 1, '2026-04-01', 10, 5)])
    })

    expect(controller.current.dialogOpen).toBe(false)
    expect(controller.args.onConfirmQtyChange).not.toHaveBeenCalled()
    expect(controller.args.onConfirmedRoundsChange).not.toHaveBeenCalled()
  })

  it('closes and remounts the dialog when readiness drops', async (): Promise<void> => {
    const controller: ReturnType<typeof renderController> = renderController()

    act((): void => {
      controller.current.openDialog()
    })
    expect(controller.current.dialogOpen).toBe(true)
    const openedKey: number = controller.current.dialogKey

    controller.rerender({ calculationReady: false })
    await act(async (): Promise<void> => {
      await new Promise((resolve: (value: void) => void): number => window.setTimeout(resolve, 0))
    })

    expect(controller.current.dialogOpen).toBe(false)
    expect(controller.current.dialogKey).toBe(openedKey + 1)
  })

  it('applies multi-round rows as confirmed rounds and synced size totals', (): void => {
    const controller: ReturnType<typeof renderController> = renderController()
    const rows: InboundSplitScheduleRow[] = [
      row('r1', 1, '2026-04-01', 3, 2),
      row('r2', 2, '2026-04-04', 4, 3),
    ]

    act((): void => {
      controller.current.dialogProps.onApply(rows)
    })

    expect(controller.args.onConfirmedRoundsChange).toHaveBeenCalledWith([
      { date: '2026-04-01', ignoreExistingOrderInbound: false, qtyBySize: { S: 3, M: 2 } },
      { date: '2026-04-04', ignoreExistingOrderInbound: false, qtyBySize: { S: 4, M: 3 } },
    ] satisfies SecondaryConfirmedRound[])
    expect(controller.args.onConfirmQtyChange).toHaveBeenNthCalledWith(1, 'S', 7, 10)
    expect(controller.args.onConfirmQtyChange).toHaveBeenNthCalledWith(2, 'M', 5, 5)
  })

  it('rejects non-increasing rows even when apply is called directly', (): void => {
    const controller: ReturnType<typeof renderController> = renderController()

    act((): void => {
      controller.current.dialogProps.onApply([
        row('r1', 1, '2026-04-01', 3, 2),
        row('r2', 2, '2026-04-01', 4, 3),
      ])
    })

    expect(controller.args.onConfirmedRoundsChange).not.toHaveBeenCalled()
    expect(controller.args.onConfirmQtyChange).not.toHaveBeenCalled()
    expect(controller.current.visibleError?.request).toBe('validateInboundSplitScheduleRows')
  })

  it('collapses a one-round schedule to direct quantities without preserving missing stale size values', (): void => {
    const onConfirmQtyChange: Mock<(size: string, next: number, recommendedQty: number) => void> = vi.fn()
    const controller: ReturnType<typeof renderController> = renderController({ onConfirmQtyChange })

    act((): void => {
      controller.current.dialogProps.onApply([row('r1', 1, '2026-04-01', 4)])
    })

    expect(controller.args.onConfirmedRoundsChange).toHaveBeenCalledWith([])
    expect(onConfirmQtyChange).toHaveBeenNthCalledWith(1, 'S', 4, 10)
    expect(onConfirmQtyChange).toHaveBeenNthCalledWith(2, 'M', 0, 5)
  })
})
