// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
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
  ignoreExistingOrderInbound: false,
  suggestedQuantitiesBySize: { S: 2, M: 6 },
  quantitiesBySize: { S: 3, M: 5 },
}]

const TWO_ROUND_ROWS: InboundSplitScheduleRow[] = [
  ROWS[0],
  {
    id: 'r2',
    round: 2,
    inboundDate: '2026-04-10',
    ignoreExistingOrderInbound: false,
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

function renderTable(overrides: Partial<InboundSplitScheduleTableProps> = {}): Required<Pick<InboundSplitScheduleTableProps, 'onDateChange' | 'onRowTotalChange' | 'onQtyChange'>> {
  const callbacks: Required<Pick<InboundSplitScheduleTableProps, 'onDateChange' | 'onRowTotalChange' | 'onQtyChange'>> = {
    onDateChange: vi.fn(),
    onRowTotalChange: vi.fn(),
    onQtyChange: vi.fn(),
  }
  const props: InboundSplitScheduleTableProps = {
    currentOrderInboundDueDate: '2026-03-31',
    nextOrderInboundDueDate: '2026-05-01',
    rows: ROWS,
    columns: COLUMNS,
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
    expect(document.querySelector('[aria-label*="제안 수량과 다름"]')).not.toBeNull()
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
          ignoreExistingOrderInbound: false,
          suggestedQuantitiesBySize: { S: 1, M: 2 },
          quantitiesBySize: { S: 1, M: 2 },
        },
      ],
    })

    const intervalNode: HTMLSpanElement | undefined = Array.from(document.querySelectorAll('span'))
      .filter((node: HTMLSpanElement): boolean => node.className.includes(styles.inboundSplitDateInterval))
      .find((node: HTMLSpanElement): boolean => node.textContent === '-1일')

    expect(intervalNode).not.toBeUndefined()
    expect(intervalNode?.className).toContain(styles.inboundSplitDateIntervalInvalid)
    const dateInputs: HTMLInputElement[] = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="date"]'))
    expect(dateInputs[1]?.getAttribute('aria-invalid')).toBe('true')
    expect(dateInputs[1]?.getAttribute('aria-describedby')).toBe(intervalNode?.id)
  })

  it('emits date, row total, and size quantity changes with row and size identity', (): void => {
    const callbacks: Required<Pick<InboundSplitScheduleTableProps, 'onDateChange' | 'onRowTotalChange' | 'onQtyChange'>> = renderTable()
    const dateInputs: HTMLInputElement[] = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="date"]'))
    const numberInputs: HTMLInputElement[] = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="number"]'))

    changeValue(dateInputs[0]!, '2026-04-03')
    changeValue(numberInputs[0]!, '9')
    changeValue(numberInputs[2]!, '7')

    expect(callbacks.onDateChange as Mock).toHaveBeenCalledWith(0, '2026-04-03')
    expect(callbacks.onRowTotalChange as Mock).toHaveBeenCalledWith(0, '9')
    expect(callbacks.onQtyChange as Mock).toHaveBeenCalledWith(0, 'M', '7')
  })
})
