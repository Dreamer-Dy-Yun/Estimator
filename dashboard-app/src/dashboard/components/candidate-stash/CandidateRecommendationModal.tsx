import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { CandidateReferenceItemSummary } from '../../../api'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import { formatEaQuantity, formatGroupedNumber } from '../../../utils/format'
import styles from '../common.module.css'
import { CandidateInsightBadges } from './CandidateInsightBadges'
import { useModalFocusTrap } from '../useModalFocusTrap'
import modalStyles from './CandidateRecommendationModal.module.css'

type Props = {
  rows: CandidateReferenceItemSummary[]
  loading: boolean
  applying: boolean
  error: string | null
  selectedUuids: Set<string>
  onClose: () => void
  onToggleAll: () => void
  onToggleItem: (uuid: string) => void
  onApply: () => void
}

type RecommendationColumn = {
  header: string
  className?: string
  render: (row: CandidateReferenceItemSummary) => ReactNode
}

const columns: RecommendationColumn[] = [
  { header: '번호', render: (row) => <span className={modalStyles.code}>{row.code}</span> },
  { header: '상품명', render: (row) => <span className={modalStyles.name}>{row.productName}</span> },
  { header: '색상', render: (row) => <span className={modalStyles.colorCode}>{row.colorCode}</span> },
  { header: '배지', render: (row) => <span className={modalStyles.badgeList}><CandidateInsightBadges badges={row.insight.badges} /></span> },
  { header: '자사 기간 총 판매량', className: modalStyles.num, render: (row) => formatEaQuantity(row.insight.selfQty) },
  { header: '경쟁사 기간 총 판매량', className: modalStyles.num, render: (row) => formatEaQuantity(row.insight.competitorQty) },
]

export function CandidateRecommendationModal({
  rows,
  loading,
  applying,
  error,
  selectedUuids,
  onClose,
  onToggleAll,
  onToggleItem,
  onApply,
}: Props) {
  const selectAllRef = useRef<HTMLInputElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const hasError = Boolean(error)
  const visibleRows = hasError ? [] : rows
  const selectedCount = visibleRows.reduce((count, row) => count + (selectedUuids.has(row.uuid) ? 1 : 0), 0)
  const allSelected = visibleRows.length > 0 && selectedCount === visibleRows.length
  const partiallySelected = selectedCount > 0 && selectedCount < visibleRows.length
  const canApply = !loading && !applying && !hasError && selectedCount > 0

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = partiallySelected
  }, [partiallySelected])

  const getInitialFocus = useCallback(() => (
    selectAllRef.current && !selectAllRef.current.disabled
      ? selectAllRef.current
      : closeButtonRef.current && !closeButtonRef.current.disabled
        ? closeButtonRef.current
        : null
  ), [])
  const handlePanelKeyDown = useModalFocusTrap({
    panelRef,
    onClose,
    closeDisabled: applying,
    initialFocusRef: selectAllRef,
    getInitialFocus,
  })
  const handleClose = () => {
    if (!applying) onClose()
  }
  const statusText = applying
    ? '추천 후보 적용 중'
    : loading
      ? '추천 후보 로딩 중'
      : `추천 ${formatGroupedNumber(visibleRows.length)}개 · 선택 ${formatGroupedNumber(selectedCount)}개`

  return (
    <div className={modalStyles.backdrop} role="presentation" onClick={handleClose}>
      <div
        ref={panelRef}
        className={modalStyles.panel}
        role="dialog"
        aria-modal="true"
        aria-busy={loading || applying}
        aria-labelledby="recommendation-modal-title"
        aria-describedby="recommendation-modal-status"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handlePanelKeyDown}
      >
        <div className={modalStyles.header}>
          <div>
            <h3 id="recommendation-modal-title" className={modalStyles.title}>추천 보기</h3>
            <div className={modalStyles.meta} id="recommendation-modal-status" role="status" aria-live="polite" aria-atomic="true">
              {statusText}
            </div>
          </div>
          <button ref={closeButtonRef} type="button" className={`${styles.iconCloseButton} ${modalStyles.closeButton}`} onClick={handleClose} disabled={applying} aria-label="추천 보기 닫기" title="닫기" />
        </div>

        <div className={modalStyles.tableWrap}>
          <div className={modalStyles.table} role="table" aria-label="추천 후보 목록">
            <div className={modalStyles.headerRow} role="row">
              <span className={modalStyles.checkCell} role="columnheader">
                <input ref={selectAllRef} type="checkbox" checked={allSelected} disabled={loading || applying || hasError || visibleRows.length === 0} aria-label="추천 전체 선택" onChange={onToggleAll} />
              </span>
              {columns.map((column) => <span key={column.header} className={column.className} role="columnheader">{column.header}</span>)}
            </div>
            {loading ? <StatusRow><LoadingSpinner size="inline" label="추천 후보 로딩 중" /> <span role="status" aria-live="polite" aria-atomic="true">조회 데이터 기간 기준 추천 후보를 불러오는 중입니다.</span></StatusRow>
              : error ? <StatusRow error>추천 후보 조회 실패: {error}</StatusRow>
              : visibleRows.length === 0 ? <StatusRow>표시할 추천 후보가 없습니다.</StatusRow>
              : visibleRows.map((row) => {
                const selected = selectedUuids.has(row.uuid)
                return (
                  <label key={row.uuid} className={`${modalStyles.row} ${selected ? modalStyles.rowSelected : ''}`} role="row">
                    <span className={modalStyles.checkCell} role="cell">
                      <input type="checkbox" checked={selected} disabled={loading || applying || hasError} aria-label={`${row.productName} 추천 선택`} onChange={() => onToggleItem(row.uuid)} />
                    </span>
                    {columns.map((column) => <span key={column.header} className={column.className} role="cell">{column.render(row)}</span>)}
                  </label>
                )
              })}
          </div>
        </div>

        <div className={modalStyles.footer}>
          <span className={modalStyles.applyMeta}>선택 {formatGroupedNumber(selectedCount)}개</span>
          <div className={modalStyles.actions}>
            <button type="button" className={`${styles.actionBtn} ${styles.btnNeutral}`} onClick={handleClose} disabled={applying}>취소</button>
            <button type="button" className={`${styles.actionBtn} ${styles.btnPrimary}`} onClick={() => canApply && onApply()} disabled={!canApply}>{applying ? '적용 중' : '추천 적용'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusRow({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <div className={modalStyles.statusRow} role="row">
      <span className={error ? modalStyles.errorText : undefined} role="cell" aria-colspan={7}>
        <span role={error ? 'alert' : 'status'} aria-live={error ? 'assertive' : 'polite'} aria-atomic="true">{children}</span>
      </span>
    </div>
  )
}
