import { useMemo } from 'react'
import type { CompetitorSalesRow } from '../../types'
import { createDisplayRankMap } from '../../utils/displayRank'
import { AnalysisList } from './AnalysisList'
import {
  createBulkSelectColumn,
  createRankColumn,
  getSkuGroupRowId,
  handleAnalysisRowKeyDown,
  nullableNumberColumn,
  numberColumn,
  textColumn,
  type AnalysisListInteractionProps,
} from './analysisListColumnHelpers'

type Props = AnalysisListInteractionProps & { rows: CompetitorSalesRow[] }

export function CompetitorAnalysisList({ rows, activeSkuGroupKey, onOrderedSkuGroupKeysChange, ...actions }: Props) {
  const competitorQtyRank = useMemo(() => createDisplayRankMap(rows, getSkuGroupRowId, (row) => row.competitorQty, 'desc'), [rows])
  const columns = useMemo(() => [
    createBulkSelectColumn({ rows, ...actions }),
    createRankColumn('competitorQtyRank', competitorQtyRank),
    textColumn<CompetitorSalesRow>('brand', '브랜드', (row) => row.brand, '8.5%'),
    textColumn<CompetitorSalesRow>('category', '카테고리', (row) => row.category),
    textColumn<CompetitorSalesRow>('code', '품번', (row) => row.code),
    textColumn<CompetitorSalesRow>('productName', '상품명', (row) => row.productName),
    textColumn<CompetitorSalesRow>('colorCode', '색상', (row) => row.colorCode),
    numberColumn<CompetitorSalesRow>('competitorAvgPrice', '경쟁사 평균가', (row) => row.competitorAvgPrice),
    nullableNumberColumn<CompetitorSalesRow>('selfAvgPrice', '자사 평균가', (row) => row.selfAvgPrice),
    numberColumn<CompetitorSalesRow>('competitorQty', '경쟁사 판매량', (row) => row.competitorQty),
    nullableNumberColumn<CompetitorSalesRow>('selfQty', '자사 판매량', (row) => row.selfQty),
    numberColumn<CompetitorSalesRow>('competitorAmount', '경쟁사 판매액', (row) => row.competitorAmount),
    nullableNumberColumn<CompetitorSalesRow>('selfAmount', '자사 판매액', (row) => row.selfAmount),
  ], [actions, competitorQtyRank, rows])

  return (
    <AnalysisList<CompetitorSalesRow>
      columns={columns}
      rows={rows}
      activeRowId={activeSkuGroupKey}
      getRowId={getSkuGroupRowId}
      onOrderedRowIdsChange={onOrderedSkuGroupKeysChange}
      defaultSort={{ key: 'competitorQty', dir: 'desc' }}
      onRowClick={(row) => actions.onOpenSkuGroupKey(row.skuGroupKey)}
      onRowKeyDown={(row, event) => handleAnalysisRowKeyDown(row, event, actions.onOpenSkuGroupKey, actions.onRequestFocusAdjacent)}
    />
  )
}
