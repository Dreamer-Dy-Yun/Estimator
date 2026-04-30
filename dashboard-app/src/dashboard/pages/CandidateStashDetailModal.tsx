import { useState } from 'react'
import type { CandidateItemBadgeSummary, CandidateStashSummary } from '../../api'
import { formatDateTimeMinute } from '../../utils/date'
import { formatGroupedNumber, formatRatioDecimalKo } from '../../utils/format'
import { ConfirmModal } from '../components/ConfirmModal'
import { DeleteButton } from '../components/DeleteButton'
import { FilterBar } from '../components/FilterBar'
import { ProductSummaryDrawer } from '../components/ProductSummaryDrawer'
import { stashDetailModalBackdropDataProps } from '../drawer/drawerDom'
import { useCandidateStashDetailModal } from '../hooks/useCandidateStashDetailModal'
import styles from '../components/common.module.css'
import pageStyles from './SnapshotConfirmPage.module.css'

type Props = {
  stashUuid: string
  /** 목록에서 열 때 전달하면 후보군 목록 API를 한 번 덜 호출함 */
  stashSummary?: CandidateStashSummary | null
  onClose: () => void
  onStashesInvalidate?: () => void
}

function buildBadgeTitle(badge: CandidateItemBadgeSummary) {
  return badge.description
}

function InnerOrderBadge({ badge }: { badge: CandidateItemBadgeSummary }) {
  return (
    <span
      className={pageStyles.innerOrderBadge}
      title={buildBadgeTitle(badge)}
      style={{
        color: badge.style.textColor,
        backgroundColor: badge.style.backgroundColor,
        borderColor: badge.style.borderColor,
      }}
    >
      <span>{badge.label}</span>
    </span>
  )
}

