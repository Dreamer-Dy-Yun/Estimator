import type { AdjacentDirection } from '../../utils/adjacentListNavigation'
import { formatCompactKoreanNumber, formatPercent, type CompactKoreanNumberDisplay } from '../../utils/format'
import type { TableColumn } from './PaginatedTable'
import { ProductThumbnailCell } from './ProductThumbnailCell'

export type SkuRow = { skuGroupKey: string; productName: string; thumbnailUrl: string | null }

export type AnalysisListInteractionProps = {
  activeSkuGroupKey: string | null
  allVisibleRowsSelected: boolean
  bulkSelectedSkuGroupKeys: Set<string>
  onToggleAllVisibleRows: () => void
  onToggleBulkRow: (skuGroupKey: string) => void
  onOpenSkuGroupKey: (skuGroupKey: string) => void
  onRequestFocusAdjacent: (currentSkuGroupKey: string | null, direction: AdjacentDirection) => void
  onOrderedSkuGroupKeysChange?: (skuGroupKeys: string[]) => void
}

export const getSkuGroupRowId: <Row extends SkuRow>(row: Row) => string = <Row extends SkuRow>(row: Row) : string => row.skuGroupKey

export function createBulkSelectColumn<Row extends SkuRow>({
  rows,
  allVisibleRowsSelected,
  bulkSelectedSkuGroupKeys,
  onToggleAllVisibleRows,
  onToggleBulkRow,
}: Pick<AnalysisListInteractionProps, 'allVisibleRowsSelected' | 'bulkSelectedSkuGroupKeys' | 'onToggleAllVisibleRows' | 'onToggleBulkRow'> & { rows: Row[] }): TableColumn<Row> {
  return {
    key: 'bulkSelect',
    header: <input type="checkbox" checked={allVisibleRowsSelected} disabled={rows.length === 0} aria-label="전체 선택" onChange={onToggleAllVisibleRows} />,
    cell: (row: Row) : React.JSX.Element => (
      <input
        type="checkbox"
        checked={bulkSelectedSkuGroupKeys.has(row.skuGroupKey)}
        aria-label={`${row.productName} 선택`}
        onClick={(event: React.MouseEvent<HTMLInputElement, MouseEvent>) : void => event.stopPropagation()}
        onChange={() : void => onToggleBulkRow(row.skuGroupKey)}
      />
    ),
    align: 'center',
    width: '42px',
    sortable: false,
  }
}

export function createRankColumn<Row extends SkuRow>(key: string, ranks: Map<string, number>): TableColumn<Row> {
  return {
    key,
    header: '순위',
    cell: (row: Row) : number | '-' => ranks.get(row.skuGroupKey) ?? '-',
    align: 'center',
    width: '58px',
    sortValue: (row: Row) : number => ranks.get(row.skuGroupKey) ?? Number.MAX_SAFE_INTEGER,
  }
}

export function createThumbnailColumn<Row extends SkuRow>(): TableColumn<Row> {
  return {
    key: 'thumbnail',
    header: '이미지',
    cell: (row: Row) : React.JSX.Element => <ProductThumbnailCell thumbnailUrl={row.thumbnailUrl} alt={row.productName} />,
    align: 'center',
    width: '58px',
    sortable: false,
  }
}

export function textColumn<Row>(key: string, header: string, value: (row: Row) => string, width?: string): TableColumn<Row> {
  return { key, header, cell: value, width, sortValue: value }
}

const ANALYSIS_LIST_NUMBER_COMPACT_AT = 100_000 as const

function compactNumberCell(value: number | null | undefined): React.JSX.Element | '-' {
  if (value == null) return '-'
  const display: CompactKoreanNumberDisplay = formatCompactKoreanNumber(value, { compactAt: ANALYSIS_LIST_NUMBER_COMPACT_AT })
  return (
    <span title={display.compacted ? display.fullText : undefined} aria-label={display.compacted ? display.fullText : undefined}>
      {display.text}
    </span>
  )
}

export function numberColumn<Row>(key: string, header: string, value: (row: Row) => number): TableColumn<Row> {
  return { key, header, cell: (row: Row) : React.JSX.Element | '-' => compactNumberCell(value(row)), align: 'right', sortValue: value }
}

export function nullableNumberColumn<Row>(key: string, header: string, value: (row: Row) => number | null | undefined): TableColumn<Row> {
  return { key, header, cell: (row: Row) : React.JSX.Element | '-' => compactNumberCell(value(row)), align: 'right', sortValue: (row: Row) : number => value(row) ?? 0 }
}

export function percentColumn<Row>(key: string, header: string, value: (row: Row) => number): TableColumn<Row> {
  return { key, header, cell: (row: Row) : string => formatPercent(value(row)), align: 'right', sortValue: value }
}

export function handleAnalysisRowKeyDown<Row extends SkuRow>(
  row: Row,
  event: React.KeyboardEvent<HTMLTableRowElement>,
  onOpenSkuGroupKey: (skuGroupKey: string) => void,
  onRequestFocusAdjacent: (currentSkuGroupKey: string | null, direction: AdjacentDirection) => void,
) : void {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
  event.preventDefault()
  event.stopPropagation()
  if (event.key === 'ArrowLeft') onOpenSkuGroupKey(row.skuGroupKey)
  else onRequestFocusAdjacent(row.skuGroupKey, event.key === 'ArrowDown' ? 'next' : 'prev')
}
