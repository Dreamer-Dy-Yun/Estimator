import type { TableColumn } from './PaginatedTable'
import type { SortState } from '../../utils/sort'
import { PaginatedTable } from './PaginatedTable'

type AnalysisListProps<T extends { id: string }> = {
  columns: Array<TableColumn<T>>
  rows: T[]
  onRowClick?: (row: T) => void
  defaultSort?: SortState
  batchSize?: number
  wrapClassName?: string
}

export function AnalysisList<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  defaultSort,
  batchSize = 30,
  wrapClassName,
}: AnalysisListProps<T>) {
  return (
    <PaginatedTable<T>
      paginated={false}
      columns={columns}
      rows={rows}
      onRowClick={onRowClick}
      defaultSort={defaultSort}
      wrapClassName={wrapClassName}
      infiniteScroll={{ enabled: true, batchSize }}
    />
  )
}
