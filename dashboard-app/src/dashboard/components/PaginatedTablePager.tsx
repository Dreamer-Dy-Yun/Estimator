import styles from './common.module.css'

interface PaginatedTablePagerProps {
  totalRows: number
  startIndex: number
  pageSize: number
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function PaginatedTablePager({
  totalRows,
  startIndex,
  pageSize,
  currentPage,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: PaginatedTablePagerProps) {
  const rangeText = totalRows
    ? `${startIndex + 1} - ${Math.min(startIndex + pageSize, totalRows)} / ${totalRows}`
    : '0 / 0'

  return (
    <div className={styles.pager}>
      <div className={styles.pagerInfo}>{rangeText}</div>
      <div className={styles.pagerButtons}>
        <button type="button" onClick={() => onPageChange(1)} disabled={currentPage === 1}>처음</button>
        <button type="button" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>이전</button>
        <span>{currentPage} / {totalPages}</span>
        <button type="button" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>다음</button>
        <button type="button" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}>마지막</button>
        <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </div>
  )
}
