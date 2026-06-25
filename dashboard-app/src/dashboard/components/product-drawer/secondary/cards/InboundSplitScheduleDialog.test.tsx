// @vitest-environment jsdom
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { KO } from '../../ko'
import { InboundSplitScheduleDialog, type InboundSplitDraftRequest } from './InboundSplitScheduleDialog'
import type { InboundSplitScheduleRow, InboundSplitSizeColumn } from './inboundSplitScheduleModel'
import type { SecondaryInboundSplitSource } from '../../../../../api/types/secondary'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const COLUMNS: InboundSplitSizeColumn[] = [
  { size: 'S', confirmedQty: 10, recommendedQty: 10 },
  { size: 'M', confirmedQty: 5, recommendedQty: 5 },
]

function row(
  id: string,
  round: number,
  inboundDate: string,
  suggestedS: number,
  suggestedM: number,
  confirmedS: number,
  confirmedM: number,
): InboundSplitScheduleRow {
  return {
    id,
    round,
    inboundDate,
    excludePeriodExistingOrderInbound: false,
    suggestedQuantitiesBySize: { S: suggestedS, M: suggestedM },
    suggestionBasisBySize: {},
    quantitiesBySize: { S: confirmedS, M: confirmedM },
  }
}

const INITIAL_ROWS: InboundSplitScheduleRow[] = [
  row('initial-1', 1, '2026-04-01', 5, 2, 5, 2),
  row('initial-2', 2, '2026-04-04', 5, 3, 5, 3),
]

const THREE_ROWS: InboundSplitScheduleRow[] = [
  row('rebuilt-1', 1, '2026-04-01', 3, 1, 3, 1),
  row('rebuilt-2', 2, '2026-04-03', 3, 2, 3, 2),
  row('rebuilt-3', 3, '2026-04-05', 4, 2, 4, 2),
]

const SOURCE_WITH_POINT: SecondaryInboundSplitSource = {
  total: {
    suggestion: 0,
    sales: {},
  },
  sizeInfo: {
    S: { salesRate: 1, baseStock: 100 },
    M: { salesRate: 1, baseStock: 100 },
  },
  expectation: {
    S: [{ date: '2026-06-27', inbound: 10 }],
    M: [{ date: '2026-06-27', inbound: 5 }],
  },
  confirmed: {
    total_phase: 0,
    data: [],
  },
}

type RenderResult = {
  container: HTMLDivElement
  root: Root
  props: {
    buildRowsForCount: Mock<(next: number) => InboundSplitScheduleRow[]>
    recalculateRows: Mock<(rows: InboundSplitScheduleRow[]) => InboundSplitScheduleRow[]>
    onApply: Mock<(rows: InboundSplitScheduleRow[]) => void>
    onClose: Mock<() => void>
    onDraftError: Mock<(err: unknown | null, request: InboundSplitDraftRequest) => void>
  }
}

const mountedRoots: Set<Root> = new Set<Root>()

function renderDialog(overrides: Partial<ComponentProps<typeof InboundSplitScheduleDialog>> = {}): RenderResult {
  const container: HTMLDivElement = document.createElement('div')
  document.body.appendChild(container)
  const root: Root = createRoot(container)
  mountedRoots.add(root)
  const props: RenderResult['props'] = {
    buildRowsForCount: vi.fn((next: number) => (next === 3 ? THREE_ROWS : INITIAL_ROWS)),
    recalculateRows: vi.fn((rows: InboundSplitScheduleRow[]) => rows),
    onApply: vi.fn(),
    onClose: vi.fn(),
    onDraftError: vi.fn(),
  }

  act(() : void => {
    root.render(
      <InboundSplitScheduleDialog
        open
        currentOrderInboundDueDate="2026-03-31"
        nextOrderInboundDueDate="2026-05-01"
        calculationBaseDate="2026-03-01"
        initialCount={2}
        initialRows={INITIAL_ROWS}
        columns={COLUMNS}
        buildRowsForCount={props.buildRowsForCount}
        recalculateRows={props.recalculateRows}
        onDraftError={props.onDraftError}
        onApply={props.onApply}
        onClose={props.onClose}
        {...overrides}
      />,
    )
  })

  return { container, root, props }
}

function changeValue(input: HTMLInputElement | HTMLSelectElement, value: string): void {
  act(() : void => {
    const prototype: object = input instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype
    const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(prototype, 'value')
    descriptor?.set?.call(input, value)
    const eventName: 'change' | 'input' = input instanceof HTMLSelectElement ? 'change' : 'input'
    input.dispatchEvent(new Event(eventName, { bubbles: true }))
  })
}

function clickDateLockButton(): void {
  const button: HTMLButtonElement = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
    .find((candidate: HTMLButtonElement): boolean => candidate.textContent === KO.btnInboundSplitLockDates || candidate.textContent === KO.btnInboundSplitUnlockDates) as HTMLButtonElement
  act(() : void => {
    button.click()
  })
}

