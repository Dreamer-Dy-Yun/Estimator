import { useMemo } from 'react'
import type { SelfSalesRow } from '../../types'
import type { AdjacentDirection } from '../../utils/adjacentListNavigation'
import { createDisplayRankMap } from '../../utils/displayRank'
import { formatGroupedNumber, formatPercent } from '../../utils/format'
import { AnalysisList } from './AnalysisList'

type Props = {
  rows: SelfSalesRow[]
  activeSkuGroupKey: string | null
  allVisibleRowsSelected: boolean
  bulkSelectedSkuGroupKeys: Set<string>
  onToggleAllVisibleRows: () => void
  onToggleBulkRow: (skuGroupKey: string) => void
  onOpenSkuGroupKey: (skuGroupKey: string) => void
  onRequestFocusAdjacent: (currentSkuGroupKey: string | null, direction: AdjacentDirection) => void
  onOrderedSkuGroupKeysChange?: (skuGroupKeys: string[]) => void
}

const getSelfAnalysisRowId = (row: SelfSalesRow) => row.skuGroupKey

export function SelfAnalysisList({
  rows,
  activeSkuGroupKey,
  allVisibleRowsSelected,
  bulkSelectedSkuGroupKeys,
  onToggleAllVisibleRows,
  onToggleBulkRow,
  onOpenSkuGroupKey,
  onRequestFocusAdjacent,
  onOrderedSkuGroupKeysChange,
}: Props) {
  const salesQtyRankBySkuGroupKey = useMemo(
    () => createDisplayRankMap(rows, getSelfAnalysisRowId, (row) => row.qty, 'desc'),
    [rows],
  )

  return (
    <AnalysisList<SelfSalesRow>
      columns={[
        {
          key: 'bulkSelect',
          header: (
            <input
              type="checkbox"
              checked={allVisibleRowsSelected}
              disabled={rows.length === 0}
              aria-label="전체 선택"
              onChange={onToggleAllVisibleRows}
            />
          ),
          cell: (row) => (
            <input
              type="checkbox"
              checked={bulkSelectedSkuGroupKeys.has(row.skuGroupKey)}
              aria-label={`${row.productName} 선택`}
              onClick={(event) => event.stopPropagation()}
              onChange={() => onToggleBulkRow(row.skuGroupKey)}
            />
          ),
          align: 'center',
          width: '42px',
          sortable: false,
        },
        {
          key: 'salesQtyRank',
          header: '순위',
          cell: (row) => salesQtyRankBySkuGroupKey.get(row.skuGroupKey) ?? '-',
          align: 'center',
          width: '58px',
          sortValue: (row) => salesQtyRankBySkuGroupKey.get(row.skuGroupKey) ?? Number.MAX_SAFE_INTEGER,
        },
        { key: 'brand', header: '브랜드', cell: (row) => row.brand, width: '8.5%', sortValue: (row) => row.brand },
        { key: 'category', header: '카테고리', cell: (row) => row.category, sortValue: (row) => row.category },
        { key: 'code', header: '품번', cell: (row) => row.code, sortValue: (row) => row.code },
        { key: 'productName', header: '상품명', cell: (row) => row.productName, sortValue: (row) => row.productName },
        { key: 'colorCode', header: '색상', cell: (row) => row.colorCode, sortValue: (row) => row.colorCode },
        {
          key: 'avgPrice',
          header: '평균판매가',
          cell: (row) => formatGroupedNumber(row.avgPrice),
          align: 'right',
          sortValue: (row) => row.avgPrice,
        },
        {
          key: 'avgCost',
          header: '평균매입원가',
          cell: (row) => formatGroupedNumber(row.avgCost),
          align: 'right',
          sortValue: (row) => row.avgCost,
        },
        {
          key: 'qty',
          header: '판매량',
          cell: (row) => formatGroupedNumber(row.qty),
          align: 'right',
          sortValue: (row) => row.qty,
        },
        {
          key: 'amount',
          header: '총판매액',
          cell: (row) => formatGroupedNumber(row.amount),
          align: 'right',
          sortValue: (row) => row.amount,
        },
        {
          key: 'margin',
          header: '매출이익율',
          cell: (row) => formatPercent(row.marginRate),
          align: 'right',
          sortValue: (row) => row.marginRate,
        },
        {
          key: 'op',
          header: '영업이익률',
          cell: (row) => formatPercent(row.opMarginRate),
          align: 'right',
          sortValue: (row) => row.opMarginRate,
        },
      ]}
      rows={rows}
      activeRowId={activeSkuGroupKey}
      getRowId={getSelfAnalysisRowId}
      onOrderedRowIdsChange={onOrderedSkuGroupKeysChange}
      defaultSort={{ key: 'qty', dir: 'desc' }}
      onRowClick={(row) => onOpenSkuGroupKey(row.skuGroupKey)}
      onRowKeyDown={(row, event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
        event.preventDefault()
        event.stopPropagation()
        if (event.key === 'ArrowLeft') onOpenSkuGroupKey(row.skuGroupKey)
        else onRequestFocusAdjacent(row.skuGroupKey, event.key === 'ArrowDown' ? 'next' : 'prev')
      }}
    />
  )
}
