import type { StaticTableColumn, SortableTableColumn, TableColumn } from './PaginatedTableTypes'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { compareSortValues, nextSortState, type SortState } from '../../utils/sort'
import { drawerKeepOpenDataProps } from '../drawer/drawerDom'
import styles from './common.module.css'
import { PaginatedTablePager } from './PaginatedTablePager'
import type { AriaSortValue, PaginatedTableProps } from './PaginatedTableTypes'

export type { PaginatedTableProps, SortableTableColumn, StaticTableColumn, TableColumn } from './PaginatedTableTypes'

const noopPageChange: () => void = () : void => {}
const isSortKey: (key: string) => key is 'Enter' | ' ' | 'Spacebar' = (key: string) : key is 'Enter' | ' ' | 'Spacebar' => key === 'Enter' || key === ' ' || key === 'Spacebar'

function headerText(header: React.ReactNode, fallback: string) : string {
  return typeof header === 'string' || typeof header === 'number' ? String(header) : fallback
}

function ariaSortFor(columnKey: string, sort: SortState | null): AriaSortValue {
  if (sort?.key !== columnKey) return 'none'
  return sort.dir === 'asc' ? 'ascending' : 'descending'
}

function sortActionLabel(columnLabel: string, columnKey: string, sort: SortState | null) : string {
  if (sort?.key !== columnKey) return `${columnLabel} 기준 오름차순 정렬`
  return sort.dir === 'asc' ? `${columnLabel} 기준 내림차순 정렬` : `${columnLabel} 정렬 해제`
}

function sameOrder(a: string[], b: string[]) : boolean {
  return a.length === b.length && a.every((id: string, index: number) : boolean => id === b[index])
}

