import { useEffect, useRef } from 'react'
import { formatEaQuantity, formatGroupedNumber } from '../../utils/format'
import styles from '../components/common.module.css'
import type { InnerCandidateRow } from '../hooks/useCandidateStashDetailModal'
import { CandidateInsightBadges } from './CandidateInsightBadges'
import pageStyles from './SnapshotConfirmPage.module.css'
import modalStyles from './CandidateRecommendationModal.module.css'

type Props = {
  rows: InnerCandidateRow[]
  selectedUuids: Set<string>
  selectedCount: number
  allSelected: boolean
  partiallySelected: boolean
  onClose: () => void
  onToggleAll: () => void
  onToggleItem: (uuid: string) => void
  onApply: () => void
}

export function CandidateRecommendationModal({
  rows,
  selectedUuids,
  selectedCount,
  allSelected,
  partiallySelected,
  onClose,
  onToggleAll,
  onToggleItem,
  onApply,
}: Props) {
  const selectAllRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!selectAllRef.current) return
    selectAllRef.current.indeterminate = partiallySelected
  }, [partiallySelected])

  return (
    <div
      className={modalStyles.backdrop}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={modalStyles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recommendation-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={modalStyles.header}>
          <div>
            <h3 id="recommendation-modal-title" className={modalStyles.title}>
              추천 보기
            </h3>
            <div className={modalStyles.meta}>
              추천 {formatGroupedNumber(rows.length)}개 · 선택 {formatGroupedNumber(selectedCount)}개
            </div>
          </div>
          <button
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
              <span className={modalStyles.checkCell}>
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  disabled={!rows.length}
                  aria-label="추천 전체 선택"
                  onChange={onToggleAll}
                />
              </span>
              <span>상품코드</span>
              <span>상품명</span>
              <span>배지</span>
              <span className={modalStyles.num}>자사 기간 총 판매량</span>
              <span className={modalStyles.num}>경쟁사 기간 총 판매량</span>
            </div>
            {rows.map((row) => {
              const selected = selectedUuids.has(row.uuid)
              return (
                <label
                  key={row.uuid}
                  className={`${modalStyles.row} ${selected ? modalStyles.rowSelected : ''}`}
                >
                  <span className={modalStyles.checkCell}>
                    <input
                      type="checkbox"
                      checked={selected}
                      aria-label={`${row.productName} 추천 선택`}
                      onChange={() => onToggleItem(row.uuid)}
                    />
                  </span>
                  <span className={modalStyles.code}>{row.productCode}</span>
                  <span className={modalStyles.name}>{row.productName}</span>
                  <span className={modalStyles.badgeList}>
                    <CandidateInsightBadges badges={row.insight.badges} />
                  </span>
                  <span className={modalStyles.num}>{formatEaQuantity(row.insight.selfQty)}</span>
                  <span className={modalStyles.num}>{formatEaQuantity(row.insight.competitorQty)}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className={modalStyles.footer}>
          <span className={modalStyles.applyMeta}>선택 {formatGroupedNumber(selectedCount)}개</span>
          <div className={modalStyles.actions}>
            <button
              type="button"
              className={`${pageStyles.actionBtn} ${pageStyles.btnNeutral}`}
              onClick={onClose}
            >
              취소
            </button>
            <button
              type="button"
              className={`${pageStyles.actionBtn} ${pageStyles.btnPrimary}`}
              onClick={onApply}
              disabled={selectedCount === 0}
            >
              추천 적용
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
