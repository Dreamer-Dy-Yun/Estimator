import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import type { SortState, SortValue } from '../../utils/sort'

type TableColumnBase<T> = {
  key: string
  header: ReactNode
  cell: (row: T, rowIndex: number) => ReactNode
  align?: 'left' | 'right' | 'center'
  width?: CSSProperties['width']
}

type SortableTableColumn<T> = TableColumnBase<T> & {
  sortValue: (row: T) => SortValue
  sortable?: true
}

type StaticTableColumn<T> = TableColumnBase<T> & {
  /** false이면 헤더 클릭 정렬을 비활성화한다. */
  sortable: false
  sortValue?: never
}

export type TableColumn<T> = SortableTableColumn<T> | StaticTableColumn<T>
export type AriaSortValue = 'none' | 'ascending' | 'descending'

type PaginatedTableBase<T> = {
  columns: Array<TableColumn<T>>
  rows: T[]
  activeRowId?: string | null
  getRowId?: (row: T) => string
  onRowClick?: (row: T) => void
  onRowKeyDown?: (row: T, event: KeyboardEvent<HTMLTableRowElement>) => void
  onOrderedRowIdsChange?: (rowIds: string[]) => void
  defaultSort?: SortState
  resetSortKey?: string | number | null
  /** 루트 tableWrap에 추가할 페이지별 클래스. */
  wrapClassName?: string
  infiniteScroll?: {
    enabled: boolean
    batchSize?: number
  }
}

export type PaginatedTableProps<T extends { id: string }> = PaginatedTableBase<T> & (
  | { paginated?: true; page: number; pageSize: number; onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void }
  | { paginated: false }
)
