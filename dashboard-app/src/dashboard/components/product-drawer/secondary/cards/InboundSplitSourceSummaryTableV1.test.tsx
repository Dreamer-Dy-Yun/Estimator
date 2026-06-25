// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import type { InboundSplitSizeColumn } from './inboundSplitScheduleModel'
import { InboundSplitSourceSummaryTableV1 } from './InboundSplitSourceSummaryTableV1'
import type { SecondaryExistingOrderInboundSupplyBySize, SecondaryInboundSplitSource } from '../../../../../api/types/secondary'
import { KO } from '../../ko'

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
    S: [{ date: '2026-06-15', inbound: 7 }],
  },
  confirmed: {
    total_phase: 0,
    data: [],
  },
}

const EXISTING_SUPPLY: SecondaryExistingOrderInboundSupplyBySize = {
  S: [
    { date: '2026-05-30', qty: 2 },
    { date: '2026-06-10', qty: 7 },
    { date: '2026-07-02', qty: 3 },
  ],
}

function renderTable(): void {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act((): void => {
    root?.render(
      <InboundSplitSourceSummaryTableV1
        source={SOURCE}
        columns={COLUMNS}
        existingOrderInboundSupplyBySize={EXISTING_SUPPLY}
        calculationBaseDate="2026-06-01"
        currentOrderInboundDueDate="2026-06-01"
        nextOrderInboundDueDate="2026-07-01"
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
  it('renders stock and existing-order inbound balance summary rows', (): void => {
    renderTable()

    expect(document.body.textContent).toContain('기존 재고 (2026-06-01)')
    expect(document.body.textContent).toContain(KO.rowTotalOrderBalance)
    expect(document.body.textContent).toContain(KO.rowTotalOrderBalanceBeforeCurrent)
    expect(document.body.textContent).toContain(KO.rowTotalOrderBalanceInPeriod)
    expect(document.body.textContent).toContain(KO.rowTotalOrderBalanceAfterNext)
    expect(document.body.textContent).not.toContain(KO.rowInboundSplitPeriodInboundTotal)
    expect(document.body.textContent).not.toContain('2026-06-15')
    expect(document.querySelector('tbody')?.children).toHaveLength(5)
  })

  it('expands section rows into date rows', (): void => {
    renderTable()

    expect(document.body.textContent).not.toContain('2026-06-10')
    const toggleButtons: HTMLButtonElement[] = Array.from(document.querySelectorAll<HTMLButtonElement>('tbody button'))
    act((): void => {
      toggleButtons[1]?.click()
    })

    expect(document.body.textContent).toContain('2026-06-10')
    expect(document.body.textContent).not.toContain('2026-05-30')
    expect(document.body.textContent).not.toContain('2026-07-02')
    expect(document.querySelector('tbody')?.children).toHaveLength(6)
  })
})
