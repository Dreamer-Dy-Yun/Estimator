import { useEffect, useMemo, useRef, useState } from 'react'
import type { CandidateStashSummary } from '../../../api'
import { formatDateTimeMinute } from '../../../utils/date'
import { formatEaQuantity, formatGroupedNumber, formatRatioDecimalKo } from '../../../utils/format'
import { useAuth } from '../../../auth/AuthProvider'
import { ConfirmModal } from '../ConfirmModal'
import { DeleteButton } from '../DeleteButton'
import { FilterBar } from '../FilterBar'
import { ProductDrawer } from '../product-drawer/ProductDrawer'
import { stashDetailModalBackdropDataProps } from '../../drawer/drawerDom'
import { useCandidateStashDetailModal, type InnerCandidateRow } from './useCandidateStashDetailModal'
import styles from '../common.module.css'
import { CandidateInsightBadges } from './CandidateInsightBadges'
import { CandidateRecommendationModal } from './CandidateRecommendationModal'
import detailStyles from './CandidateStashDetailModal.module.css'

const ANALYSIS_POPUP_AUTO_DISMISS_SECONDS = 5

type Props = {
  stashUuid: string
  /** 목록에서 열 때 전달하면 후보군 목록 API를 한 번 덜 호출함 */
  stashSummary?: CandidateStashSummary | null
  onClose: () => void
  onStashesInvalidate?: () => void
}