export function CandidateStashDetailModal({ stashUuid, stashSummary, onClose, onStashesInvalidate }: Props) {
  const m = useCandidateStashDetailModal({ stashUuid, stashSummary, onClose, onStashesInvalidate })
  const [selectedItemUuids, setSelectedItemUuids] = useState<Set<string>>(() => new Set())

  const toggleSelectedItem = (uuid: string) => {
    setSelectedItemUuids((prev) => {
      const next = new Set(prev)
      if (next.has(uuid)) next.delete(uuid)
      else next.add(uuid)
      return next
    })
  }

  return (
    <>
      <div
        className={pageStyles.stashDetailModalBackdrop}
        onClick={() => onClose()}
        role="presentation"
        {...stashDetailModalBackdropDataProps(m.drawerOpen)}
      >
        <div
          className={pageStyles.stashDetailModalPanel}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="stash-detail-modal-title"
        >
          <div className={pageStyles.stashDetailModalBody}>
            {!m.detailTarget ? (
              <div className={styles.card}>
                <div className={pageStyles.emptyState}>해당 후보군을 찾을 수 없습니다.</div>
                <div className={pageStyles.stashDetailModalFooterActions}>
                  <button
                    type="button"
                    className={`${pageStyles.actionBtn} ${pageStyles.btnNeutral}`}
                    onClick={onClose}
                  >
                    닫기
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.card}>
                  <div className={pageStyles.detailHeaderGrid}>
                    <div className={pageStyles.detailHeaderTitleArea}>
                      <h3 id="stash-detail-modal-title" className={pageStyles.detailTitle}>
                        {m.detailTarget.name}
                      </h3>
                    </div>
                    <div className={pageStyles.detailMetaStack}>
                      <span className={pageStyles.detailMetaLine}>
                        생성 {formatDateTimeMinute(m.detailTarget.dbCreatedAt)}
                      </span>
                      <span className={pageStyles.detailMetaLine}>
                        변경 {formatDateTimeMinute(m.detailTarget.dbUpdatedAt)}
                      </span>
                    </div>
                    <div className={pageStyles.detailHeaderDeleteCell}>
                      <DeleteButton onClick={() => m.setDeleteOpen(true)} aria-label="후보군 삭제" />
                    </div>
                    <button
                      type="button"
                      className={`${pageStyles.actionBtn} ${pageStyles.btnNeutral} ${pageStyles.detailHeaderCloseBtn}`}
                      onClick={onClose}
                      aria-label="닫기"
                      title="닫기"
                    >
                      ×
                    </button>
                    {m.detailTarget.note && (
                      <div className={pageStyles.detailNoteGridCell}>{m.detailTarget.note}</div>
                    )}
                  </div>
                </div>

                <FilterBar
                  title=""
                  fields={[
                    {
                      label: '브랜드',
                      kind: 'listCombo',
                      inputType: 'text',
                      value: m.brandQuery,
                      onChange: m.setBrandQuery,
                      options: m.brandOptions,
                    },
                    {
                      label: '상품코드',
                      kind: 'listCombo',
                      inputType: 'text',
                      value: m.productCodeQuery,
                      onChange: m.setProductCodeQuery,
                      options: m.productCodeOptions,
                    },
                    {
                      label: '상품명',
                      kind: 'listCombo',
                      inputType: 'text',
                      value: m.productNameQuery,
                      onChange: m.setProductNameQuery,
                      options: m.productNameOptions,
                    },
                  ]}
                />

                <div className={pageStyles.innerDrawerAwareBody}>
                  <div className={pageStyles.innerSummaryGrid}>
                    <div className={pageStyles.innerSummaryCard}>
                      <span className={pageStyles.innerSummaryLabel}>합계 오더 수량</span>
                      <strong className={pageStyles.innerSummaryValue}>
                        {formatGroupedNumber(m.totals.qty)} <span className={pageStyles.innerSummaryUnit}>EA</span>
                      </strong>
                    </div>
                    <div className={pageStyles.innerSummaryCard}>
                      <span className={pageStyles.innerSummaryLabel}>합계 오더 금액</span>
                      <strong className={pageStyles.innerSummaryValue}>
                        {formatGroupedNumber(m.totals.expectedOrderAmount)} <span className={pageStyles.innerSummaryUnit}>원</span>
                      </strong>
                    </div>
                    <div className={pageStyles.innerSummaryCard}>
                      <span className={pageStyles.innerSummaryLabel}>합계 총 기대 매출</span>
                      <strong className={pageStyles.innerSummaryValue}>
                        {formatGroupedNumber(m.totals.expectedSalesAmount)} <span className={pageStyles.innerSummaryUnit}>원</span>
                      </strong>
                    </div>
                    <div className={pageStyles.innerSummaryCard}>
                      <span className={pageStyles.innerSummaryLabel}>합계 총 기대 영업 이익</span>
                      <strong className={pageStyles.innerSummaryValue}>
                        {formatGroupedNumber(m.totals.expectedOpProfit)} <span className={pageStyles.innerSummaryUnit}>원</span>
                      </strong>
                    </div>
                    <div className={pageStyles.innerSummaryCard}>
                      <span className={pageStyles.innerSummaryLabel}>합계 총 기대 영업이익률</span>
                      <strong className={pageStyles.innerSummaryValue}>
                        {m.totalExpectedOpProfitRatePct == null
                          ? '-'
                          : `${formatRatioDecimalKo(m.totalExpectedOpProfitRatePct)}`}
                        <span className={pageStyles.innerSummaryUnit}>%</span>
                      </strong>
                    </div>
                  </div>
                  <div className={pageStyles.innerCandidateListBlock}>
                    {m.detailLoading ? (
                      <div className={`${styles.card} ${pageStyles.emptyState}`}>
                        이너 후보 목록을 불러오는 중...
                      </div>
                    ) : m.drawerError ? (
                      <div className={`${styles.card} ${pageStyles.emptyState}`}>
                        이너 후보 상세 로드 실패: {m.drawerError}
                      </div>
                    ) : m.detailError ? (
                      <div className={`${styles.card} ${pageStyles.emptyState}`}>
                        이너 후보 목록 로드 실패: {m.detailError}
                      </div>
                    ) : !m.tableRows.length ? (
                      <div className={`${styles.card} ${pageStyles.emptyState}`}>
                        {m.brandQuery.trim() || m.productCodeQuery.trim() || m.productNameQuery.trim()
                          ? '검색 결과가 없습니다.'
                          : '등록된 이너 후보가 없습니다.'}
                      </div>
                    ) : (
                      <div className={pageStyles.innerOrderList} role="list">
                        <div className={pageStyles.innerOrderHeader} role="presentation">
                          <span />
                          <span>브랜드</span>
                          <span>상품코드</span>
                          <span>상품명</span>
                          <span>배지</span>
                          <span className={pageStyles.innerOrderCellNum}>총 예상 판매수량</span>
                          <span className={pageStyles.innerOrderCellNum}>총 예상 오더 금액</span>
                        </div>
                        {m.tableRows.map((row) => {
                          const selected = selectedItemUuids.has(row.uuid)
                          return (
                            <div
                              key={row.uuid}
                              className={`${pageStyles.innerOrderRow} ${
                                row.insight.rankTone === 'top'
                                  ? pageStyles.innerOrderRowTop
                                  : row.insight.rankTone === 'bottom'
                                    ? pageStyles.innerOrderRowBottom
                                    : ''
                              }`}
                              onClick={() => void m.openItemDrawer(row)}
                              onKeyDown={(e) => {
                                if (e.key !== 'Enter' && e.key !== ' ') return
                                e.preventDefault()
                                void m.openItemDrawer(row)
                              }}
                              role="listitem"
                              tabIndex={0}
                            >
                              <span className={pageStyles.innerOrderCheckCell}>
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  aria-label={`${row.productName} 선택`}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={() => toggleSelectedItem(row.uuid)}
                                />
                              </span>
                              <span className={pageStyles.innerOrderBrand}>{row.brand}</span>
                              <span className={pageStyles.innerOrderCode}>{row.productCode}</span>
                              <span className={pageStyles.innerOrderName}>{row.productName}</span>
                              <span className={pageStyles.innerOrderBadgeList}>
                                {row.insight.badges.length ? (
                                  row.insight.badges.map((badge) => (
                                    <InnerOrderBadge
                                      key={`${row.uuid}-${badge.id}`}
                                      badge={badge}
                                    />
                                  ))
                                ) : (
                                  <span className={pageStyles.innerOrderNoBadge}>-</span>
                                )}
                              </span>
                              <span className={pageStyles.innerOrderCellNum}>
                                {formatGroupedNumber(row.insight.expectedSalesQty)} EA
                              </span>
                              <span className={pageStyles.innerOrderCellNum}>
                                {formatGroupedNumber(row.expectedOrderAmount)} 원
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ProductSummaryDrawer
        summary={m.mergedSummary}
        stockTrend={m.bundle?.stockTrend ?? []}
        suppressDocumentLayoutShift
        onClose={m.closeDrawer}
        periodStart={m.periodStart!}
        periodEnd={m.periodEnd!}
        forecastMonths={m.fc}
        onForecastMonthsChange={m.onDrawerForecastMonthsChange}
        hydrateSnapshot={m.hydrateSnap}
        onRequestNavigateAdjacent={m.onRequestNavigateAdjacent}
        disableAdjacentNavigation={Boolean(m.deleteOpen || m.itemDeleteTarget)}
        candidateItemContext={
          m.detailTarget && m.openedItemUuid
            ? {
                stashName: m.detailTarget.name,
                stashNote: m.detailTarget.note,
                itemUuid: m.openedItemUuid,
                onSaved: () => {
                  void m.loadItems()
                  void m.refreshStashes()
                },
                onRequestDeleteItem: () => {
                  const row = m.items.find((i) => i.uuid === m.openedItemUuid)
                  if (row) m.setItemDeleteTarget(row)
                },
              }
            : null
        }
      />

      <ConfirmModal
        open={Boolean(m.deleteOpen && m.detailTarget)}
        busy={m.deleteBusy}
        title="삭제 확인"
        message={m.detailTarget ? <><b>{m.detailTarget.name}</b> 후보군을 삭제할까요?</> : null}
        confirmText="삭제"
        confirmingText="삭제 중…"
        dialogTitleId="stash-delete-dialog-title"
        keepOpenAttr
        classNames={{
          backdrop: pageStyles.confirmModalBackdrop,
          panel: pageStyles.confirmModalPanel,
          title: pageStyles.confirmModalTitle,
          text: pageStyles.confirmModalText,
          actions: pageStyles.confirmModalActions,
          button: pageStyles.confirmModalBtn,
          cancelButton: pageStyles.confirmModalBtnCancel,
          confirmButton: pageStyles.confirmModalBtnDanger,
        }}
        onCancel={() => m.setDeleteOpen(false)}
        onConfirm={async () => {
          await m.confirmDeleteStash()
        }}
      />

      <ConfirmModal
        open={Boolean(m.itemDeleteTarget)}
        busy={m.itemDeleteBusy}
        title="상품 삭제"
        message={m.itemDeleteTarget ? <><b>{m.itemDeleteTarget.productName}</b>을(를) 이너 후보에서 제거할까요?</> : null}
        confirmText="삭제"
        confirmingText="삭제 중…"
        dialogTitleId="item-delete-dialog-title"
        keepOpenAttr
        classNames={{
          backdrop: pageStyles.confirmModalBackdrop,
          panel: pageStyles.confirmModalPanel,
          title: pageStyles.confirmModalTitle,
          text: pageStyles.confirmModalText,
          actions: pageStyles.confirmModalActions,
          button: pageStyles.confirmModalBtn,
          cancelButton: pageStyles.confirmModalBtnCancel,
          confirmButton: pageStyles.confirmModalBtnDanger,
        }}
        onCancel={() => m.setItemDeleteTarget(null)}
        onConfirm={async () => {
          await m.confirmDeleteItem()
        }}
      />
    </>
  )
}
