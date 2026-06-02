import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { compareSortValues, nextSortState, type SortState } from '../../utils/sort'
import { drawerKeepOpenDataProps } from '../drawer/drawerDom'
import styles from './common.module.css'
import { PaginatedTablePager } from './PaginatedTablePager'
import type { AriaSortValue, PaginatedTableProps } from './PaginatedTableTypes'

export type { PaginatedTableProps, TableColumn } from './PaginatedTableTypes'

const noopPageChange = () => {}
const isSortKey = (key: string) => key === 'Enter' || key === ' ' || key === 'Spacebar'

function headerText(header: ReactNode, fallback: string) {
  return typeof header === 'string' || typeof header === 'number' ? String(header) : fallback
}

function ariaSortFor(columnKey: string, sort: SortState | null): AriaSortValue {
  if (sort?.key !== columnKey) return 'none'
  return sort.dir === 'asc' ? 'ascending' : 'descending'
}

function sortActionLabel(columnLabel: string, columnKey: string, sort: SortState | null) {
  if (sort?.key !== columnKey) return `${columnLabel} 기준 오름차순 정렬`
  return sort.dir === 'asc' ? `${columnLabel} 기준 내림차순 정렬` : `${columnLabel} 정렬 해제`
}

function sameOrder(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, index) => id === b[index])
}

