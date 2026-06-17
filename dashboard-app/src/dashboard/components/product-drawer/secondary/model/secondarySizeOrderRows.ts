import type { SecondarySizeOrderDisplayRow } from '../../../../../utils/secondaryOrderProjection'

export {
  buildDailyTrendSizeOptions,
  buildSecondarySizeOrderRows,
  buildSecondarySizeShares,
} from '../../../../../utils/secondaryOrderProjection'
export type {
  SecondarySizeOrderDisplayRow,
  SecondarySizeOrderRow,
  SecondarySizeShare,
  SecondaryStockOrderSizeRow,
  SizeOrderRowsParams,
} from '../../../../../utils/secondaryOrderProjection'

export type SecondarySizeOrderRestoreRow = Pick<
  SecondarySizeOrderDisplayRow,
  'size' | 'baseSharePct' | 'comparisonSharePct' | 'blendedSharePct' | 'forecastQty' | 'recommendedQty'
>
