import type { CompetitorSalesRow } from '../../types'
import { formatGroupedNumber } from '../../utils/format'
import { AnalysisList } from './AnalysisList'

type Props = {
  rows: CompetitorSalesRow[]
  allVisibleRowsSelected: boolean
  bulkSelectedSkuGroupKeys: Set<string>
  onToggleAllVisibleRows: () => void
  onToggleBulkRow: (skuGroupKey: string) => void
  onSelectSkuGroupKey: (skuGroupKey: string) => void
}

export function CompetitorAnalysisList({
  rows,
  allVisibleRowsSelected,
  bulkSelectedSkuGroupKeys,
  onToggleAllVisibleRows,
  onToggleBulkRow,
  onSelectSkuGroupKey,
}: Props) {
  return (
    <AnalysisList<CompetitorSalesRow>
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
        { key: 'rank', header: '순위', cell: (row) => row.rank, align: 'center', sortValue: (row) => row.rank },
        { key: 'brand', header: '브랜드', cell: (row) => row.brand, width: '8.5%', sortValue: (row) => row.brand },
        { key: 'category', header: '카테고리', cell: (row) => row.category, sortValue: (row) => row.category },
        { key: 'code', header: '품번', cell: (row) => row.code, sortValue: (row) => row.code },
        { key: 'productName', header: '상품명', cell: (row) => row.productName, sortValue: (row) => row.productName },
        { key: 'colorCode', header: '색상', cell: (row) => row.colorCode, sortValue: (row) => row.colorCode },
        {
          key: 'competitorAvgPrice',
          header: '경쟁 평균가',
          cell: (row) => formatGroupedNumber(row.competitorAvgPrice),
          align: 'right',
          sortValue: (row) => row.competitorAvgPrice,
        },
        {
          key: 'selfAvgPrice',
          header: '자사 평균가',
          cell: (row) => (row.selfAvgPrice != null ? formatGroupedNumber(row.selfAvgPrice) : '-'),
          align: 'right',
          sortValue: (row) => row.selfAvgPrice ?? 0,
        },
        {
          key: 'competitorQty',
          header: '경쟁 판매량',
          cell: (row) => formatGroupedNumber(row.competitorQty),
          align: 'right',
          sortValue: (row) => row.competitorQty,
        },
        {
          key: 'selfQty',
          header: '자사 판매량',
          cell: (row) => (row.selfQty != null ? formatGroupedNumber(row.selfQty) : '-'),
          align: 'right',
          sortValue: (row) => row.selfQty ?? 0,
        },
        {
          key: 'competitorAmount',
          header: '경쟁 판매액',
          cell: (row) => formatGroupedNumber(row.competitorAmount),
          align: 'right',
          sortValue: (row) => row.competitorAmount,
        },
        {
          key: 'selfAmount',
          header: '자사 판매액',
          cell: (row) => (row.selfAmount != null ? formatGroupedNumber(row.selfAmount) : '-'),
          align: 'right',
          sortValue: (row) => row.selfAmount ?? 0,
        },
      ]}
      rows={rows}
      defaultSort={{ key: 'competitorQty', dir: 'desc' }}
      onRowClick={(row) => onSelectSkuGroupKey(row.skuGroupKey)}
      onRowKeyDown={(row, event) => {
        if (event.key !== 'ArrowLeft') return
        event.preventDefault()
        onSelectSkuGroupKey(row.skuGroupKey)
      }}
    />
  )
}
