import type { TableColumn } from './PaginatedTable'
import { PaginatedTable } from './PaginatedTable'

type AnalysisListProps<T extends { id: string }> = {
  columns: Array<TableColumn<T>>
  rows: T[]
  onRowClick?: (row: T) => void
  batchSize?: number
}

export function AnalysisList<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  batchSize = 30,
}: AnalysisListProps<T>) {
  return (
    <PaginatedTable<T>
      paginated={false}
      columns={columns}
      rows={rows}
      onRowClick={onRowClick}
      infiniteScroll={{ enabled: true, batchSize }}
    />
  )
}
