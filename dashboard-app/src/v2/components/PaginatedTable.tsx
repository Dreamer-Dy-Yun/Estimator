import { useMemo, useState, type ReactNode } from 'react'
import styles from './v2-common.module.css'

type SortValue = string | number

export type V2Column<T> = {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  align?: 'left' | 'right' | 'center'
  sortValue?: (row: T) => SortValue
}

type PaginatedTableProps<T extends { id: string }> = {
  columns: Array<V2Column<T>>
  rows: T[]
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onRowClick?: (row: T) => void
}

export function PaginatedTable<T extends { id: string }>({
  columns,
  rows,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRowClick,
}: PaginatedTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)
  const getDefaultSortValue = (row: T, key: string): SortValue | null => {
    const value = (row as Record<string, unknown>)[key]
    if (typeof value === 'number' || typeof value === 'string') return value
    return null
  }

  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)

    const list = [...rows]
    list.sort((a, b) => {
      const av = col?.sortValue ? col.sortValue(a) : getDefaultSortValue(a, sort.key)
      const bv = col?.sortValue ? col.sortValue(b) : getDefaultSortValue(b, sort.key)
      if (av === null || bv === null) return 0
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'ko')
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return list
  }, [rows, columns, sort])

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * pageSize
  const pageRows = sortedRows.slice(startIndex, startIndex + pageSize)

  const onSort = (key: string, sortable: boolean) => {
    if (!sortable) return
    if (!sort || sort.key !== key) {
      setSort({ key, dir: 'asc' })
      onPageChange(1)
      return
    }
    if (sort.dir === 'asc') {
      setSort({ key, dir: 'desc' })
      onPageChange(1)
      return
    }
    setSort(null)
    onPageChange(1)
  }

  return (
    <div className={styles.tableWrap} data-drawer-keep-open="true">
      <div className={styles.tableBody}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={{ textAlign: c.align ?? 'left' }}
                  className={styles.sortableTh}
                  onClick={() => onSort(c.key, true)}
                >
                  <span className={styles.thInner}>
                    {c.header}
                    {sort?.key === c.key && <span>{sort.dir === 'asc' ? '▲' : '▼'}</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr
                key={row.id}
                className={onRowClick ? styles.rowClickable : undefined}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((c) => (
                  <td key={c.key} style={{ textAlign: c.align ?? 'left' }}>{c.cell(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.pager}>
        <div className={styles.pagerInfo}>
          {sortedRows.length ? `${startIndex + 1} - ${Math.min(startIndex + pageSize, sortedRows.length)} / ${sortedRows.length}` : '0 / 0'}
        </div>
        <div className={styles.pagerButtons}>
          <button onClick={() => onPageChange(1)} disabled={currentPage === 1}>처음</button>
          <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>이전</button>
          <span>{currentPage} / {totalPages}</span>
          <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>다음</button>
          <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}>마지막</button>
          <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
    </div>
  )
}
