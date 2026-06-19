// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { InboundSplitScheduleRow, InboundSplitSizeColumn } from './inboundSplitScheduleModel'
import type { InboundSplitDraftRequest } from './inboundSplitScheduleTypes'
import { useInboundSplitScheduleDraft, type UseInboundSplitScheduleDraftArgs, type UseInboundSplitScheduleDraftResult } from './useInboundSplitScheduleDraft'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const COLUMNS: InboundSplitSizeColumn[] = [
  { size: 'S', confirmedQty: 2, recommendedQty: 2 },
  { size: 'M', confirmedQty: 6, recommendedQty: 6 },
]

function row(id: string, round: number, inboundDate: string, s: number, m: number): InboundSplitScheduleRow {
  return {
    id,
    round,
    inboundDate,
    ignoreExistingOrderInbound: false,
    suggestedQuantitiesBySize: { S: s, M: m },
    suggestionBasisBySize: {},
    quantitiesBySize: { S: s, M: m },
  }
}

const INITIAL_ROWS: InboundSplitScheduleRow[] = [
  row('r1', 1, '2026-04-01', 2, 6),
]

let root: Root | null = null
let container: HTMLDivElement | null = null

function Probe({ args, onRender }: { args: UseInboundSplitScheduleDraftArgs; onRender: (result: UseInboundSplitScheduleDraftResult) => void }): null {
  const result: UseInboundSplitScheduleDraftResult = useInboundSplitScheduleDraft(args)
  onRender(result)
  return null
}