export function PaginatedTable<T extends { id: string }>(props: PaginatedTableProps<T>) : React.JSX.Element {
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
  }: PaginatedTableProps<T> = props
  const plain: boolean = props.paginated === false
  const tableBodyRef: React.RefObject<HTMLDivElement | null> = useRef<HTMLDivElement | null>(null)
  const loadMoreRef: React.RefObject<HTMLDivElement | null> = useRef<HTMLDivElement | null>(null)
  const rowRefs: React.RefObject<Map<string, HTMLTableRowElement>> = useRef(new Map<string, HTMLTableRowElement>())
  const reportedOrderRef: React.RefObject<string[]> = useRef<string[]>([])
  const resetSortKeyRef: React.RefObject<string | number | null | undefined> = useRef(resetSortKey)
  const [sort, setSort]: [SortState | null, React.Dispatch<React.SetStateAction<SortState | null>>] = useState<SortState | null>(defaultSort ?? null)

  const batchSize: number = Math.max(1, infiniteScroll?.batchSize ?? 30)
  const infiniteEnabled: boolean = plain && Boolean(infiniteScroll?.enabled)
  const [visibleCount, setVisibleCount]: [number, React.Dispatch<React.SetStateAction<number>>] = useState(batchSize)
  const rowIdOf: (row: T) => string = useCallback((row: T) : string => getRowId?.(row) ?? row.id, [getRowId])
  const sortedRows: T[] = useMemo(() : T[] => {
    if (!sort) return rows
    const col: TableColumn<T> | undefined = columns.find((c: TableColumn<T>) : boolean => c.key === sort.key)
    return [...rows].sort((a: T, b: T) : number => {
      const cmp: number = compareSortValues(col?.sortValue ? col.sortValue(a) : null, col?.sortValue ? col.sortValue(b) : null)
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [rows, columns, sort])
  const sortedRowIds: string[] = useMemo(() : string[] => sortedRows.map(rowIdOf), [rowIdOf, sortedRows])

  const page: number = props.paginated === false ? 1 : props.page
  const pageSize: number = props.paginated === false ? Math.max(1, sortedRows.length) : props.pageSize
  const onPageChange: (page: number) => void = props.paginated === false ? noopPageChange : props.onPageChange
  const onPageSizeChange: (size: number) => void = props.paginated === false ? noopPageChange : props.onPageSizeChange
  const totalPages: number = Math.max(1, Math.ceil(sortedRows.length / pageSize))
  const currentPage: number = Math.min(page, totalPages)
  const startIndex: number = plain ? 0 : (currentPage - 1) * pageSize
  const pageRows: T[] = useMemo(() : T[] => {
    if (!plain) return sortedRows.slice(startIndex, startIndex + pageSize)
    return infiniteEnabled ? sortedRows.slice(0, visibleCount) : sortedRows
  }, [infiniteEnabled, pageSize, plain, sortedRows, startIndex, visibleCount])
  const hasMoreRows: boolean = infiniteEnabled && pageRows.length < sortedRows.length

  const columnConfigs: ({ column: StaticTableColumn<T>; canSort: false; style: { textAlign: 'center' | 'left' | 'right'; width: CSSProperties['width'] | undefined; }; ariaSort: undefined; actionLabel: undefined; } | { column: SortableTableColumn<T>; canSort: true; style: { textAlign: 'center' | 'left' | 'right'; width: CSSProperties['width'] | undefined; }; ariaSort: AriaSortValue; actionLabel: string; })[] = useMemo(() : ({ column: StaticTableColumn<T>; canSort: false; style: { textAlign: 'center' | 'left' | 'right'; width: CSSProperties['width'] | undefined; }; ariaSort: undefined; actionLabel: undefined; } | { column: SortableTableColumn<T>; canSort: true; style: { textAlign: 'center' | 'left' | 'right'; width: CSSProperties['width'] | undefined; }; ariaSort: AriaSortValue; actionLabel: string; })[] => columns.map((column: TableColumn<T>) : { column: StaticTableColumn<T>; canSort: false; style: { textAlign: 'center' | 'left' | 'right'; width: CSSProperties['width'] | undefined; }; ariaSort: undefined; actionLabel: undefined; } | { column: SortableTableColumn<T>; canSort: true; style: { textAlign: 'center' | 'left' | 'right'; width: CSSProperties['width'] | undefined; }; ariaSort: AriaSortValue; actionLabel: string; } => {
    const style: { textAlign: 'center' | 'left' | 'right'; width: CSSProperties['width'] | undefined; } = { textAlign: column.align ?? 'left', width: column.width } satisfies CSSProperties
    if (column.sortable === false) return { column, canSort: false, style, ariaSort: undefined, actionLabel: undefined }
    const columnLabel: string = headerText(column.header, column.key)
    return { column, canSort: true, style, ariaSort: ariaSortFor(column.key, sort), actionLabel: sortActionLabel(columnLabel, column.key, sort) }
  }), [columns, sort])

  useEffect(() : void => {
    if (!onOrderedRowIdsChange || sameOrder(reportedOrderRef.current, sortedRowIds)) return
    reportedOrderRef.current = sortedRowIds
    onOrderedRowIdsChange(sortedRowIds)
  }, [onOrderedRowIdsChange, sortedRowIds])

  useEffect(() : void => {
    if (resetSortKeyRef.current === resetSortKey) return
    resetSortKeyRef.current = resetSortKey
    queueMicrotask(() : void => {
      setSort(defaultSort ?? null)
      onPageChange(1)
    })
  }, [defaultSort, onPageChange, resetSortKey])

  useEffect(() : void => {
    if (!activeRowId) return
    const activeIndex: number = infiniteEnabled ? sortedRowIds.indexOf(activeRowId) : -1
    if (activeIndex >= visibleCount) {
      queueMicrotask(() : void => setVisibleCount(Math.min(sortedRows.length, activeIndex + 1)))
      return
    }
    const activeRow: HTMLTableRowElement | undefined = rowRefs.current.get(activeRowId)
    activeRow?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    activeRow?.focus({ preventScroll: true })
  }, [activeRowId, infiniteEnabled, pageRows.length, sort, sortedRowIds, sortedRows.length, visibleCount])

  useEffect(() : void => {
    if (!infiniteEnabled) return
    queueMicrotask(() : void => {
      setVisibleCount((current: number) : number => {
        if (sortedRows.length <= 0) return batchSize
        return Math.min(Math.max(current, batchSize), sortedRows.length)
      })
    })
  }, [rows.length, sortedRows.length, infiniteEnabled, batchSize])

  useEffect(() : (() => void) | undefined => {
    const root: HTMLDivElement | null = tableBodyRef.current
    const target: HTMLDivElement | null = loadMoreRef.current
    if (!hasMoreRows || !root || !target) return
    const observer: IntersectionObserver = new IntersectionObserver((entries: IntersectionObserverEntry[]) : void => {
      if (!entries[0]?.isIntersecting) return
      setVisibleCount((prev: number) : number => (prev >= sortedRows.length ? prev : Math.min(sortedRows.length, prev + batchSize)))
    }, { root, threshold: 0.1 })
    observer.observe(target)
    return () : void => observer.disconnect()
  }, [batchSize, hasMoreRows, pageRows.length, sort?.dir, sort?.key, sortedRows.length, visibleCount])

  const onSort: (key: string, sortable: boolean) => void = useCallback((key: string, sortable: boolean) : void => {
    if (!sortable) return
    setSort((current: SortState | null) : SortState<string> | null => nextSortState(current, key))
    onPageChange(1)
  }, [onPageChange])

  const onHeaderSortKeyDown: (event: React.KeyboardEvent<HTMLTableCellElement>, key: string) => void = useCallback((event: React.KeyboardEvent<HTMLTableCellElement>, key: string) : void => {
    if (!isSortKey(event.key)) return
    event.preventDefault()
    onSort(key, true)
  }, [onSort])

  return (
    <div className={`${styles.tableWrap}${wrapClassName ? ` ${wrapClassName}` : ''}`} {...drawerKeepOpenDataProps()}>
      <div ref={tableBodyRef} className={styles.tableBody}>
        <table className={styles.table}>
          <colgroup>{columnConfigs.map(({ column }: { column: StaticTableColumn<T>; canSort: false; style: { textAlign: 'center' | 'left' | 'right'; width: CSSProperties['width'] | undefined; }; ariaSort: undefined; actionLabel: undefined; } | { column: SortableTableColumn<T>; canSort: true; style: { textAlign: 'center' | 'left' | 'right'; width: CSSProperties['width'] | undefined; }; ariaSort: AriaSortValue; actionLabel: string; }) : React.JSX.Element => <col key={column.key} style={{ width: column.width }} />)}</colgroup>
          <thead>
            <tr>
              {columnConfigs.map(({ column, canSort, style: cellStyle, ariaSort, actionLabel }: { column: StaticTableColumn<T>; canSort: false; style: { textAlign: 'center' | 'left' | 'right'; width: CSSProperties['width'] | undefined; }; ariaSort: undefined; actionLabel: undefined; } | { column: SortableTableColumn<T>; canSort: true; style: { textAlign: 'center' | 'left' | 'right'; width: CSSProperties['width'] | undefined; }; ariaSort: AriaSortValue; actionLabel: string; }) : React.JSX.Element => (
                <th
                  key={column.key}
                  scope="col"
                  style={cellStyle}
                  className={canSort ? styles.sortableTh : undefined}
                  onClick={canSort ? () : void => onSort(column.key, true) : undefined}
                  onKeyDown={canSort ? (event: React.KeyboardEvent<HTMLTableHeaderCellElement>) : void => onHeaderSortKeyDown(event, column.key) : undefined}
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
            {pageRows.map((row: T, rowIndex: number) : React.JSX.Element => {
              const rowId: string = rowIdOf(row)
              const active: boolean = activeRowId === rowId
              const clickable: boolean = Boolean(onRowClick || onRowKeyDown)
              const rowClassName: string | undefined = `${clickable ? styles.rowClickable : ''} ${active ? styles.rowActive : ''}`.trim() || undefined
              return (
                <tr
                  key={rowId}
                  ref={(node: HTMLTableRowElement | null) : void => {
                    if (node) rowRefs.current.set(rowId, node)
                    else rowRefs.current.delete(rowId)
                  }}
                  className={rowClassName}
                  onClick={() : void | undefined => onRowClick?.(row)}
                  onKeyDown={(event: React.KeyboardEvent<HTMLTableRowElement>) : void | undefined => onRowKeyDown?.(row, event)}
                  tabIndex={clickable ? 0 : undefined}
                  aria-current={active ? 'true' : undefined}
                >
                  {columnConfigs.map(({ column, style: cellStyle }: { column: StaticTableColumn<T>; canSort: false; style: { textAlign: 'center' | 'left' | 'right'; width: CSSProperties['width'] | undefined; }; ariaSort: undefined; actionLabel: undefined; } | { column: SortableTableColumn<T>; canSort: true; style: { textAlign: 'center' | 'left' | 'right'; width: CSSProperties['width'] | undefined; }; ariaSort: AriaSortValue; actionLabel: string; }) : React.JSX.Element => (
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
