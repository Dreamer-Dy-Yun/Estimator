import { describe, expect, it } from 'vitest'
import type { SecondaryInboundSplitSource } from '../../../../../api/types/secondary'
import {
  buildInboundSplitScheduleRows,
  recalculateInboundSplitScheduleRows,
  reconcileInboundSplitScheduleRows,
  type InboundSplitScheduleRow,
  type InboundSplitSizeColumn,
} from './inboundSplitScheduleModel'

const COLUMNS: InboundSplitSizeColumn[] = [{ size: 'S', confirmedQty: 10 }]

function makeSource(dailySalesByDate: Record<string, number>): SecondaryInboundSplitSource {
  const expectationByDate: SecondaryInboundSplitSource['expectationByDate'] = {}
  Object.entries(dailySalesByDate).forEach(([date, sale]: [string, number]): void => {
    expectationByDate[date] = { S: { sale, inbound: 0 } }
  })

  return {
    productId: 'product-a',
    dateStart: '2026-04-01',
    dateEnd: '2026-04-07',
    stockBySize: { S: 0 },
    expectationByDate,
  }
}

function row(id: string, round: number, inboundDate: string, quantity: number): InboundSplitScheduleRow {
  return {
    id,
    round,
    inboundDate,
    suggestedQuantitiesBySize: { S: 99 },
    quantitiesBySize: { S: quantity },
  }
}

describe('inbound split schedule recalculation', () : void => {
  it('recalculates suggestions from current row dates while preserving confirmed quantities', () : void => {
    const source: SecondaryInboundSplitSource = makeSource({
      '2026-04-01': 9,
      '2026-04-02': 2,
      '2026-04-03': 2,
      '2026-04-04': 2,
      '2026-04-05': 1,
      '2026-04-06': 1,
    })

    const rows: InboundSplitScheduleRow[] = recalculateInboundSplitScheduleRows(
      [row('current-1', 1, '2026-04-02', 123), row('current-2', 2, '2026-04-05', 456)],
      COLUMNS,
      '2026-04-07',
      source,
    )

    expect(rows.map((result: InboundSplitScheduleRow): number => result.suggestedQuantitiesBySize.S)).toEqual([6, 4])
    expect(rows.map((result: InboundSplitScheduleRow): number => result.quantitiesBySize.S)).toEqual([123, 456])
  })

  it('preserves existing confirmed values only when the row count is unchanged', () : void => {
    const source: SecondaryInboundSplitSource = makeSource({
      '2026-04-01': 1,
      '2026-04-02': 1,
      '2026-04-03': 1,
      '2026-04-04': 1,
      '2026-04-05': 1,
      '2026-04-06': 1,
    })

    const preservedRows: InboundSplitScheduleRow[] = reconcileInboundSplitScheduleRows(
      [row('current-1', 1, '2026-04-02', 9), row('current-2', 2, '2026-04-05', 1)],
      COLUMNS,
      2,
      '2026-04-01',
      '2026-04-07',
      source,
    )
    const rebuiltRows: InboundSplitScheduleRow[] = reconcileInboundSplitScheduleRows(
      [row('current-1', 1, '2026-04-02', 777)],
      COLUMNS,
      2,
      '2026-04-01',
      '2026-04-07',
      source,
    )
    const directRows: InboundSplitScheduleRow[] = buildInboundSplitScheduleRows(
      COLUMNS,
      2,
      '2026-04-01',
      '2026-04-07',
      source,
    )

    expect(preservedRows.map((result: InboundSplitScheduleRow): number => result.quantitiesBySize.S)).toEqual([9, 1])
    expect(rebuiltRows).toEqual(directRows)
    expect(rebuiltRows[0].quantitiesBySize.S).not.toBe(777)
  })
})
