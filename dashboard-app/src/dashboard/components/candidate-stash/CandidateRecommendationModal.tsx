import { useCallback, useEffect, useRef } from 'react'
import type { CandidateReferenceItemSummary } from '../../../api'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import { formatEaQuantity, formatGroupedNumber } from '../../../utils/format'
import styles from '../common.module.css'
import { CandidateInsightBadges } from './CandidateInsightBadges'
import { useModalFocusTrap } from '../useModalFocusTrap'
import { drawerKeepOpenDataProps } from '../../drawer/drawerDom'
import { ProductThumbnailCell } from '../ProductThumbnailCell'
import modalStyles from './CandidateRecommendationModal.module.css'

export type Props = {
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

export type RecommendationColumn = {
  header: string
  className?: string
  render: (row: CandidateReferenceItemSummary) => React.ReactNode
}

const columns: RecommendationColumn[] = [
  { header: '이미지', render: (row: CandidateReferenceItemSummary) : React.JSX.Element => <ProductThumbnailCell thumbnailUrl={row.thumbnailUrl} alt={row.productName} size="candidate" /> },
  { header: '번호', render: (row: CandidateReferenceItemSummary) : React.JSX.Element => <span className={modalStyles.code}>{row.code}</span> },
  { header: '상품명', render: (row: CandidateReferenceItemSummary) : React.JSX.Element => <span className={modalStyles.name}>{row.productName}</span> },
  { header: '색상', render: (row: CandidateReferenceItemSummary) : React.JSX.Element => <span className={modalStyles.colorCode}>{row.colorCode}</span> },
  { header: '배지', render: (row: CandidateReferenceItemSummary) : React.JSX.Element => <span className={modalStyles.badgeList}><CandidateInsightBadges badges={row.insight.badges} /></span> },
  { header: '자사 기간 총 판매량', className: modalStyles.num, render: (row: CandidateReferenceItemSummary) : string => formatEaQuantity(row.insight.selfQty) },
  { header: '경쟁사 기간 총 판매량', className: modalStyles.num, render: (row: CandidateReferenceItemSummary) : string => formatEaQuantity(row.insight.competitorQty) },
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
}: Props) : React.JSX.Element {
  const selectAllRef: React.RefObject<HTMLInputElement | null> = useRef<HTMLInputElement | null>(null)
  const panelRef: React.RefObject<HTMLDivElement | null> = useRef<HTMLDivElement | null>(null)
  const closeButtonRef: React.RefObject<HTMLButtonElement | null> = useRef<HTMLButtonElement | null>(null)
  const hasError: boolean = Boolean(error)
  const visibleRows: CandidateReferenceItemSummary[] = hasError ? [] : rows
  const selectedCount: number = visibleRows.reduce((count: number, row: CandidateReferenceItemSummary) : number => count + (selectedUuids.has(row.uuid) ? 1 : 0), 0)
  const allSelected: boolean = visibleRows.length > 0 && selectedCount === visibleRows.length
  const partiallySelected: boolean = selectedCount > 0 && selectedCount < visibleRows.length
  const canApply: boolean = !loading && !applying && !hasError && selectedCount > 0

  useEffect(() : void => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = partiallySelected
  }, [partiallySelected])

  const getInitialFocus: () => HTMLInputElement | HTMLButtonElement | null = useCallback(() : HTMLInputElement | HTMLButtonElement | null => (
    selectAllRef.current && !selectAllRef.current.disabled
      ? selectAllRef.current
      : closeButtonRef.current && !closeButtonRef.current.disabled
        ? closeButtonRef.current
        : null
  ), [])
  const handlePanelKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void = useModalFocusTrap({
    panelRef,
    onClose,
    closeDisabled: applying,
    initialFocusRef: selectAllRef,
    getInitialFocus,
  })
  const handleClose: () => void = () : void => {
    if (!applying) onClose()
  }
  const statusText: string = applying
    ? '추천 후보 적용 중'
    : loading
      ? '추천 후보 로딩 중'
      : `추천 ${formatGroupedNumber(visibleRows.length)}개 · 선택 ${formatGroupedNumber(selectedCount)}개`

  return (
    <div className={modalStyles.backdrop} role="presentation" onClick={handleClose} {...drawerKeepOpenDataProps()}>
      <div
        ref={panelRef}
        className={modalStyles.panel}
        role="dialog"
        aria-modal="true"
        aria-busy={loading || applying}
        aria-labelledby="recommendation-modal-title"
        aria-describedby="recommendation-modal-status"
        tabIndex={-1}
        onClick={(event: React.MouseEvent<HTMLDivElement, MouseEvent>) : void => event.stopPropagation()}
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
              {columns.map((column: RecommendationColumn) : React.JSX.Element => <span key={column.header} className={column.className} role="columnheader">{column.header}</span>)}
            </div>
            {loading ? <StatusRow><LoadingSpinner size="inline" label="추천 후보 로딩 중" /> <span role="status" aria-live="polite" aria-atomic="true">조회 데이터 기간 기준 추천 후보를 불러오는 중입니다.</span></StatusRow>
              : error ? <StatusRow error>추천 후보 조회 실패: {error}</StatusRow>
              : visibleRows.length === 0 ? <StatusRow>표시할 추천 후보가 없습니다.</StatusRow>
              : visibleRows.map((row: CandidateReferenceItemSummary) : React.JSX.Element => {
                const selected: boolean = selectedUuids.has(row.uuid)
                return (
                  <label key={row.uuid} className={`${modalStyles.row} ${selected ? modalStyles.rowSelected : ''}`} role="row">
                    <span className={modalStyles.checkCell} role="cell">
                      <input type="checkbox" checked={selected} disabled={loading || applying || hasError} aria-label={`${row.productName} 추천 선택`} onChange={() : void => onToggleItem(row.uuid)} />
                    </span>
                    {columns.map((column: RecommendationColumn) : React.JSX.Element => <span key={column.header} className={column.className} role="cell">{column.render(row)}</span>)}
                  </label>
                )
              })}
          </div>
        </div>

        <div className={modalStyles.footer}>
          <span className={modalStyles.applyMeta}>선택 {formatGroupedNumber(selectedCount)}개</span>
          <div className={modalStyles.actions}>
            <button type="button" className={`${styles.actionBtn} ${styles.btnNeutral}`} onClick={handleClose} disabled={applying}>취소</button>
            <button type="button" className={`${styles.actionBtn} ${styles.btnPrimary}`} onClick={() : false | void => canApply && onApply()} disabled={!canApply}>{applying ? '적용 중' : '추천 적용'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusRow({ children, error = false }: { children: React.ReactNode; error?: boolean }) : React.JSX.Element {
  return (
    <div className={modalStyles.statusRow} role="row">
      <span className={error ? modalStyles.errorText : undefined} role="cell" aria-colspan={8}>
        <span role={error ? 'alert' : 'status'} aria-live={error ? 'assertive' : 'polite'} aria-atomic="true">{children}</span>
      </span>
    </div>
  )
}