function renderDraft(overrides: Partial<UseInboundSplitScheduleDraftArgs> = {}): {
  readonly current: UseInboundSplitScheduleDraftResult
  onDraftError: Mock<(err: unknown | null, request: InboundSplitDraftRequest) => void>
} {
  const state: { current: UseInboundSplitScheduleDraftResult | null } = { current: null }
  const onDraftError: Mock<(err: unknown | null, request: InboundSplitDraftRequest) => void> = vi.fn()
  const args: UseInboundSplitScheduleDraftArgs = {
    initialCount: 1,
    initialRows: INITIAL_ROWS,
    columns: COLUMNS,
    buildRowsForCount: vi.fn((next: number): InboundSplitScheduleRow[] => (
      Array.from({ length: next }, (_: unknown, index: number): InboundSplitScheduleRow => row(`r${index + 1}`, index + 1, '2026-04-01', 1, 1))
    )),
    recalculateRows: vi.fn((rows: InboundSplitScheduleRow[]): InboundSplitScheduleRow[] => rows),
    onDraftError,
    ...overrides,
  }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act((): void => {
    root?.render(<Probe args={args} onRender={(result: UseInboundSplitScheduleDraftResult): void => {
      state.current = result
    }} />)
  })
  return {
    get current(): UseInboundSplitScheduleDraftResult {
      if (state.current == null) throw new Error('draft result is not rendered')
      return state.current
    },
    onDraftError,
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

describe('useInboundSplitScheduleDraft', (): void => {
  it('redistributes row totals by suggested size weights', (): void => {
    const draft: ReturnType<typeof renderDraft> = renderDraft()

    act((): void => {
      draft.current.changeRowTotal(0, '8')
    })

    const firstRow: InboundSplitScheduleRow | undefined = draft.current.rows[0]
    expect(firstRow?.quantitiesBySize).toEqual({ S: 2, M: 6 })
    expect((firstRow?.quantitiesBySize.S ?? 0) + (firstRow?.quantitiesBySize.M ?? 0)).toBe(8)
  })

  it('uses whole-schedule suggested size totals when editing one row total', (): void => {
    const draft: ReturnType<typeof renderDraft> = renderDraft({
      initialRows: [
        row('r1', 1, '2026-04-01', 10, 0),
        row('r2', 2, '2026-04-04', 0, 10),
      ],
    })

    act((): void => {
      draft.current.changeRowTotal(0, '10')
    })

    expect(draft.current.rows[0]?.quantitiesBySize).toEqual({ S: 5, M: 5 })
    expect(draft.current.rows[1]?.quantitiesBySize).toEqual({ S: 0, M: 10 })
  })

  it('normalizes direct quantity edits as non-negative integers', (): void => {
    const draft: ReturnType<typeof renderDraft> = renderDraft()

    act((): void => {
      draft.current.changeQty(0, 'S', '2.6')
      draft.current.changeQty(0, 'M', '-4')
    })

    expect(draft.current.rows[0]?.quantitiesBySize).toEqual({ S: 3, M: 0 })
  })

  it('keeps current rows and reports an error when date recalculation fails', (): void => {
    const sourceError: Error = new Error('missing source cell')
    const draft: ReturnType<typeof renderDraft> = renderDraft({
      recalculateRows: vi.fn((): InboundSplitScheduleRow[] => {
        throw sourceError
      }),
    })

    act((): void => {
      draft.current.changeDate(0, '2026-04-03')
    })

    expect(draft.current.rows).toEqual(INITIAL_ROWS)
    expect(draft.onDraftError).toHaveBeenCalledWith(sourceError, 'recalculateInboundSplitScheduleRows')
  })

  it('clamps count changes through the count builder', (): void => {
    const draft: ReturnType<typeof renderDraft> = renderDraft()

    act((): void => {
      draft.current.changeCount('999')
    })

    expect(draft.current.count).toBe(10)
    expect(draft.current.rows).toHaveLength(10)
    expect(draft.onDraftError).toHaveBeenCalledWith(null, 'buildInboundSplitScheduleRows')
  })

  it('recalculates split suggestions when count changes with global ignore enabled', (): void => {
    const onRecalculateRows: Mock<(rows: InboundSplitScheduleRow[]) => InboundSplitScheduleRow[]> = vi.fn((rows: InboundSplitScheduleRow[]): InboundSplitScheduleRow[] => rows.map((row: InboundSplitScheduleRow, rowIndex: number): InboundSplitScheduleRow => ({
      ...row,
      suggestedQuantitiesBySize: {
        S: rowIndex + 10,
        M: rowIndex + 20,
      },
    })))
    const draft: ReturnType<typeof renderDraft> = renderDraft({
      initialRows: [row('r1', 1, '2026-04-01', 2, 6)],
      recalculateRows: onRecalculateRows,
      buildRowsForCount: vi.fn((next: number): InboundSplitScheduleRow[] => (
        Array.from({ length: next }, (_: unknown, index: number): InboundSplitScheduleRow => row(`r${index + 1}`, index + 1, '2026-04-01', 1, 1))
      )),
    })

    act((): void => {
      draft.current.changeIgnoreExistingOrderInboundAll(true)
    })
    act((): void => {
      draft.current.changeCount('2')
    })

    expect(draft.current.rows).toHaveLength(2)
    expect(onRecalculateRows).toHaveBeenCalled()
    expect(draft.current.rows.every((rowItem: InboundSplitScheduleRow): boolean => rowItem.ignoreExistingOrderInbound)).toBe(true)
    expect(draft.current.rows[0]?.suggestedQuantitiesBySize).toEqual({ S: 10, M: 20 })
    expect(draft.current.rows[1]?.suggestedQuantitiesBySize).toEqual({ S: 11, M: 21 })
  })

  it('synchronizes ignoreExistingOrderInbound across all rows when global toggle changes', (): void => {
    const draft: ReturnType<typeof renderDraft> = renderDraft({
      initialRows: [
        row('r1', 1, '2026-04-01', 2, 6),
        row('r2', 2, '2026-04-04', 1, 1),
      ],
    })

    act((): void => {
      draft.current.changeIgnoreExistingOrderInboundAll(true)
    })

    expect(draft.current.ignoreExistingOrderInboundAll).toBe(true)
    expect(draft.current.rows.every((row: InboundSplitScheduleRow): boolean => row.ignoreExistingOrderInbound)).toBe(true)
    expect(draft.onDraftError).toHaveBeenCalledWith(null, 'recalculateInboundSplitScheduleRows')

    act((): void => {
      draft.current.changeIgnoreExistingOrderInboundAll(false)
    })

    expect(draft.current.ignoreExistingOrderInboundAll).toBe(false)
    expect(draft.current.rows.every((row: InboundSplitScheduleRow): boolean => row.ignoreExistingOrderInbound)).toBe(false)
  })

  it('initializes the global ignore flag from initial rows when all rows are true', (): void => {
    const draft: ReturnType<typeof renderDraft> = renderDraft({
      initialRows: [
        { ...row('r1', 1, '2026-04-01', 2, 6), ignoreExistingOrderInbound: true },
        { ...row('r2', 2, '2026-04-04', 1, 1), ignoreExistingOrderInbound: true },
      ],
    })

    expect(draft.current.ignoreExistingOrderInboundAll).toBe(true)
  })

  it('does not enable the global ignore flag for an empty initial draft', (): void => {
    const draft: ReturnType<typeof renderDraft> = renderDraft({
      initialRows: [],
    })

    expect(draft.current.ignoreExistingOrderInboundAll).toBe(false)
  })
})
