// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import type { InboundSplitSizeColumn } from './inboundSplitScheduleModel'
import { InboundSplitSourceSummaryTableV1 } from './InboundSplitSourceSummaryTableV1'
import type { SecondaryInboundSplitSource } from '../../../../../api/types/secondary'

let root: Root | null = null
let container: HTMLDivElement | null = null

const COLUMNS: InboundSplitSizeColumn[] = [{ size: 'S', confirmedQty: 0, recommendedQty: 0 }]

const SOURCE: SecondaryInboundSplitSource = {
  total: {
    suggestion: 0,
    sales: {},
  },
  sizeInfo: {
    S: {
      salesRate: 1,
      baseStock: 100,
    },
  },
  expectation: {
    S: [
      { date: '2026-06-10', inbound: 7 },
      { date: '2026-07-02', inbound: 3 },
      { date: '2026-07-01', inbound: 5 },
    ],
  },
  confirmed: {
    total_phase: 0,
    data: [],
  },
}

function renderTable(overrides: {
  splitSourceWindowEndDate?: string
} = {}): void {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act((): void => {
    root?.render(
      <InboundSplitSourceSummaryTableV1
        source={SOURCE}
        columns={COLUMNS}
        calculationBaseDate="2026-06-01"
        currentOrderInboundDueDate="2026-06-01"
        nextOrderInboundDueDate="2026-07-01"
        splitSourceWindowEndDate={overrides.splitSourceWindowEndDate ?? '2026-07-01'}
        excludePeriodExistingOrderInbound={false}
      />,
    )
  })
}

afterEach((): void => {
  act((): void => {
    root?.unmount()
  })
  root = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
})

describe('InboundSplitSourceSummaryTableV1', (): void => {
  it('hides expectation dates that fall on/after source window end date when using source expectation', (): void => {
    renderTable()

    expect(document.body.textContent).toContain('2026-06-10')
    expect(document.body.textContent).toContain('기존 재고 (2026-06-01)')
    expect(document.body.textContent).not.toContain('2026-07-01')
    expect(document.body.textContent).not.toContain('2026-07-02')
    expect(document.querySelector('tbody')?.children).toHaveLength(3)
  })

  it('hides dates after the supplied source window end date', (): void => {
    renderTable({ splitSourceWindowEndDate: '2026-07-01' })

    expect(document.body.textContent).toContain('2026-06-10')
    expect(document.body.textContent).not.toContain('2026-07-02')
    expect(document.querySelector('tbody')?.children).toHaveLength(3)
  })
})