afterEach(() : void => {
  act(() : void => {
    mountedRoots.forEach((root: Root): void => root.unmount())
    mountedRoots.clear()
  })
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('InboundSplitScheduleDialog event flow', () : void => {
  it('updates inbound source summary when split count changes', () : void => {
    const buildRowsForCountByChange = vi.fn((next: number): InboundSplitScheduleRow[] => {
      if (next === 2) {
        return [
          row('rebuilt-1', 1, '2026-06-24', 3, 2, 3, 2),
          row('rebuilt-2', 2, '2026-06-30', 4, 3, 4, 3),
        ]
      }
      if (next === 3) {
        return [
          row('rebuilt-1', 1, '2026-06-24', 3, 2, 3, 2),
          row('rebuilt-2', 2, '2026-06-27', 4, 3, 4, 3),
          row('rebuilt-3', 3, '2026-06-30', 4, 3, 4, 3),
        ]
      }
      return [row('initial-1', 1, '2026-06-24', 3, 2, 3, 2)]
    })

    renderDialog({
      inboundSplitSource: SOURCE_WITH_POINT,
      currentOrderInboundDueDate: '2026-06-01',
      nextOrderInboundDueDate: '2026-07-01',
      initialCount: 1,
      initialRows: [row('initial-1', 1, '2026-06-24', 3, 2, 3, 2)],
      buildRowsForCount: buildRowsForCountByChange,
      recalculateRows: vi.fn((rows) => rows),
    })

    expect(document.body.textContent).not.toContain('2026-06-27')

    const select: HTMLSelectElement = document.querySelector('select') as HTMLSelectElement
    changeValue(select, '3')

    expect(buildRowsForCountByChange).toHaveBeenCalledWith(3)
    expect(document.body.textContent).toContain('2026-06-27')
  })

  it('rebuilds rows from the count builder before applying a changed split count', () : void => {
    const { props }: RenderResult = renderDialog()
    const select: HTMLSelectElement = document.querySelector('select') as HTMLSelectElement

    changeValue(select, '3')
    clickDateLockButton()
    const actionButtons: HTMLButtonElement[] = Array.from(document.querySelectorAll<HTMLButtonElement>('footer button'))
    act(() : void => {
      actionButtons[1].click()
    })

    expect(props.buildRowsForCount).toHaveBeenCalledWith(3)
    expect(props.onApply).toHaveBeenCalledWith(THREE_ROWS)
  })

  it('applies the period existing-order inbound exclusion flag to all rows on apply', () : void => {
    const { props }: RenderResult = renderDialog()
    const checkboxes: NodeListOf<HTMLInputElement> = document.querySelectorAll('input[type="checkbox"]')
    expect(checkboxes.length).toBe(1)
    const globalCheckbox: HTMLInputElement = checkboxes[0]!

    act(() : void => {
      globalCheckbox?.click()
    })
    clickDateLockButton()
    const actionButtons: HTMLButtonElement[] = Array.from(document.querySelectorAll<HTMLButtonElement>('footer button'))
    act(() : void => {
      actionButtons[1].click()
    })

    const submittedRows: InboundSplitScheduleRow[] = props.onApply.mock.calls[0][0]
    expect(submittedRows.every((row: InboundSplitScheduleRow): boolean => row.excludePeriodExistingOrderInbound)).toBe(true)
  })

  it('allows confirmed overage and marks confirmed fields when they differ from suggestions', () : void => {
    const { props }: RenderResult = renderDialog()
    clickDateLockButton()
    const firstTotalInput: HTMLInputElement = document.querySelector<HTMLInputElement>('input[type="number"]') as HTMLInputElement

    changeValue(firstTotalInput, '20')

    expect(firstTotalInput.className).toContain('inboundSplitConfirmedDiff')
    expect(firstTotalInput.getAttribute('aria-label')).toContain(KO.ariaInboundSplitConfirmedDiff)
    const actionButtons: HTMLButtonElement[] = Array.from(document.querySelectorAll<HTMLButtonElement>('footer button'))
    act(() : void => {
      actionButtons[1].click()
    })

    const submittedRows: InboundSplitScheduleRow[] = props.onApply.mock.calls[0][0]
    expect(submittedRows[0].quantitiesBySize.S + submittedRows[0].quantitiesBySize.M).toBe(20)
  })

  it('resets confirmed quantities to suggestions after inbound dates are locked', () : void => {
    const { props }: RenderResult = renderDialog()
    clickDateLockButton()
    const resetButton: HTMLButtonElement = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
      .find((button: HTMLButtonElement): boolean => button.textContent === KO.btnInboundSplitResetConfirmed) as HTMLButtonElement
    const numberInputs: HTMLInputElement[] = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="number"]'))

    changeValue(numberInputs[0]!, '20')
    act(() : void => {
      resetButton.click()
    })
    const actionButtons: HTMLButtonElement[] = Array.from(document.querySelectorAll<HTMLButtonElement>('footer button'))
    act(() : void => {
      actionButtons[1].click()
    })

    const submittedRows: InboundSplitScheduleRow[] = props.onApply.mock.calls[0][0]
    expect(submittedRows[0].quantitiesBySize).toEqual(submittedRows[0].suggestedQuantitiesBySize)
  })

  it('does not apply local draft changes when the dialog is closed', () : void => {
    const { props }: RenderResult = renderDialog()
    const select: HTMLSelectElement = document.querySelector('select') as HTMLSelectElement

    changeValue(select, '3')
    const actionButtons: HTMLButtonElement[] = Array.from(document.querySelectorAll<HTMLButtonElement>('footer button'))
    act(() : void => {
      actionButtons[0].click()
    })

    expect(props.onClose).toHaveBeenCalledTimes(1)
    expect(props.onApply).not.toHaveBeenCalled()
  })

  it('disables apply while a draft error is visible', () : void => {
    const { props }: RenderResult = renderDialog({
      draftError: {
        checkedAt: '2026-06-15T00:00:00.000Z',
        page: 'ProductSecondaryDrawer',
        request: 'buildInboundSplitScheduleRows',
        error: 'missing source cell',
      },
    })
    const actionButtons: HTMLButtonElement[] = Array.from(document.querySelectorAll<HTMLButtonElement>('footer button'))

    expect(actionButtons[1].disabled).toBe(true)
    act(() : void => {
      actionButtons[1].click()
    })
    expect(props.onApply).not.toHaveBeenCalled()
  })

  it('renders draft error badges next to the split count selector', () : void => {
    renderDialog({
      draftError: {
        checkedAt: '2026-06-15T00:00:00.000Z',
        page: 'ProductSecondaryDrawer',
        request: 'buildInboundSplitScheduleRows',
        error: 'missing source cell',
      },
    })
    const select: HTMLSelectElement = document.querySelector('select') as HTMLSelectElement
    const countPanel: HTMLDivElement | null = select.closest('div')

    expect(countPanel?.textContent).toContain('ERROR')
  })

  it('rejects invalid date edits with a warning next to the split count selector', () : void => {
    const { props }: RenderResult = renderDialog({
      currentOrderInboundDueDate: '2026-04-01',
      nextOrderInboundDueDate: '2026-05-01',
      initialRows: [
        row('initial-1', 1, '2026-04-01', 5, 2, 5, 2),
        row('initial-2', 2, '2026-04-04', 5, 3, 5, 3),
      ],
    })
    const firstDateInput: HTMLInputElement = document.querySelector<HTMLInputElement>('input[type="date"]') as HTMLInputElement
    const select: HTMLSelectElement = document.querySelector('select') as HTMLSelectElement
    const countPanel: HTMLDivElement | null = select.closest('div')

    changeValue(firstDateInput, '2026-03-30')

    expect(firstDateInput.value).toBe('2026-04-01')
    expect(props.recalculateRows).not.toHaveBeenCalled()
    expect(props.onDraftError).toHaveBeenCalledWith(null, 'validateInboundSplitScheduleRows')
    expect(countPanel?.textContent).toContain(KO.msgInboundSplitInvalidDatePolicy)
    expect(countPanel?.textContent).not.toContain('ERROR')
  })

  it('disables apply and shows reason when inbound dates are not strictly increasing', () : void => {
    const { props }: RenderResult = renderDialog({
      initialCount: 2,
      currentOrderInboundDueDate: '2026-04-01',
      initialRows: [
        row('initial-1', 1, '2026-04-04', 5, 2, 5, 2),
        row('initial-2', 2, '2026-04-03', 5, 3, 5, 3),
      ],
    })
    const actionButtons: HTMLButtonElement[] = Array.from(document.querySelectorAll<HTMLButtonElement>('footer button'))

    expect(actionButtons[1].disabled).toBe(true)
    expect(document.body.textContent).toContain(KO.msgInboundSplitInvalidDatePolicy)
    act(() : void => {
      actionButtons[1].click()
    })
    expect(props.onApply).not.toHaveBeenCalled()
  })

  it('keeps the current draft and reports the source error when count rebuild fails', () : void => {
    const sourceError: Error = new Error('missing source cell')
    const { props }: RenderResult = renderDialog({
      buildRowsForCount: vi.fn((): InboundSplitScheduleRow[] => {
        throw sourceError
      }),
    })
    const select: HTMLSelectElement = document.querySelector('select') as HTMLSelectElement

    changeValue(select, '3')
    clickDateLockButton()
    const actionButtons: HTMLButtonElement[] = Array.from(document.querySelectorAll<HTMLButtonElement>('footer button'))
    act(() : void => {
      actionButtons[1].click()
    })

    expect(props.onDraftError).toHaveBeenCalledWith(sourceError, 'buildInboundSplitScheduleRows')
    const submittedRows: InboundSplitScheduleRow[] = props.onApply.mock.calls[0][0]
    expect(submittedRows).toEqual(INITIAL_ROWS)
  })
})
