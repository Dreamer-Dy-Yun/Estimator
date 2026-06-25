// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SecondaryInboundSplitSource } from '../../../../../api/types/secondary'
import { KO } from '../../ko'
import type { InboundSplitScheduleRow, InboundSplitSizeColumn } from './inboundSplitScheduleModel'
import { INBOUND_SPLIT_ZERO_SECTION_KEY, getInboundSplitRoundDetailKey } from './inboundSplitScheduleDetailRows'
import { InboundSplitScheduleTableV2 } from './InboundSplitScheduleTableV2'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const COLUMNS: InboundSplitSizeColumn[] = [
  { size: 'S', confirmedQty: 0, recommendedQty: 0 },
  { size: 'M', confirmedQty: 0, recommendedQty: 0 },
]

const ROWS: InboundSplitScheduleRow[] = [
  {
    id: 'r1',
    round: 1,
    inboundDate: '2026-04-10',
    excludeSegmentExistingOrderInbound: false,
    suggestedQuantitiesBySize: { S: 4, M: 3 },
    quantitiesBySize: { S: 4, M: 3 },
  },
  {
    id: 'r2',
    round: 2,
    inboundDate: '2026-04-20',
    excludeSegmentExistingOrderInbound: false,
    suggestedQuantitiesBySize: { S: 5, M: 2 },
    quantitiesBySize: { S: 5, M: 2 },
  },
]

const SOURCE: SecondaryInboundSplitSource = {
  total: {
    suggestion: 0,
    sales: {},
  },
  sizeInfo: {
    S: { salesRate: 0.5, baseStock: 10 },
    M: { salesRate: 0.5, baseStock: 20 },
  },
  expectation: {
    S: [
      { date: '2026-04-05', inbound: 2 },
      { date: '2026-04-12', inbound: 3 },
      { date: '2026-04-22', inbound: 5 },
      { date: '2026-05-01', inbound: 99 },
    ],
    M: [
      { date: '2026-04-05', inbound: 1 },
      { date: '2026-04-18', inbound: 4 },
    ],
  },
  confirmed: {
    total_phase: 0,
    data: [],
  },
}

let root: Root | null = null
let container: HTMLDivElement | null = null

function renderTable(
  expandedSectionKeys: ReadonlySet<string>,
  rows: InboundSplitScheduleRow[] = ROWS,
): void {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act((): void => {
    root?.render(
      <InboundSplitScheduleTableV2
        currentOrderInboundDueDate="2026-04-10"
        nextOrderInboundDueDate="2026-05-01"
        calculationBaseDate="2026-04-01"
        inboundSplitSource={SOURCE}
        rows={rows}
        columns={COLUMNS}
        datesLocked={false}
        expandedSectionKeys={expandedSectionKeys}
        onDatesLockedToggle={vi.fn()}
        onDetailSectionToggle={vi.fn()}
        onDateChange={vi.fn()}
        onRowTotalChange={vi.fn()}
        onQtyChange={vi.fn()}
      />,
    )
  })
}

