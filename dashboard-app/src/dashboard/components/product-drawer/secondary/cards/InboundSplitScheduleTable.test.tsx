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
  suggestedQuantitiesBySize: { S: 2, M: 6 },
  quantitiesBySize: { S: 3, M: 5 },
}]

const TWO_ROUND_ROWS: InboundSplitScheduleRow[] = [
  ROWS[0],
  {
    id: 'r2',
    round: 2,
    inboundDate: '2026-04-10',
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
    workDate: '2026-03-31',
    rows: ROWS,
    columns: COLUMNS,
    suggestedSizeTotals: { S: 2, M: 6 },
    confirmedSizeTotals: { S: 3, M: 5 },
    suggestedGrandTotal: 8,
    confirmedGrandTotal: 8,
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
      workDate: '2026-03-31',
      rows: TWO_ROUND_ROWS,
    })

    expect(document.body.textContent).toContain('+1\uC77C')
    expect(document.body.textContent).toContain('+9\uC77C')
  })

  it('marks intervals with 0-or-less days in red style', (): void => {
    renderTable({
      workDate: '2026-04-01',
      rows: [
        ROWS[0],
        {
          id: 'r2',
          round: 2,
          inboundDate: '2026-03-31',
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
  })

  it('emits date, row total, and size quantity changes with row and size identity', (): void => {
    const callbacks: Required<Pick<InboundSplitScheduleTableProps, 'onDateChange' | 'onRowTotalChange' | 'onQtyChange'>> = renderTable()
    const inputs: HTMLInputElement[] = Array.from(document.querySelectorAll<HTMLInputElement>('input'))

    changeValue(inputs[0]!, '2026-04-03')
    changeValue(inputs[1]!, '9')
    changeValue(inputs[3]!, '7')

    expect(callbacks.onDateChange as Mock).toHaveBeenCalledWith(0, '2026-04-03')
    expect(callbacks.onRowTotalChange as Mock).toHaveBeenCalledWith(0, '9')
    expect(callbacks.onQtyChange as Mock).toHaveBeenCalledWith(0, 'M', '7')
  })
})
