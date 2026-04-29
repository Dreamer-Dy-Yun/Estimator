import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { drawerKeepOpenDataProps } from '../drawer/drawerDom'
import styles from './common.module.css'

type SortValue = string | number

export type TableColumn<T> = {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  align?: 'left' | 'right' | 'center'
  sortValue?: (row: T) => SortValue
  /** false: 헤더 클릭 정렬 비활성(액션 열 등) */
  sortable?: boolean
}

type PaginatedTableBase<T> = {
  columns: Array<TableColumn<T>>
  rows: T[]
  onRowClick?: (row: T) => void
  /** 루트 `.tableWrap`에 추가 클래스(페이지별 열 간격·밀도 등) */
  wrapClassName?: string
  infiniteScroll?: {
    enabled: boolean
    batchSize?: number
  }
}

export type PaginatedTableProps<T extends { id: string }> = PaginatedTableBase<T> & (
  | {
      paginated?: true
      page: number
      pageSize: number
      onPageChange: (page: number) => void
      onPageSizeChange: (size: number) => void
    }
  | {
      paginated: false
    }
)

export function PaginatedTable<T extends { id: string }>(props: PaginatedTableProps<T>) {
  const { columns, rows, onRowClick, infiniteScroll, wrapClassName } = props
  const plain = props.paginated === false
  const tableBodyRef = useRef<HTMLDivElement | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)
  const batchSize = Math.max(1, infiniteScroll?.batchSize ?? 30)
  const infiniteEnabled = plain && Boolean(infiniteScroll?.enabled)
  const [visibleCount, setVisibleCount] = useState(batchSize)
  const getDefaultSortValue = useCallback((row: T, key: string): SortValue | null => {
    const value = (row as Record<string, unknown>)[key]
    if (typeof value === 'number' || typeof value === 'string') return value
    return null
  }, [])

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
  }, [rows, columns, sort, getDefaultSortValue])

  const page = plain ? 1 : props.page
  const pageSize = plain ? Math.max(1, sortedRows.length) : props.pageSize
  const onPageChange = plain ? () => {} : props.onPageChange
  const onPageSizeChange = plain ? () => {} : props.onPageSizeChange

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = plain ? 0 : (currentPage - 1) * pageSize
  const pageRows = plain
    ? (infiniteEnabled ? sortedRows.slice(0, visibleCount) : sortedRows)
    : sortedRows.slice(startIndex, startIndex + pageSize)

  useEffect(() => {
    if (!infiniteEnabled) return
    queueMicrotask(() => setVisibleCount(batchSize))
  }, [rows.length, sort, infiniteEnabled, batchSize])

  useEffect(() => {
    if (!infiniteEnabled) return
    const root = tableBodyRef.current
    const target = loadMoreRef.current
    if (!root || !target) return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) return
        setVisibleCount((prev) => Math.min(sortedRows.length, prev + batchSize))
      },
      { root, threshold: 0.1 },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [infiniteEnabled, sortedRows.length, batchSize])

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
    <div className={`${styles.tableWrap}${wrapClassName ? ` ${wrapClassName}` : ''}`} {...drawerKeepOpenDataProps()}>
      <div ref={tableBodyRef} className={styles.tableBody}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((c) => {
                const canSort = c.sortable !== false
                return (
                  <th
                    key={c.key}
                    style={{ textAlign: c.align ?? 'left' }}
                    className={canSort ? styles.sortableTh : undefined}
                    onClick={canSort ? () => onSort(c.key, true) : undefined}
                  >
                    <span className={styles.thInner}>
                      {c.header}
                      {canSort && sort?.key === c.key && <span>{sort.dir === 'asc' ? '▲' : '▼'}</span>}
                    </span>
                  </th>
                )
              })}
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
        {infiniteEnabled && pageRows.length < sortedRows.length && (
          <div ref={loadMoreRef} style={{ padding: '10px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
            스크롤하면 더 불러옵니다...
          </div>
        )}
      </div>
      {!plain && (
        <div className={styles.pager}>
          <div className={styles.pagerInfo}>
            {sortedRows.length ? `${startIndex + 1} - ${Math.min(startIndex + pageSize, sortedRows.length)} / ${sortedRows.length}` : '0 / 0'}
          </div>
          <div className={styles.pagerButtons}>
            <button type="button" onClick={() => onPageChange(1)} disabled={currentPage === 1}>처음</button>
            <button type="button" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>이전</button>
            <span>{currentPage} / {totalPages}</span>
            <button type="button" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>다음</button>
            <button type="button" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}>마지막</button>
            <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
