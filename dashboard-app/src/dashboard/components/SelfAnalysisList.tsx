import { useMemo } from 'react'
import type { SelfSalesRow } from '../../types'
import { createDisplayRankMap } from '../../utils/displayRank'
import { AnalysisList } from './AnalysisList'
import type { SortableTableColumn, StaticTableColumn } from './PaginatedTable'
import {
  createBulkSelectColumn,
  createRankColumn,
  createThumbnailColumn,
  getSkuGroupRowId,
  handleAnalysisRowKeyDown,
  numberColumn,
  percentColumn,
  textColumn,
  type AnalysisListInteractionProps,
} from './analysisListColumnHelpers'

export type Props = AnalysisListInteractionProps & { rows: SelfSalesRow[]; resetSortKey?: string | number | null }

export function SelfAnalysisList({ rows, activeSkuGroupKey, onOrderedSkuGroupKeysChange, resetSortKey, ...actions }: Props) : React.JSX.Element {
  const qtyRank: Map<string, number> = useMemo(() : Map<string, number> => createDisplayRankMap(rows, getSkuGroupRowId, (row: SelfSalesRow) : number => row.qty, 'desc'), [rows])
  const columns: (SortableTableColumn<SelfSalesRow> | StaticTableColumn<SelfSalesRow>)[] = useMemo(() : (SortableTableColumn<SelfSalesRow> | StaticTableColumn<SelfSalesRow>)[] => [
    createBulkSelectColumn({ rows, ...actions }),
    createThumbnailColumn<SelfSalesRow>(),
    createRankColumn('salesQtyRank', qtyRank),
    textColumn<SelfSalesRow>('brand', '브랜드', (row: SelfSalesRow) : string => row.brand, '8.5%'),
    textColumn<SelfSalesRow>('category', '카테고리', (row: SelfSalesRow) : string => row.category),
    textColumn<SelfSalesRow>('code', '품번', (row: SelfSalesRow) : string => row.code),
    textColumn<SelfSalesRow>('productName', '상품명', (row: SelfSalesRow) : string => row.productName),
    textColumn<SelfSalesRow>('colorCode', '색상', (row: SelfSalesRow) : string => row.colorCode),
    numberColumn<SelfSalesRow>('avgPrice', '평균판매가', (row: SelfSalesRow) : number => row.avgPrice),
    numberColumn<SelfSalesRow>('avgCost', '평균매입원가', (row: SelfSalesRow) : number => row.avgCost),
    numberColumn<SelfSalesRow>('qty', '판매량', (row: SelfSalesRow) : number => row.qty),
    numberColumn<SelfSalesRow>('amount', '총판매액', (row: SelfSalesRow) : number => row.amount),
    percentColumn<SelfSalesRow>('margin', '매출이익률', (row: SelfSalesRow) : number => row.marginRate),
    percentColumn<SelfSalesRow>('op', '영업이익률', (row: SelfSalesRow) : number => row.opMarginRate),
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
      onRowClick={(row: SelfSalesRow) : void => actions.onOpenSkuGroupKey(row.skuGroupKey)}
      onRowKeyDown={(row: SelfSalesRow, event: React.KeyboardEvent<HTMLTableRowElement>) : void => handleAnalysisRowKeyDown(row, event, actions.onOpenSkuGroupKey, actions.onRequestFocusAdjacent)}
    />
  )
}
