import { useMemo } from 'react'
import type { SelfSalesRow } from '../../types'
import { createDisplayRankMap } from '../../utils/displayRank'
import { AnalysisList } from './AnalysisList'
import {
  createBulkSelectColumn,
  createRankColumn,
  getSkuGroupRowId,
  handleAnalysisRowKeyDown,
  numberColumn,
  percentColumn,
  textColumn,
  type AnalysisListInteractionProps,
} from './analysisListColumnHelpers'

type Props = AnalysisListInteractionProps & { rows: SelfSalesRow[]; resetSortKey?: string | number | null }

export function SelfAnalysisList({ rows, activeSkuGroupKey, onOrderedSkuGroupKeysChange, resetSortKey, ...actions }: Props) {
  const qtyRank = useMemo(() => createDisplayRankMap(rows, getSkuGroupRowId, (row) => row.qty, 'desc'), [rows])
  const columns = useMemo(() => [
    createBulkSelectColumn({ rows, ...actions }),
    createRankColumn('salesQtyRank', qtyRank),
    textColumn<SelfSalesRow>('brand', '브랜드', (row) => row.brand, '8.5%'),
    textColumn<SelfSalesRow>('category', '카테고리', (row) => row.category),
    textColumn<SelfSalesRow>('code', '품번', (row) => row.code),
    textColumn<SelfSalesRow>('productName', '상품명', (row) => row.productName),
    textColumn<SelfSalesRow>('colorCode', '색상', (row) => row.colorCode),
    numberColumn<SelfSalesRow>('avgPrice', '평균판매가', (row) => row.avgPrice),
    numberColumn<SelfSalesRow>('avgCost', '평균매입원가', (row) => row.avgCost),
    numberColumn<SelfSalesRow>('qty', '판매량', (row) => row.qty),
    numberColumn<SelfSalesRow>('amount', '총판매액', (row) => row.amount),
    percentColumn<SelfSalesRow>('margin', '매출이익률', (row) => row.marginRate),
    percentColumn<SelfSalesRow>('op', '영업이익률', (row) => row.opMarginRate),
  ], [actions, qtyRank, rows])

  return (
    <AnalysisList<SelfSalesRow>
      columns={columns}
      rows={rows}
      activeRowId={activeSkuGroupKey}
      getRowId={getSkuGroupRowId}
      onOrderedRowIdsChange={onOrderedSkuGroupKeysChange}
      defaultSort={{ key: 'qty', dir: 'desc' }}
      resetSortKey={resetSortKey}
      onRowClick={(row) => actions.onOpenSkuGroupKey(row.skuGroupKey)}
      onRowKeyDown={(row, event) => handleAnalysisRowKeyDown(row, event, actions.onOpenSkuGroupKey, actions.onRequestFocusAdjacent)}
    />
  )
}
