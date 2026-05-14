import type { TableColumn } from './PaginatedTable'
import type { SortState } from '../../utils/sort'
import type { KeyboardEvent } from 'react'
import { PaginatedTable } from './PaginatedTable'
import styles from './common.module.css'

type AnalysisListProps<T extends { id: string }> = {
  columns: Array<TableColumn<T>>
  rows: T[]
  onRowClick?: (row: T) => void
  onRowKeyDown?: (row: T, event: KeyboardEvent<HTMLTableRowElement>) => void
  defaultSort?: SortState
  batchSize?: number
  wrapClassName?: string
}

export function AnalysisList<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  onRowKeyDown,
  defaultSort,
  batchSize = 30,
  wrapClassName,
}: AnalysisListProps<T>) {
  const analysisWrapClassName = `${styles.analysisTableWrap}${wrapClassName ? ` ${wrapClassName}` : ''}`

  return (
    <PaginatedTable<T>
      paginated={false}
      columns={columns}
      rows={rows}
      onRowClick={onRowClick}
      onRowKeyDown={onRowKeyDown}
      defaultSort={defaultSort}
      wrapClassName={analysisWrapClassName}
      infiniteScroll={{ enabled: true, batchSize }}
    />
  )
}
