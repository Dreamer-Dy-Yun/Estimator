import { describe, expect, it } from 'vitest'
import type { SecondaryExistingOrderInboundSupplyBySize } from '../../../../../api/types/secondary'
import type { SecondarySizeOrderDisplayRow } from '../model/secondarySizeOrderRows'
import { buildExistingOrderInboundBalanceBreakdown } from './sizeOrderCardModel'

const SIZE_ROWS: SecondarySizeOrderDisplayRow[] = [
  { size: 'S', baseSharePct: 50, comparisonSharePct: 50, blendedSharePct: 50, forecastQty: 0, recommendedQty: 0, confirmQty: 0, bufferQty: 0 },
  { size: 'M', baseSharePct: 50, comparisonSharePct: 50, blendedSharePct: 50, forecastQty: 0, recommendedQty: 0, confirmQty: 0, bufferQty: 0 },
]

describe('buildExistingOrderInboundBalanceBreakdown', () : void => {
  it('splits existing inbound balances by current and next inbound dates', () : void => {
    const supply: SecondaryExistingOrderInboundSupplyBySize = {
      S: [
        { date: '2026-06-20', qty: 3 },
        { date: '2026-12-24', qty: 5 },
        { date: '2027-06-24', qty: 7 },
      ],
      M: [
        { date: '2026-12-23', qty: 11 },
        { date: '2027-01-10', qty: 13 },
        { date: '2027-08-01', qty: 17 },
      ],
    }

    const rows = buildExistingOrderInboundBalanceBreakdown(
      SIZE_ROWS,
      supply,
      '2026-12-24',
      '2027-06-24',
    )

    expect(rows).toEqual([
      { key: 'beforeCurrent', totalQty: 14, qtyBySize: { S: 3, M: 11 } },
      { key: 'inPeriod', totalQty: 18, qtyBySize: { S: 5, M: 13 } },
      { key: 'afterNext', totalQty: 24, qtyBySize: { S: 7, M: 17 } },
    ])
  })
})