export function CandidateStashDetailModal({ stashUuid, stashSummary, onClose, onStashesInvalidate }: Props) {
  const m = useCandidateStashDetailModal({ stashUuid, stashSummary, onStashesInvalidate })
  const { session } = useAuth()
  const [selectedItemUuids, setSelectedItemUuids] = useState<Set<string>>(() => new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [analysisPopupDismissed, setAnalysisPopupDismissed] = useState(false)
  const [analysisAutoDismissRemainingSec, setAnalysisAutoDismissRemainingSec] = useState(
    ANALYSIS_POPUP_AUTO_DISMISS_SECONDS,
  )
  const [recommendationOpen, setRecommendationOpen] = useState(false)
  const [recommendationSelectedUuids, setRecommendationSelectedUuids] = useState<Set<string>>(() => new Set())
  const selectAllRef = useRef<HTMLInputElement | null>(null)

  const visibleItemUuids = useMemo(() => m.tableRows.map((row) => row.uuid), [m.tableRows])
  const recommendationRows = useMemo(() => {
    const signaledRows = m.tableRows.filter((row) => row.insight.rankTone === 'top' || row.insight.badgeNames.length > 0)
    return signaledRows.length ? signaledRows : m.tableRows
  }, [m.tableRows])
  const recommendationRowUuids = useMemo(() => recommendationRows.map((row) => row.uuid), [recommendationRows])
  const selectedVisibleCount = useMemo(
    () => visibleItemUuids.filter((uuid) => selectedItemUuids.has(uuid)).length,
    [selectedItemUuids, visibleItemUuids],
  )
  const recommendationSelectedCount = useMemo(
    () => recommendationRowUuids.filter((uuid) => recommendationSelectedUuids.has(uuid)).length,
    [recommendationRowUuids, recommendationSelectedUuids],
  )
  const allVisibleSelected = visibleItemUuids.length > 0 && selectedVisibleCount === visibleItemUuids.length
  const partiallyVisibleSelected = selectedVisibleCount > 0 && selectedVisibleCount < visibleItemUuids.length
  const allRecommendationSelected =
    recommendationRowUuids.length > 0 && recommendationSelectedCount === recommendationRowUuids.length
  const partiallyRecommendationSelected =
    recommendationSelectedCount > 0 && recommendationSelectedCount < recommendationRowUuids.length
  const competitorSalesQtyHeader = useMemo(() => {
    const labels = m.tableRows
      .map((row) => row.insight.competitorChannelLabel.trim())
      .filter((label) => label.length > 0)
    const uniqueLabels = [...new Set(labels)]
    return uniqueLabels.length === 1 ? `${uniqueLabels[0]} 기간 총 판매량` : '경쟁사 기간 총 판매량'
  }, [m.tableRows])
  const analysisProgressPct = useMemo(() => {
    const progress = m.analysisProgress
    if (!progress) return 0
    if (progress.totalItems <= 0) return progress.status === 'completed' ? 100 : 0
    return Math.max(0, Math.min(100, Math.round((progress.completedItems / progress.totalItems) * 100)))
  }, [m.analysisProgress])
  const analysisStatusLabel = (() => {
    switch (m.analysisProgress?.status) {
      case 'queued':
        return '대기'
      case 'running':
        return '처리중'
      case 'completed':
        return '완료'
      case 'failed':
        return '실패'
      default:
        return '대기'
    }
  })()
  const analysisIsTerminal = m.analysisProgress?.status === 'completed' || m.analysisProgress?.status === 'failed'
  const showAnalysisPopup = Boolean(m.analysisProgress && !analysisPopupDismissed)

  useEffect(() => {
    setAnalysisPopupDismissed(false)
    setAnalysisAutoDismissRemainingSec(ANALYSIS_POPUP_AUTO_DISMISS_SECONDS)
  }, [stashUuid, m.analysisProgress?.jobId])

  useEffect(() => {
    if (!analysisIsTerminal || analysisPopupDismissed) return
    setAnalysisAutoDismissRemainingSec(ANALYSIS_POPUP_AUTO_DISMISS_SECONDS)
    const timer = window.setInterval(() => {
      setAnalysisAutoDismissRemainingSec((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer)
          setAnalysisPopupDismissed(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [analysisIsTerminal, analysisPopupDismissed, m.analysisProgress?.jobId])

  useEffect(() => {
    if (!selectAllRef.current) return
    selectAllRef.current.indeterminate = partiallyVisibleSelected
  }, [partiallyVisibleSelected])

  useEffect(() => {
    setSelectedItemUuids((prev) => {
      const visible = new Set(visibleItemUuids)
      const next = new Set([...prev].filter((uuid) => visible.has(uuid)))
      return next.size === prev.size ? prev : next
    })
  }, [visibleItemUuids])

  useEffect(() => {
    if (!recommendationOpen) return
    setRecommendationSelectedUuids((prev) => {
      const available = new Set(recommendationRowUuids)
      const next = new Set([...prev].filter((uuid) => available.has(uuid)))
      return next.size === prev.size ? prev : next
    })
  }, [recommendationOpen, recommendationRowUuids])

  const toggleSelectedItem = (uuid: string) => {
    setSelectedItemUuids((prev) => {
      const next = new Set(prev)
      if (next.has(uuid)) next.delete(uuid)
      else next.add(uuid)
      return next
    })
  }

  const openRecommendationModal = () => {
    setRecommendationSelectedUuids(new Set(recommendationRowUuids))
    setRecommendationOpen(true)
  }

  const toggleRecommendationItem = (uuid: string) => {
    setRecommendationSelectedUuids((prev) => {
      const next = new Set(prev)
      if (next.has(uuid)) next.delete(uuid)
      else next.add(uuid)
      return next
    })
  }

  const toggleAllRecommendationItems = () => {
    setRecommendationSelectedUuids(() => {
      if (allRecommendationSelected) return new Set()
      return new Set(recommendationRowUuids)
    })
  }

  const applyRecommendations = () => {
    setSelectedItemUuids(new Set(recommendationSelectedUuids))
    setRecommendationOpen(false)
  }

  const toggleAllVisibleItems = () => {
    setSelectedItemUuids((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const uuid of visibleItemUuids) next.delete(uuid)
      } else {
        for (const uuid of visibleItemUuids) next.add(uuid)
      }
      return next
    })
  }

  const toggleItemDrawer = (row: InnerCandidateRow) => {
    if (m.drawerOpen && m.openedItemUuid === row.uuid) {
      m.closeDrawer()
      return
    }
    void m.openItemDrawer(row)
  }

  return (
    <>
      <div
        className={detailStyles.stashDetailModalBackdrop}
        onClick={() => onClose()}
        role="presentation"
        {...stashDetailModalBackdropDataProps(m.drawerOpen, m.drawerClosing)}
      >
        {showAnalysisPopup && m.analysisProgress && (
          <div
            className={`${detailStyles.analysisStatusCard} ${detailStyles.analysisStatusPopup} ${
              m.analysisError ? detailStyles.analysisStatusCardError : ''
            }`}
            role="status"
            aria-live="polite"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={detailStyles.analysisStatusHead}>
              <strong>AI 스냅샷 분석</strong>
              <span className={detailStyles.analysisStatusHeadActions}>
                <span className={detailStyles.analysisStatusBadge}>{analysisStatusLabel}</span>
                {analysisIsTerminal && (
                  <button
                    type="button"
                    className={`${styles.iconCloseButton} ${detailStyles.analysisStatusDismissBtn}`}
                    onClick={() => setAnalysisPopupDismissed(true)}
                    aria-label="AI 분석 팝업 즉시 닫기"
                    title="즉시 닫기"
                  />
                )}
              </span>
            </div>
            <div
              className={detailStyles.analysisStatusProgressTrack}
              aria-hidden="true"
            >
              <span
                className={detailStyles.analysisStatusProgressFill}
                style={{ width: `${analysisProgressPct}%` }}
              />
            </div>
            <div className={detailStyles.analysisStatusMeta}>
              <span>{m.analysisError ?? m.analysisProgress.message}</span>
              <span>
                {m.analysisProgress.completedItems}/{m.analysisProgress.totalItems}
              </span>
            </div>
            {analysisIsTerminal && (
              <div className={detailStyles.analysisStatusAutoDismissText}>
                이 팝업은 {analysisAutoDismissRemainingSec}초 후에 닫힙니다.
              </div>
            )}
          </div>
        )}

        <div
          className={detailStyles.stashDetailModalPanel}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="stash-detail-modal-title"
        >
          <div className={detailStyles.stashDetailModalBody}>
            {!m.detailTarget ? (
              <div className={styles.card}>
                <div className={detailStyles.emptyState}>해당 후보군을 찾을 수 없습니다.</div>
                <div className={detailStyles.stashDetailModalFooterActions}>
                  <button
                    type="button"
                    className={`${detailStyles.actionBtn} ${detailStyles.btnNeutral}`}
                    onClick={onClose}
                  >
                    닫기
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.card}>
                  <div className={detailStyles.detailHeaderGrid}>
                    <div className={detailStyles.detailHeaderTitleArea}>
                      <h3 id="stash-detail-modal-title" className={detailStyles.detailTitle}>
                        {m.detailTarget.name}
                      </h3>
                    </div>
                    <div className={detailStyles.detailHeaderPeriodCell} aria-label="조회 기준 기간">
                      <span className={detailStyles.detailHeaderPeriodLabel}>조회 기간 :</span>
                      <input
                        className={detailStyles.detailHeaderPeriodInput}
                        type="date"
                        aria-label="조회 시작일"
                        value={m.queryPeriodStart}
                        onChange={(event) => m.onQueryPeriodStartChange(event.target.value)}
                      />
                      <span className={detailStyles.detailHeaderPeriodSeparator}>~</span>
                      <input
                        className={detailStyles.detailHeaderPeriodInput}
                        type="date"
                        aria-label="조회 종료일"
                        value={m.queryPeriodEnd}
                        onChange={(event) => m.onQueryPeriodEndChange(event.target.value)}
                      />
                    </div>
                    <div className={detailStyles.detailMetaStack}>
                      <span className={detailStyles.detailMetaLine}>
                        생성 {formatDateTimeMinute(m.detailTarget.dbCreatedAt)}
                      </span>
                      <span className={detailStyles.detailMetaLine}>
                        변경 {formatDateTimeMinute(m.detailTarget.dbUpdatedAt)}
                      </span>
                    </div>
                    <div className={detailStyles.detailHeaderRecommendationCell}>
                      <button
                        type="button"
                        className={`${detailStyles.actionBtn} ${detailStyles.btnNeutral} ${detailStyles.detailHeaderRecommendationBtn}`}
                        onClick={openRecommendationModal}
                        disabled={!recommendationRows.length}
                      >
                        추천 보기
                      </button>
                    </div>
                    <div className={detailStyles.detailHeaderDeleteCell}>
                      <DeleteButton
                        label="일괄삭제"
                        onClick={() => setBulkDeleteOpen(true)}
                        disabled={selectedItemUuids.size === 0}
                        aria-label="선택 이너 오더 일괄삭제"
                        title={
                          selectedItemUuids.size === 0
                            ? '삭제할 이너 오더를 선택하세요.'
                            : `선택된 이너 오더 ${selectedItemUuids.size}개 삭제`
                        }
                      />
                    </div>
                    <button
                      type="button"
                      className={`${detailStyles.actionBtn} ${detailStyles.btnNeutral} ${detailStyles.detailHeaderCloseBtn}`}
                      onClick={onClose}
                      aria-label="닫기"
                      title="닫기"
                    >
                      ×
                    </button>
                    {m.detailTarget.note && (
                      <div className={detailStyles.detailNoteGridCell}>{m.detailTarget.note}</div>
                    )}
                  </div>
                </div>

                <FilterBar
                  title=""
                  filterClassName={detailStyles.detailFilterGrid}
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
                  filterEndContent={
                    <div className={detailStyles.detailFilterActionCell}>
                      <button
                        type="button"
                        className={detailStyles.orderExcelDownloadBtn}
                        onClick={() => void m.downloadOrderExcel(session?.user.name ?? session?.user.loginId ?? '사용자')}
                        disabled={m.detailLoading || m.orderExportBusy || m.items.length === 0}
                      >
                        {m.orderExportBusy ? '생성 중' : '엑셀 다운로드'}
                      </button>
                    </div>
                  }
                />
                {m.orderExportError && (
                  <div className={detailStyles.orderExportError} role="alert">
                    엑셀 다운로드 실패: {m.orderExportError}
                  </div>
                )}

                <div className={detailStyles.innerDrawerAwareBody}>
                  <div className={detailStyles.innerSummaryGrid}>
                    <div className={detailStyles.innerSummaryCard}>
                      <span className={detailStyles.innerSummaryLabel}>합계 오더 수량</span>
                      <strong className={detailStyles.innerSummaryValue}>
                        {formatGroupedNumber(m.totals.qty)} <span className={detailStyles.innerSummaryUnit}>EA</span>
                      </strong>
                    </div>
                    <div className={detailStyles.innerSummaryCard}>
                      <span className={detailStyles.innerSummaryLabel}>합계 오더 금액</span>
                      <strong className={detailStyles.innerSummaryValue}>
                        {formatGroupedNumber(m.totals.expectedOrderAmount)} <span className={detailStyles.innerSummaryUnit}>원</span>
                      </strong>
                    </div>
                    <div className={detailStyles.innerSummaryCard}>
                      <span className={detailStyles.innerSummaryLabel}>합계 총 기대 매출</span>
                      <strong className={detailStyles.innerSummaryValue}>
                        {formatGroupedNumber(m.totals.expectedSalesAmount)} <span className={detailStyles.innerSummaryUnit}>원</span>
                      </strong>
                    </div>
                    <div className={detailStyles.innerSummaryCard}>
                      <span className={detailStyles.innerSummaryLabel}>합계 총 기대 영업 이익</span>
                      <strong className={detailStyles.innerSummaryValue}>
                        {formatGroupedNumber(m.totals.expectedOpProfit)} <span className={detailStyles.innerSummaryUnit}>원</span>
                      </strong>
                    </div>
                    <div className={detailStyles.innerSummaryCard}>
                      <span className={detailStyles.innerSummaryLabel}>합계 총 기대 영업이익률</span>
                      <strong className={detailStyles.innerSummaryValue}>
                        {m.totalExpectedOpProfitRatePct == null
                          ? '-'
                          : `${formatRatioDecimalKo(m.totalExpectedOpProfitRatePct)}`}
                        <span className={detailStyles.innerSummaryUnit}>%</span>
                      </strong>
                    </div>
                  </div>
                  <div className={detailStyles.innerCandidateListBlock}>
                    {m.detailLoading ? (
                      <div className={`${styles.card} ${detailStyles.emptyState}`}>
                        이너 후보 목록을 불러오는 중...
                      </div>
                    ) : m.drawerError ? (
                      <div className={`${styles.card} ${detailStyles.emptyState}`}>
                        이너 후보 상세 로드 실패: {m.drawerError}
                      </div>
                    ) : m.detailError ? (
                      <div className={`${styles.card} ${detailStyles.emptyState}`}>
                        이너 후보 목록 로드 실패: {m.detailError}
                      </div>
                    ) : !m.tableRows.length ? (
                      <div className={`${styles.card} ${detailStyles.emptyState}`}>
                        {m.brandQuery.trim() || m.productCodeQuery.trim() || m.productNameQuery.trim()
                          ? '검색 결과가 없습니다.'
                          : '등록된 이너 후보가 없습니다.'}
                      </div>
                    ) : (
                      <div className={detailStyles.innerOrderList} role="list">
                        <div className={detailStyles.innerOrderHeader} role="presentation">
                          <span className={detailStyles.innerOrderCheckCell}>
                            <input
                              ref={selectAllRef}
                              type="checkbox"
                              checked={allVisibleSelected}
                              disabled={visibleItemUuids.length === 0}
                              aria-label="전체 선택"
                              onChange={toggleAllVisibleItems}
                            />
                          </span>
                          <span>브랜드</span>
                          <span>상품코드</span>
                          <span>상품명</span>
                          <span className={detailStyles.innerOrderCellNum}>자사 기간 총 판매량</span>
                          <span className={detailStyles.innerOrderCellNum}>{competitorSalesQtyHeader}</span>
                          <span className={detailStyles.innerOrderCellNum}>총 오더수량</span>
                          <span className={detailStyles.innerOrderCellNum}>총 오더 금액</span>
                        </div>
                        {m.tableRows.map((row) => {
                          const selected = selectedItemUuids.has(row.uuid)
                          return (
                            <div
                              key={row.uuid}
                              className={`${detailStyles.innerOrderRow} ${
                                row.insight.rankTone === 'top'
                                  ? detailStyles.innerOrderRowTop
                                  : row.insight.rankTone === 'bottom'
                                    ? detailStyles.innerOrderRowBottom
                                    : ''
                              }`}
                              onClick={() => toggleItemDrawer(row)}
                              onKeyDown={(e) => {
                                const target = e.target as HTMLElement | null
                                if (target?.closest('input, button, a, select, textarea')) return
                                if (e.key !== 'Enter' && e.key !== ' ') return
                                e.preventDefault()
                                toggleItemDrawer(row)
                              }}
                              role="listitem"
                              tabIndex={0}
                              aria-expanded={m.drawerOpen && m.openedItemUuid === row.uuid}
                            >
                              <span className={detailStyles.innerOrderCheckCell}>
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  aria-label={`${row.productName} 선택`}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={() => toggleSelectedItem(row.uuid)}
                                />
                              </span>
                              <span className={detailStyles.innerOrderBrand}>{row.brand}</span>
                              <span className={detailStyles.innerOrderCode}>{row.productCode}</span>
                              <span className={detailStyles.innerOrderName}>{row.productName}</span>
                              <span className={detailStyles.innerOrderCellNum}>
                                {formatEaQuantity(row.insight.selfQty)}
                              </span>
                              <span className={detailStyles.innerOrderCellNum}>
                                {formatEaQuantity(row.insight.competitorQty)}
                              </span>
                              <span className={detailStyles.innerOrderCellNum}>
                                {formatGroupedNumber(row.insight.expectedSalesQty)} EA
                              </span>
                              <span className={detailStyles.innerOrderCellNum}>
                                {formatGroupedNumber(row.expectedOrderAmount)} 원
                              </span>
                              <span className={detailStyles.innerOrderBadgeList}>
                                <CandidateInsightBadges
                                  badgeNames={row.insight.badgeNames}
                                  definitions={m.badgeDefinitions}
                                />
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

      {recommendationOpen && (
        <CandidateRecommendationModal
          rows={recommendationRows}
          badgeDefinitions={m.badgeDefinitions}
          selectedUuids={recommendationSelectedUuids}
          selectedCount={recommendationSelectedCount}
          allSelected={allRecommendationSelected}
          partiallySelected={partiallyRecommendationSelected}
          onClose={() => setRecommendationOpen(false)}
          onToggleAll={toggleAllRecommendationItems}
          onToggleItem={toggleRecommendationItem}
          onApply={applyRecommendations}
        />
      )}

      <ProductDrawer
        summary={m.mergedSummary}
        stockTrend={m.bundle?.stockTrend ?? []}
        suppressDocumentLayoutShift
        closing={m.drawerClosing}
        onClose={m.closeDrawer}
        periodStart={m.periodStart!}
        periodEnd={m.periodEnd!}
        forecastMonths={m.fc}
        onForecastMonthsChange={m.onDrawerForecastMonthsChange}
        hydrateSnapshot={m.hydrateSnap}
        onRequestNavigateAdjacent={m.onRequestNavigateAdjacent}
        disableAdjacentNavigation={Boolean(bulkDeleteOpen || m.itemDeleteTarget)}
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
        open={bulkDeleteOpen}
        busy={m.bulkDeleteBusy}
        title="일괄삭제 확인"
        message={
          selectedItemUuids.size > 0
            ? <>선택된 이너 오더 <b>{selectedItemUuids.size}</b>개를 삭제할까요?</>
            : '삭제할 이너 오더가 선택되지 않았습니다.'
        }
        confirmText="일괄삭제"
        confirmingText="삭제 중…"
        dialogTitleId="bulk-item-delete-dialog-title"
        keepOpenAttr
        classNames={{
          backdrop: detailStyles.confirmModalBackdrop,
          panel: detailStyles.confirmModalPanel,
          title: detailStyles.confirmModalTitle,
          text: detailStyles.confirmModalText,
          actions: detailStyles.confirmModalActions,
          button: detailStyles.confirmModalBtn,
          cancelButton: detailStyles.confirmModalBtnCancel,
          confirmButton: detailStyles.confirmModalBtnDanger,
        }}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={async () => {
          await m.confirmDeleteItems([...selectedItemUuids])
          setSelectedItemUuids(new Set())
          setBulkDeleteOpen(false)
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
          backdrop: detailStyles.confirmModalBackdrop,
          panel: detailStyles.confirmModalPanel,
          title: detailStyles.confirmModalTitle,
          text: detailStyles.confirmModalText,
          actions: detailStyles.confirmModalActions,
          button: detailStyles.confirmModalBtn,
          cancelButton: detailStyles.confirmModalBtnCancel,
          confirmButton: detailStyles.confirmModalBtnDanger,
        }}
        onCancel={() => m.setItemDeleteTarget(null)}
        onConfirm={async () => {
          await m.confirmDeleteItem()
        }}
      />
    </>
  )
}
