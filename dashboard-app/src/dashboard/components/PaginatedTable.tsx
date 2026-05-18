import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { compareSortValues, nextSortState, type SortState } from '../../utils/sort'
import { drawerKeepOpenDataProps } from '../drawer/drawerDom'
import styles from './common.module.css'
import { PaginatedTablePager } from './PaginatedTablePager'
import type { AriaSortValue, ColumnRenderConfig, PaginatedTableProps } from './PaginatedTableTypes'

export type { PaginatedTableProps, TableColumn } from './PaginatedTableTypes'
const noopPageChange = () => {}

function headerText(header: ReactNode, fallback: string) {
  if (typeof header === 'string' || typeof header === 'number') return String(header)
  return fallback
}

function ariaSortFor(columnKey: string, sort: SortState | null): AriaSortValue {
  if (sort?.key !== columnKey) return 'none'
  return sort.dir === 'asc' ? 'ascending' : 'descending'
}

function sortActionLabel(columnLabel: string, columnKey: string, sort: SortState | null) {
  if (sort?.key !== columnKey) return `${columnLabel} 기준 오름차순 정렬`
  if (sort.dir === 'asc') return `${columnLabel} 기준 내림차순 정렬`
  return `${columnLabel} 정렬 해제`
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
    infiniteScroll,
    wrapClassName,
  } = props
  const plain = props.paginated === false
  const tableBodyRef = useRef<HTMLDivElement | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>())
  const reportedOrderRef = useRef<string[]>([])

  const [sort, setSort] = useState<SortState | null>(defaultSort ?? null)
  const batchSize = Math.max(1, infiniteScroll?.batchSize ?? 30)
  const infiniteEnabled = plain && Boolean(infiniteScroll?.enabled)
  const [visibleCount, setVisibleCount] = useState(batchSize)

  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)

    const list = [...rows]
    list.sort((a, b) => {
      const av = col?.sortValue ? col.sortValue(a) : null
      const bv = col?.sortValue ? col.sortValue(b) : null
      const cmp = compareSortValues(av, bv)
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return list
  }, [rows, columns, sort])
  const rowIdOf = useCallback((row: T) => getRowId?.(row) ?? row.id, [getRowId])
  const sortedRowIds = useMemo(() => sortedRows.map(rowIdOf), [rowIdOf, sortedRows])

  const page = plain ? 1 : props.page
  const pageSize = plain ? Math.max(1, sortedRows.length) : props.pageSize
  const onPageChange = plain ? noopPageChange : props.onPageChange
  const onPageSizeChange = plain ? noopPageChange : props.onPageSizeChange

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = plain ? 0 : (currentPage - 1) * pageSize
  const pageRows = useMemo(
    () => (plain
      ? (infiniteEnabled ? sortedRows.slice(0, visibleCount) : sortedRows)
      : sortedRows.slice(startIndex, startIndex + pageSize)),
    [infiniteEnabled, pageSize, plain, sortedRows, startIndex, visibleCount],
  )
  const columnConfigs = useMemo<Array<ColumnRenderConfig<T>>>(
    () => columns.map((column) => {
      const canSort = column.sortable !== false
      const style = { textAlign: column.align ?? 'left', width: column.width } satisfies CSSProperties
      if (!canSort) return { column, canSort, style }
      const columnLabel = headerText(column.header, column.key)
      const actionLabel = sortActionLabel(columnLabel, column.key, sort)
      return {
        column,
        canSort,
        style,
        ariaSort: ariaSortFor(column.key, sort),
        actionLabel,
      }
    }),
    [columns, sort],
  )

  useEffect(() => {
    if (!onOrderedRowIdsChange) return
    const prev = reportedOrderRef.current
    const unchanged = prev.length === sortedRowIds.length && prev.every((id, index) => id === sortedRowIds[index])
    if (unchanged) return
    reportedOrderRef.current = sortedRowIds
    onOrderedRowIdsChange(sortedRowIds)
  }, [onOrderedRowIdsChange, sortedRowIds])

  useEffect(() => {
    if (!infiniteEnabled || !activeRowId) return
    const activeIndex = sortedRowIds.indexOf(activeRowId)
    if (activeIndex < 0 || activeIndex < visibleCount) return
    let alive = true
    const nextVisibleCount = Math.min(sortedRows.length, activeIndex + 1)
    queueMicrotask(() => {
      if (alive) setVisibleCount(nextVisibleCount)
    })
    return () => {
      alive = false
    }
  }, [activeRowId, infiniteEnabled, sortedRowIds, sortedRows.length, visibleCount])

  useEffect(() => {
    if (!activeRowId) return
    const activeRow = rowRefs.current.get(activeRowId)
    if (!activeRow) return
    activeRow.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    activeRow.focus({ preventScroll: true })
  }, [activeRowId, pageRows.length, sort])

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

  const onSort = useCallback((key: string, sortable: boolean) => {
    if (!sortable) return
    setSort((current) => nextSortState(current, key))
    onPageChange(1)
  }, [onPageChange])

  const onHeaderSortKeyDown = useCallback((event: KeyboardEvent<HTMLTableCellElement>, key: string) => {
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return
    event.preventDefault()
    onSort(key, true)
  }, [onSort])

  return (
    <div className={`${styles.tableWrap}${wrapClassName ? ` ${wrapClassName}` : ''}`} {...drawerKeepOpenDataProps()}>
      <div ref={tableBodyRef} className={styles.tableBody}>
        <table className={styles.table}>
          <colgroup>
            {columnConfigs.map(({ column }) => (
              <col key={column.key} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columnConfigs.map(({ column, canSort, style: cellStyle, ariaSort, actionLabel }) => {
                return (
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
                )
              })}
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
                  key={row.id}
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
                    <td key={column.key} style={cellStyle}>
                      {column.cell(row, startIndex + rowIndex)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
        {infiniteEnabled && pageRows.length < sortedRows.length && (
          <div ref={loadMoreRef} style={{ padding: '10px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
            스크롤하면 더 불러옵니다...
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
