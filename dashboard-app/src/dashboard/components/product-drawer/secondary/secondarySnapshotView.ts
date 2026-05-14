import type {
  OrderSnapshotDocumentV1,
  OrderSnapshotOrderUnitInputsV1,
  OrderSnapshotStockDisplayV1,
} from '../../../../snapshot/orderSnapshotTypes'
import type { SizeOrderRow } from './cards/sizeOrderCardTypes'
import type { SecondaryForecastDerived, SecondaryForecastInputs } from './secondaryDrawerTypes'

export type SecondarySnapshotView = {
  stockInputs: SecondaryForecastInputs
  stockDerived: SecondaryForecastDerived
  orderUnitInputs: OrderSnapshotOrderUnitInputsV1 | null
  stockDisplay: OrderSnapshotStockDisplayV1 | null
  selfWeightPct: number
  bufferStock: number
  aiComment: string
  confirmedTotals: OrderSnapshotDocumentV1['drawer2']['confirmedTotals'] | null
  sizeRows: SizeOrderRow[]
}

export function buildSecondarySnapshotView(
  snapshot: OrderSnapshotDocumentV1 | null,
  enabled: boolean,
): SecondarySnapshotView | null {
  if (!enabled || snapshot == null) return null
  const d2 = snapshot.drawer2
  return {
    stockInputs: d2.stockInputs,
    stockDerived: d2.stockDerived,
    orderUnitInputs: d2.orderUnitInputs ?? null,
    stockDisplay: d2.stockDisplay ?? null,
    selfWeightPct: d2.selfWeightPct,
    bufferStock: d2.bufferStock,
    aiComment: d2.llmAnswer,
    confirmedTotals: d2.confirmedTotals ?? null,
    sizeRows: d2.sizeRows.map((row) => ({
      size: row.size,
      selfSharePct: row.selfSharePct,
      competitorSharePct: row.competitorSharePct,
      blendedSharePct: row.blendedSharePct,
      forecastQty: row.forecastQty,
      recommendedQty: row.recommendedQty,
      confirmQty: row.confirmQty,
    })),
  }
}
