import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import type { CandidateReferenceItemSummary } from '../../../api'
import { formatEaQuantity, formatGroupedNumber } from '../../../utils/format'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import styles from '../common.module.css'
import { CandidateInsightBadges } from './CandidateInsightBadges'
import modalStyles from './CandidateRecommendationModal.module.css'

type Props = {
  rows: CandidateReferenceItemSummary[]
  loading: boolean
  error: string | null
  selectedUuids: Set<string>
  onClose: () => void
  onToggleAll: () => void
  onToggleItem: (uuid: string) => void
  onApply: () => void
}

export function CandidateRecommendationModal({
  rows,
  loading,
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
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const hasError = Boolean(error)
  const visibleRows = hasError ? [] : rows
  const visibleSelectedCount = visibleRows.reduce(
    (count, row) => count + (selectedUuids.has(row.uuid) ? 1 : 0),
    0,
  )
  const allVisibleRowsSelected = visibleRows.length > 0 && visibleSelectedCount === visibleRows.length
  const partiallyVisibleRowsSelected = visibleSelectedCount > 0 && visibleSelectedCount < visibleRows.length
  const canApply = !loading && !hasError && visibleSelectedCount > 0

  useEffect(() => {
    if (!selectAllRef.current) return
    selectAllRef.current.indeterminate = partiallyVisibleRowsSelected
  }, [partiallyVisibleRowsSelected])

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const initialFocus = selectAllRef.current && !selectAllRef.current.disabled
      ? selectAllRef.current
      : closeButtonRef.current

    initialFocus?.focus()

    return () => {
      previousFocusRef.current?.focus()
    }
  }, [])

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }

    if (event.key !== 'Tab') return

    const panel = panelRef.current
    if (!panel) return

    const focusableElements = Array.from(
      panel.querySelectorAll<HTMLElement>(
        [
          'button:not([disabled])',
          'input:not([disabled])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          'a[href]',
          '[tabindex]:not([tabindex="-1"])',
        ].join(','),
      ),
    ).filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1)

    if (!focusableElements.length) {
      event.preventDefault()
      return
    }

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    const activeElement = document.activeElement

    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
      return
    }

    if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }

  return (
    <div
      className={modalStyles.backdrop}
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className={modalStyles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recommendation-modal-title"
        aria-describedby="recommendation-modal-status"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handlePanelKeyDown}
      >
        <div className={modalStyles.header}>
          <div>
            <h3 id="recommendation-modal-title" className={modalStyles.title}>
              추천 보기
            </h3>
            <div
              className={modalStyles.meta}
              id="recommendation-modal-status"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {loading
                ? '추천 후보 로딩 중'
                : `추천 ${formatGroupedNumber(visibleRows.length)}개 · 선택 ${formatGroupedNumber(visibleSelectedCount)}개`}
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className={`${styles.iconCloseButton} ${modalStyles.closeButton}`}
            onClick={onClose}
            aria-label="추천 보기 닫기"
            title="닫기"
          />
        </div>

        <div className={modalStyles.tableWrap}>
          <div className={modalStyles.table} role="table" aria-label="추천 후보 목록">
            <div className={modalStyles.headerRow} role="row">
              <span className={modalStyles.checkCell} role="columnheader">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allVisibleRowsSelected}
                  disabled={loading || hasError || visibleRows.length === 0}
                  aria-label="추천 전체 선택"
                  onChange={onToggleAll}
                />
              </span>
              <span role="columnheader">번호</span>
              <span role="columnheader">상품명</span>
              <span role="columnheader">색상</span>
              <span role="columnheader">배지</span>
              <span className={modalStyles.num} role="columnheader">자사 기간 총 판매량</span>
              <span className={modalStyles.num} role="columnheader">경쟁사 기간 총 판매량</span>
            </div>
            {loading && (
              <div className={modalStyles.statusRow} role="row">
                <div role="cell" aria-colspan={7}>
                  <LoadingSpinner size="inline" label="추천 후보 로딩 중" />
                  <span role="status" aria-live="polite" aria-atomic="true">
                    조회 데이터와 기간 기준 추천 후보를 불러오는 중입니다.
                  </span>
                </div>
              </div>
            )}
            {!loading && error && (
              <div className={modalStyles.statusRow} role="row">
                <span className={modalStyles.errorText} role="cell" aria-colspan={7}>
                  <span role="alert" aria-live="assertive" aria-atomic="true">
                    추천 후보 조회 실패: {error}
                  </span>
                </span>
              </div>
            )}
            {!loading && !error && visibleRows.length === 0 && (
              <div className={modalStyles.statusRow} role="row">
                <span role="cell" aria-colspan={7}>
                  <span role="status" aria-live="polite" aria-atomic="true">
                    표시할 추천 후보가 없습니다.
                  </span>
                </span>
              </div>
            )}
            {visibleRows.map((row) => {
              const selected = selectedUuids.has(row.uuid)
              return (
                <label
                  key={row.uuid}
                  className={`${modalStyles.row} ${selected ? modalStyles.rowSelected : ''}`}
                  role="row"
                >
                  <span className={modalStyles.checkCell} role="cell">
                    <input
                      type="checkbox"
                      checked={selected}
                      aria-label={`${row.productName} 추천 선택`}
                      onChange={() => onToggleItem(row.uuid)}
                    />
                  </span>
                  <span className={modalStyles.code} role="cell">{row.code}</span>
                  <span className={modalStyles.name} role="cell">{row.productName}</span>
                  <span className={modalStyles.colorCode} role="cell">{row.colorCode}</span>
                  <span className={modalStyles.badgeList} role="cell">
                    <CandidateInsightBadges badges={row.insight.badges} />
                  </span>
                  <span className={modalStyles.num} role="cell">{formatEaQuantity(row.insight.selfQty)}</span>
                  <span className={modalStyles.num} role="cell">{formatEaQuantity(row.insight.competitorQty)}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className={modalStyles.footer}>
          <span className={modalStyles.applyMeta}>선택 {formatGroupedNumber(visibleSelectedCount)}개</span>
          <div className={modalStyles.actions}>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.btnNeutral}`}
              onClick={onClose}
            >
              취소
            </button>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.btnPrimary}`}
              onClick={onApply}
              disabled={!canApply}
            >
              추천 적용
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