function findRowByText(text: string): HTMLTableRowElement | undefined {
  return Array.from(document.querySelectorAll<HTMLTableRowElement>('tr'))
    .find((row: HTMLTableRowElement): boolean => row.textContent?.includes(text) ?? false)
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

describe('InboundSplitScheduleTableV2', (): void => {
  it('renders opening stock and inbound before the first round in the zero-zone detail', (): void => {
    renderTable(new Set<string>([INBOUND_SPLIT_ZERO_SECTION_KEY]))

    const summaryRoundCell: HTMLTableCellElement | undefined = Array.from(document.querySelectorAll<HTMLTableCellElement>('td'))
      .find((cell: HTMLTableCellElement): boolean => cell.textContent?.includes(KO.labelAll) ?? false)
    const openingStockRow: HTMLTableRowElement | undefined = Array.from(document.querySelectorAll<HTMLTableRowElement>('tr'))
      .find((row: HTMLTableRowElement): boolean => row.textContent?.includes(KO.rowInboundSplitOpeningStock) ?? false)

    expect(summaryRoundCell?.getAttribute('rowspan')).toBe('2')
    expect(openingStockRow?.children).toHaveLength(COLUMNS.length + 3)
    expect(openingStockRow?.children[1]?.getAttribute('colspan')).toBe('2')
    expect(openingStockRow?.children[1]?.textContent).toBe(KO.rowInboundSplitOpeningStock)
    expect(document.body.textContent).toContain(KO.rowInboundSplitOpeningStock)
    expect(document.body.textContent).toContain(KO.labelInboundSplitBeforeFirstRoundInbound)
    expect(document.body.textContent).toContain('2026-04-05')
    expect(document.body.textContent).not.toContain('2026-04-12')
    expect(findRowByText(KO.labelInboundSplitBeforeFirstRoundInbound)?.children[2]?.textContent).toBe('3')
  })

  it('renders the first round detail from that round date to the next round date', (): void => {
    renderTable(new Set<string>([getInboundSplitRoundDetailKey(ROWS[0]!)]))

    expect(document.body.textContent).toContain(`1${KO.optionInboundSplitRoundSuffix} ${KO.labelInboundSplitBeforeRoundAdditionalInbound}`)
    expect(document.body.textContent).not.toContain(KO.rowInboundSplitPeriodInboundSummary)
    expect(document.body.textContent).not.toContain('2026-04-05')
    expect(document.body.textContent).toContain('2026-04-12')
    expect(document.body.textContent).toContain('2026-04-18')
    expect(document.body.textContent).not.toContain('2026-04-22')
    expect(findRowByText(`1${KO.optionInboundSplitRoundSuffix} ${KO.labelInboundSplitBeforeRoundAdditionalInbound}`)?.children[2]?.textContent).toBe('7')
  })

  it('toggles scheduled inbound date rows inside a round detail section', (): void => {
    renderTable(new Set<string>([getInboundSplitRoundDetailKey(ROWS[0]!)]))

    const summaryLabel: string = `1${KO.optionInboundSplitRoundSuffix} ${KO.labelInboundSplitBeforeRoundAdditionalInbound}`
    const summaryRow: HTMLTableRowElement | undefined = findRowByText(summaryLabel)
    const toggleButton: HTMLButtonElement | null | undefined = summaryRow?.querySelector<HTMLButtonElement>('button')

    expect(toggleButton).toBeTruthy()
    expect(toggleButton?.getAttribute('aria-expanded')).toBe('true')
    expect(document.body.textContent).toContain('2026-04-12')
    expect(document.body.textContent).toContain('2026-04-18')

    act((): void => {
      toggleButton?.click()
    })

    expect(toggleButton?.getAttribute('aria-expanded')).toBe('false')
    expect(document.body.textContent).toContain(summaryLabel)
    expect(document.body.textContent).not.toContain('2026-04-12')
    expect(document.body.textContent).not.toContain('2026-04-18')

    act((): void => {
      toggleButton?.click()
    })

    expect(toggleButton?.getAttribute('aria-expanded')).toBe('true')
    expect(document.body.textContent).toContain('2026-04-12')
    expect(document.body.textContent).toContain('2026-04-18')
  })

  it('renders later round details from that round date to the next order inbound date', (): void => {
    renderTable(new Set<string>([getInboundSplitRoundDetailKey(ROWS[1]!)]))

    expect(document.body.textContent).toContain(`2${KO.optionInboundSplitRoundSuffix} ${KO.labelInboundSplitBeforeRoundAdditionalInbound}`)
    expect(document.body.textContent).not.toContain(KO.rowInboundSplitPeriodInboundSummary)
    expect(document.body.textContent).not.toContain('2026-04-05')
    expect(document.body.textContent).not.toContain('2026-04-12')
    expect(document.body.textContent).not.toContain('2026-04-18')
    expect(document.body.textContent).toContain('2026-04-22')
    expect(document.body.textContent).not.toContain('2026-05-01')
    expect(findRowByText(`2${KO.optionInboundSplitRoundSuffix} ${KO.labelInboundSplitBeforeRoundAdditionalInbound}`)?.children[2]?.textContent).toBe('5')
  })

  it('keeps the inbound total detail row even when a round has no visible inbound dates', (): void => {
    const ignoredRows: InboundSplitScheduleRow[] = [{ ...ROWS[0]!, excludeSegmentExistingOrderInbound: true }]
    renderTable(new Set<string>([getInboundSplitRoundDetailKey(ignoredRows[0]!)]), ignoredRows)

    expect(document.body.textContent).toContain(`1${KO.optionInboundSplitRoundSuffix} ${KO.labelInboundSplitBeforeRoundAdditionalInbound}`)
    expect(document.body.textContent).not.toContain('2026-04-12')
  })
})
