import { useMemo } from 'react'
import type { CompetitorSalesRow } from '../../types'
import { createDisplayRankMap } from '../../utils/displayRank'
import { AnalysisList } from './AnalysisList'
import type { SortableTableColumn, StaticTableColumn } from './PaginatedTable'
import {
  createBulkSelectColumn,
  createRankColumn,
  createThumbnailColumn,
  getSkuGroupRowId,
  handleAnalysisRowKeyDown,
  nullableNumberColumn,
  numberColumn,
  textColumn,
  type AnalysisListInteractionProps,
} from './analysisListColumnHelpers'

export type Props = AnalysisListInteractionProps & { rows: CompetitorSalesRow[]; resetSortKey?: string | number | null }

export function CompetitorAnalysisList({ rows, activeSkuGroupKey, onOrderedSkuGroupKeysChange, resetSortKey, ...actions }: Props) : React.JSX.Element {
  const competitorQtyRank: Map<string, number> = useMemo(() : Map<string, number> => createDisplayRankMap(rows, getSkuGroupRowId, (row: CompetitorSalesRow) : number => row.competitorQty, 'desc'), [rows])
  const columns: (SortableTableColumn<CompetitorSalesRow> | StaticTableColumn<CompetitorSalesRow>)[] = useMemo(() : (SortableTableColumn<CompetitorSalesRow> | StaticTableColumn<CompetitorSalesRow>)[] => [
    createBulkSelectColumn({ rows, ...actions }),
    createThumbnailColumn<CompetitorSalesRow>(),
    createRankColumn('competitorQtyRank', competitorQtyRank),
    textColumn<CompetitorSalesRow>('brand', '브랜드', (row: CompetitorSalesRow) : string => row.brand, '8.5%'),
    textColumn<CompetitorSalesRow>('category', '카테고리', (row: CompetitorSalesRow) : string => row.category),
    textColumn<CompetitorSalesRow>('code', '품번', (row: CompetitorSalesRow) : string => row.code),
    textColumn<CompetitorSalesRow>('productName', '상품명', (row: CompetitorSalesRow) : string => row.productName),
    textColumn<CompetitorSalesRow>('colorCode', '색상', (row: CompetitorSalesRow) : string => row.colorCode),
    numberColumn<CompetitorSalesRow>('competitorAvgPrice', '경쟁사 평균가', (row: CompetitorSalesRow) : number => row.competitorAvgPrice),
    nullableNumberColumn<CompetitorSalesRow>('selfAvgPrice', '자사 평균가', (row: CompetitorSalesRow) : number | null => row.selfAvgPrice),
    numberColumn<CompetitorSalesRow>('competitorQty', '경쟁사 판매량', (row: CompetitorSalesRow) : number => row.competitorQty),
    nullableNumberColumn<CompetitorSalesRow>('selfQty', '자사 판매량', (row: CompetitorSalesRow) : number | null => row.selfQty),
    numberColumn<CompetitorSalesRow>('competitorAmount', '경쟁사 판매액', (row: CompetitorSalesRow) : number => row.competitorAmount),
    nullableNumberColumn<CompetitorSalesRow>('selfAmount', '자사 판매액', (row: CompetitorSalesRow) : number | null => row.selfAmount),
  ], [actions, competitorQtyRank, rows])

  return (
    <AnalysisList<CompetitorSalesRow>
      columns={columns}
      rows={rows}
      activeRowId={activeSkuGroupKey}
      getRowId={getSkuGroupRowId}
      onOrderedRowIdsChange={onOrderedSkuGroupKeysChange}
      defaultSort={{ key: 'competitorQty', dir: 'desc' }}
      resetSortKey={resetSortKey}
      onRowClick={(row: CompetitorSalesRow) : void => actions.onOpenSkuGroupKey(row.skuGroupKey)}
      onRowKeyDown={(row: CompetitorSalesRow, event: React.KeyboardEvent<HTMLTableRowElement>) : void => handleAnalysisRowKeyDown(row, event, actions.onOpenSkuGroupKey, actions.onRequestFocusAdjacent)}
    />
  )
}
