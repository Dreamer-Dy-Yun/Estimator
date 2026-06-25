// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { KO } from '../../ko'
import type { InboundSplitScheduleRow, InboundSplitSizeColumn } from './inboundSplitScheduleModel'
import { InboundSplitScheduleTable, type InboundSplitScheduleTableProps } from './InboundSplitScheduleTable'
import styles from '../secondaryDrawer.module.css'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const COLUMNS: InboundSplitSizeColumn[] = [
  { size: 'S', confirmedQty: 2, recommendedQty: 2 },
  { size: 'M', confirmedQty: 6, recommendedQty: 6 },
]

const ROWS: InboundSplitScheduleRow[] = [{
  id: 'r1',
  round: 1,
  inboundDate: '2026-04-01',
  excludeSegmentExistingOrderInbound: false,
  suggestedQuantitiesBySize: { S: 2, M: 6 },
  quantitiesBySize: { S: 3, M: 5 },
}]

const TWO_ROUND_ROWS: InboundSplitScheduleRow[] = [
  ROWS[0],
  {
    id: 'r2',
    round: 2,
    inboundDate: '2026-04-10',
    excludeSegmentExistingOrderInbound: false,
    suggestedQuantitiesBySize: { S: 1, M: 2 },
    quantitiesBySize: { S: 1, M: 2 },
  },
]

let root: Root | null = null
let container: HTMLDivElement | null = null

