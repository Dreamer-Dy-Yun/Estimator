// @vitest-environment jsdom
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { KO } from '../../ko'
import { InboundSplitScheduleDialog, type InboundSplitDraftRequest } from './InboundSplitScheduleDialog'
import type { InboundSplitScheduleRow, InboundSplitSizeColumn } from './inboundSplitScheduleModel'

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
    suggestedQuantitiesBySize: { S: suggestedS, M: suggestedM },
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
    buildRowsForCount: vi.fn((next: number): InboundSplitScheduleRow[] => (next === 3 ? THREE_ROWS : INITIAL_ROWS)),
    recalculateRows: vi.fn((rows: InboundSplitScheduleRow[]): InboundSplitScheduleRow[] => rows),
    onApply: vi.fn(),
    onClose: vi.fn(),
    onDraftError: vi.fn(),
  }

  act(() : void => {
    root.render(
      <InboundSplitScheduleDialog
        open
        workDate="2026-03-31"
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

afterEach(() : void => {
  act(() : void => {
    mountedRoots.forEach((root: Root): void => root.unmount())
    mountedRoots.clear()
  })
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('InboundSplitScheduleDialog event flow', () : void => {
  it('rebuilds rows from the count builder before applying a changed split count', () : void => {
    const { props }: RenderResult = renderDialog()
    const select: HTMLSelectElement = document.querySelector('select') as HTMLSelectElement

    changeValue(select, '3')
    const actionButtons: HTMLButtonElement[] = Array.from(document.querySelectorAll<HTMLButtonElement>('footer button'))
    act(() : void => {
      actionButtons[1].click()
    })

    expect(props.buildRowsForCount).toHaveBeenCalledWith(3)
    expect(props.onApply).toHaveBeenCalledWith(THREE_ROWS)
  })

  it('allows confirmed overage and marks confirmed fields when they differ from suggestions', () : void => {
    const { props }: RenderResult = renderDialog()
    const firstTotalInput: HTMLInputElement = document.querySelector<HTMLInputElement>('input[type="number"]') as HTMLInputElement

    changeValue(firstTotalInput, '20')

    expect(firstTotalInput.className).toContain('inboundSplitConfirmedDiff')
    expect(firstTotalInput.getAttribute('aria-label')).toContain(KO.ariaInboundSplitConfirmedDiff)
    const actionButtons: HTMLButtonElement[] = Array.from(document.querySelectorAll<HTMLButtonElement>('footer button'))
    act(() : void => {
      actionButtons[1].click()
    })

    const appliedRows: InboundSplitScheduleRow[] = props.onApply.mock.calls[0][0]
    expect(appliedRows[0].quantitiesBySize.S + appliedRows[0].quantitiesBySize.M).toBe(20)
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

  it('keeps the current draft and reports the source error when count rebuild fails', () : void => {
    const sourceError: Error = new Error('missing source cell')
    const { props }: RenderResult = renderDialog({
      buildRowsForCount: vi.fn((): InboundSplitScheduleRow[] => {
        throw sourceError
      }),
    })
    const select: HTMLSelectElement = document.querySelector('select') as HTMLSelectElement

    changeValue(select, '3')
    const actionButtons: HTMLButtonElement[] = Array.from(document.querySelectorAll<HTMLButtonElement>('footer button'))
    act(() : void => {
      actionButtons[1].click()
    })

    expect(props.onDraftError).toHaveBeenCalledWith(sourceError, 'buildInboundSplitScheduleRows')
    const appliedRows: InboundSplitScheduleRow[] = props.onApply.mock.calls[0][0]
    expect(appliedRows).toEqual(INITIAL_ROWS)
  })
})
