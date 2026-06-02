import type { TableColumn } from './PaginatedTable'
import type { SortState } from '../../utils/sort'
import type { KeyboardEvent } from 'react'
import { PaginatedTable } from './PaginatedTable'
import styles from './common.module.css'

type AnalysisListProps<T extends { id: string }> = {
  columns: Array<TableColumn<T>>
  rows: T[]
  activeRowId?: string | null
  getRowId?: (row: T) => string
  onRowClick?: (row: T) => void
  onRowKeyDown?: (row: T, event: KeyboardEvent<HTMLTableRowElement>) => void
  onOrderedRowIdsChange?: (rowIds: string[]) => void
  defaultSort?: SortState
  resetSortKey?: string | number | null
  batchSize?: number
  wrapClassName?: string
}

export function AnalysisList<T extends { id: string }>({
  columns,
  rows,
  activeRowId,
  getRowId,
  onRowClick,
  onRowKeyDown,
  onOrderedRowIdsChange,
  defaultSort,
  resetSortKey,
  batchSize = 30,
  wrapClassName,
}: AnalysisListProps<T>) {
  const analysisWrapClassName = `${styles.analysisTableWrap}${wrapClassName ? ` ${wrapClassName}` : ''}`

  return (
    <PaginatedTable<T>
      paginated={false}
      columns={columns}
      rows={rows}
      activeRowId={activeRowId}
      getRowId={getRowId}
      onRowClick={onRowClick}
      onRowKeyDown={onRowKeyDown}
      onOrderedRowIdsChange={onOrderedRowIdsChange}
      defaultSort={defaultSort}
      resetSortKey={resetSortKey}
      wrapClassName={analysisWrapClassName}
      infiniteScroll={{ enabled: true, batchSize }}
    />
  )
}