function changeValue(input: HTMLInputElement, value: string): void {
  act((): void => {
    const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
    descriptor?.set?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function renderTable(overrides: Partial<InboundSplitScheduleTableProps> = {}): Required<Pick<InboundSplitScheduleTableProps, 'onDatesLockedToggle' | 'onDateChange' | 'onRowTotalChange' | 'onQtyChange'>> {
  const callbacks: Required<Pick<InboundSplitScheduleTableProps, 'onDatesLockedToggle' | 'onDateChange' | 'onRowTotalChange' | 'onQtyChange'>> = {
    onDatesLockedToggle: vi.fn(),
    onDateChange: vi.fn(),
    onRowTotalChange: vi.fn(),
    onQtyChange: vi.fn(),
  }
  const props: InboundSplitScheduleTableProps = {
    currentOrderInboundDueDate: '2026-03-31',
    nextOrderInboundDueDate: '2026-05-01',
    rows: ROWS,
    columns: COLUMNS,
    datesLocked: false,
    ...callbacks,
    ...overrides,
  }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act((): void => {
    root?.render(<InboundSplitScheduleTable {...props} />)
  })
  return callbacks
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

describe('InboundSplitScheduleTable', (): void => {
  it('renders summary totals and changed-confirmation aria labels', (): void => {
    renderTable()

    expect(document.body.textContent).toContain('8')
    expect(document.querySelector(`[aria-label*="${KO.ariaInboundSplitConfirmedDiff}"]`)).not.toBeNull()
  })

  it('renders the summary date-lock toggle and emits lock changes', (): void => {
    const callbacks: Required<Pick<InboundSplitScheduleTableProps, 'onDatesLockedToggle' | 'onDateChange' | 'onRowTotalChange' | 'onQtyChange'>> = renderTable()
    const lockButton: HTMLButtonElement = document.querySelector<HTMLButtonElement>('button[aria-pressed="false"]') as HTMLButtonElement

    expect(lockButton.textContent).toBe(KO.btnInboundSplitLockDates)
    act((): void => {
      lockButton.click()
    })

    expect(callbacks.onDatesLockedToggle as Mock).toHaveBeenCalledTimes(1)
  })

  it('renders inbound date intervals from the work date and previous round date', (): void => {
    renderTable({
      currentOrderInboundDueDate: '2026-03-31',
      rows: TWO_ROUND_ROWS,
    })

    expect(document.body.textContent).toContain('+1\uC77C')
    expect(document.body.textContent).toContain('+9\uC77C')
  })

  it('marks intervals with 0-or-less days in red style', (): void => {
    renderTable({
      currentOrderInboundDueDate: '2026-04-01',
      rows: [
        ROWS[0],
        {
          id: 'r2',
          round: 2,
          inboundDate: '2026-03-31',
          excludeSegmentExistingOrderInbound: false,
          suggestedQuantitiesBySize: { S: 1, M: 2 },
          quantitiesBySize: { S: 1, M: 2 },
        },
      ],
    })

    const intervalNode: HTMLSpanElement | undefined = Array.from(document.querySelectorAll('span'))
      .filter((node: HTMLSpanElement): boolean => node.className.includes(styles.inboundSplitDateInterval))
      .find((node: HTMLSpanElement): boolean => node.textContent === `-1${KO.unitDays}`)

    expect(intervalNode).not.toBeUndefined()
    expect(intervalNode?.className).toContain(styles.inboundSplitDateIntervalInvalid)
    const dateInputs: HTMLInputElement[] = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="date"]'))
    expect(dateInputs[1]?.getAttribute('aria-invalid')).toBe('true')
    expect(dateInputs[1]?.getAttribute('aria-describedby')).toBe(intervalNode?.id)
  })

  it('renders only rows before next order inbound due date', (): void => {
    renderTable({
      rows: [
        ROWS[0],
        {
          id: 'r2',
          round: 2,
          inboundDate: '2026-04-10',
          excludeSegmentExistingOrderInbound: false,
          suggestedQuantitiesBySize: { S: 1, M: 2 },
          quantitiesBySize: { S: 1, M: 2 },
        },
        {
          id: 'r3',
          round: 3,
          inboundDate: '2026-05-01',
          excludeSegmentExistingOrderInbound: false,
          suggestedQuantitiesBySize: { S: 5, M: 5 },
          quantitiesBySize: { S: 5, M: 5 },
        },
      ],
    })

    const dateInputs: HTMLInputElement[] = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="date"]'))
    expect(dateInputs).toHaveLength(2)
    expect(document.querySelector('input[type="date"][value="2026-05-01"]')).toBeNull()
    expect(document.querySelector(`.${styles.inboundSplitSummaryTotalCell} > span`)?.textContent).toBe('11')
  })

  it('emits date changes while dates are unlocked', (): void => {
    const callbacks: Required<Pick<InboundSplitScheduleTableProps, 'onDatesLockedToggle' | 'onDateChange' | 'onRowTotalChange' | 'onQtyChange'>> = renderTable()
    const dateInputs: HTMLInputElement[] = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="date"]'))

    changeValue(dateInputs[0]!, '2026-04-03')

    expect(callbacks.onDateChange as Mock).toHaveBeenCalledWith(0, '2026-04-03')
  })

  it('locks date inputs and enables quantity edits when dates are confirmed', (): void => {
    const callbacks: Required<Pick<InboundSplitScheduleTableProps, 'onDatesLockedToggle' | 'onDateChange' | 'onRowTotalChange' | 'onQtyChange'>> = renderTable({
      datesLocked: true,
    })
    const lockButton: HTMLButtonElement = document.querySelector<HTMLButtonElement>('button[aria-pressed="true"]') as HTMLButtonElement
    const dateInputs: HTMLInputElement[] = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="date"]'))
    const numberInputs: HTMLInputElement[] = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="number"]'))

    expect(lockButton.textContent).toBe(KO.btnInboundSplitUnlockDates)
    expect(dateInputs[0]?.disabled).toBe(true)
    expect(numberInputs[0]?.disabled).toBe(false)
    changeValue(numberInputs[0]!, '9')
    changeValue(numberInputs[2]!, '7')

    expect(callbacks.onRowTotalChange as Mock).toHaveBeenCalledWith(0, '9')
    expect(callbacks.onQtyChange as Mock).toHaveBeenCalledWith(0, 'M', '7')
  })
})