export function PaginatedTable<T extends { id: string }>(props: PaginatedTableProps<T>) {
  const {
    columns,
    rows,
    activeRowId,
    getRowId,
    onRowClick,
    onRowKeyDown,
    onOrderedRowIdsChange,
    defaultSort,
    resetSortKey,
    infiniteScroll,
    wrapClassName,
  } = props
  const plain = props.paginated === false
  const tableBodyRef = useRef<HTMLDivElement | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>())
  const reportedOrderRef = useRef<string[]>([])
  const resetSortKeyRef = useRef(resetSortKey)
  const [sort, setSort] = useState<SortState | null>(defaultSort ?? null)

  const batchSize = Math.max(1, infiniteScroll?.batchSize ?? 30)
  const infiniteEnabled = plain && Boolean(infiniteScroll?.enabled)
  const [visibleCount, setVisibleCount] = useState(batchSize)
  const rowIdOf = useCallback((row: T) => getRowId?.(row) ?? row.id, [getRowId])
  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    return [...rows].sort((a, b) => {
      const cmp = compareSortValues(col?.sortValue ? col.sortValue(a) : null, col?.sortValue ? col.sortValue(b) : null)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [rows, columns, sort])
  const sortedRowIds = useMemo(() => sortedRows.map(rowIdOf), [rowIdOf, sortedRows])

  const page = plain ? 1 : props.page
  const pageSize = plain ? Math.max(1, sortedRows.length) : props.pageSize
  const onPageChange = plain ? noopPageChange : props.onPageChange
  const onPageSizeChange = plain ? noopPageChange : props.onPageSizeChange
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = plain ? 0 : (currentPage - 1) * pageSize
  const pageRows = useMemo(() => {
    if (!plain) return sortedRows.slice(startIndex, startIndex + pageSize)
    return infiniteEnabled ? sortedRows.slice(0, visibleCount) : sortedRows
  }, [infiniteEnabled, pageSize, plain, sortedRows, startIndex, visibleCount])
  const hasMoreRows = infiniteEnabled && pageRows.length < sortedRows.length

  const columnConfigs = useMemo(() => columns.map((column) => {
    const canSort = column.sortable !== false
    const style = { textAlign: column.align ?? 'left', width: column.width } satisfies CSSProperties
    if (!canSort) return { column, canSort, style, ariaSort: undefined, actionLabel: undefined }
    const columnLabel = headerText(column.header, column.key)
    return { column, canSort, style, ariaSort: ariaSortFor(column.key, sort), actionLabel: sortActionLabel(columnLabel, column.key, sort) }
  }), [columns, sort])

  useEffect(() => {
    if (!onOrderedRowIdsChange || sameOrder(reportedOrderRef.current, sortedRowIds)) return
    reportedOrderRef.current = sortedRowIds
    onOrderedRowIdsChange(sortedRowIds)
  }, [onOrderedRowIdsChange, sortedRowIds])

  useEffect(() => {
    if (resetSortKeyRef.current === resetSortKey) return
    resetSortKeyRef.current = resetSortKey
    queueMicrotask(() => {
      setSort(defaultSort ?? null)
      onPageChange(1)
    })
  }, [defaultSort, onPageChange, resetSortKey])

  useEffect(() => {
    if (!activeRowId) return
    const activeIndex = infiniteEnabled ? sortedRowIds.indexOf(activeRowId) : -1
    if (activeIndex >= visibleCount) {
      queueMicrotask(() => setVisibleCount(Math.min(sortedRows.length, activeIndex + 1)))
      return
    }
    const activeRow = rowRefs.current.get(activeRowId)
    activeRow?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    activeRow?.focus({ preventScroll: true })
  }, [activeRowId, infiniteEnabled, pageRows.length, sort, sortedRowIds, sortedRows.length, visibleCount])

  useEffect(() => {
    if (!infiniteEnabled) return
    queueMicrotask(() => {
      setVisibleCount((current) => {
        if (sortedRows.length <= 0) return batchSize
        return Math.min(Math.max(current, batchSize), sortedRows.length)
      })
    })
  }, [rows.length, sortedRows.length, infiniteEnabled, batchSize])

  useEffect(() => {
    const root = tableBodyRef.current
    const target = loadMoreRef.current
    if (!hasMoreRows || !root || !target) return
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return
      setVisibleCount((prev) => (prev >= sortedRows.length ? prev : Math.min(sortedRows.length, prev + batchSize)))
    }, { root, threshold: 0.1 })
    observer.observe(target)
    return () => observer.disconnect()
  }, [batchSize, hasMoreRows, pageRows.length, sort?.dir, sort?.key, sortedRows.length, visibleCount])

  const onSort = useCallback((key: string, sortable: boolean) => {
    if (!sortable) return
    setSort((current) => nextSortState(current, key))
    onPageChange(1)
  }, [onPageChange])

  const onHeaderSortKeyDown = useCallback((event: KeyboardEvent<HTMLTableCellElement>, key: string) => {
    if (!isSortKey(event.key)) return
    event.preventDefault()
    onSort(key, true)
  }, [onSort])

  return (
    <div className={`${styles.tableWrap}${wrapClassName ? ` ${wrapClassName}` : ''}`} {...drawerKeepOpenDataProps()}>
      <div ref={tableBodyRef} className={styles.tableBody}>
        <table className={styles.table}>
          <colgroup>{columnConfigs.map(({ column }) => <col key={column.key} style={{ width: column.width }} />)}</colgroup>
          <thead>
            <tr>
              {columnConfigs.map(({ column, canSort, style: cellStyle, ariaSort, actionLabel }) => (
                <th
                  key={column.key}
                  scope="col"
                  style={cellStyle}
                  className={canSort ? styles.sortableTh : undefined}
                  onClick={canSort ? () => onSort(column.key, true) : undefined}
                  onKeyDown={canSort ? (event) => onHeaderSortKeyDown(event, column.key) : undefined}
                  tabIndex={canSort ? 0 : undefined}
                  aria-sort={canSort ? ariaSort : undefined}
                  aria-label={canSort ? actionLabel : undefined}
                  title={canSort ? actionLabel : undefined}
                >
                  <span className={styles.thInner}>
                    {column.header}
                    {canSort && sort?.key === column.key && <span>{sort.dir === 'asc' ? '▲' : '▼'}</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, rowIndex) => {
              const rowId = rowIdOf(row)
              const active = activeRowId === rowId
              const clickable = Boolean(onRowClick || onRowKeyDown)
              const rowClassName = `${clickable ? styles.rowClickable : ''} ${active ? styles.rowActive : ''}`.trim() || undefined
              return (
                <tr
                  key={rowId}
                  ref={(node) => {
                    if (node) rowRefs.current.set(rowId, node)
                    else rowRefs.current.delete(rowId)
                  }}
                  className={rowClassName}
                  onClick={() => onRowClick?.(row)}
                  onKeyDown={(event) => onRowKeyDown?.(row, event)}
                  tabIndex={clickable ? 0 : undefined}
                  aria-current={active ? 'true' : undefined}
                >
                  {columnConfigs.map(({ column, style: cellStyle }) => (
                    <td key={column.key} style={cellStyle}>{column.cell(row, startIndex + rowIndex)}</td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
        {hasMoreRows && (
          <div ref={loadMoreRef} className={styles.loadMoreSentinel}>
            스크롤하면 더 불러옵니다.
          </div>
        )}
      </div>
      {!plain && (
        <PaginatedTablePager
          totalRows={sortedRows.length}
          startIndex={startIndex}
          pageSize={pageSize}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  )
}
