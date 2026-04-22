import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  deleteCandidateItem,
  deleteCandidateStash,
  getCandidateItemByUuid,
  getCandidateItemsByStash,
  getCandidateStashes,
  type CandidateItemSummary,
  type CandidateStashSummary,
} from '../../api'
import type { ProductPrimarySummary } from '../../types'
import { formatDateTimeMinute } from '../../utils/date'
import { c, pct2n, won } from '../../utils/format'
import { clampForecastMonths } from '../../utils/forecastMonthsStorage'
import { parseOrderSnapshot } from '../../snapshot/parseOrderSnapshot'
import type { OrderSnapshotDocumentV1 } from '../../snapshot/orderSnapshotTypes'
import { AnalysisList } from '../components/AnalysisList'
import { ConfirmModal } from '../components/ConfirmModal'
import { DeleteButton } from '../components/DeleteButton'
import { FilterBar } from '../components/FilterBar'
import { ProductSummaryDrawer } from '../components/ProductSummaryDrawer'
import { useProductDrawerBundle } from '../hooks/useProductDrawerBundle'
import styles from '../components/common.module.css'
import pageStyles from './SnapshotConfirmPage.module.css'

type InnerCandidateRow = CandidateItemSummary & { id: string }

type Props = {
  stashUuid: string
  onClose: () => void
  onStashesInvalidate?: () => void
}

export function CandidateStashDetailModal({ stashUuid, onClose, onStashesInvalidate }: Props) {
  const [stashes, setStashes] = useState<CandidateStashSummary[]>([])
  const [items, setItems] = useState<CandidateItemSummary[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [brandQuery, setBrandQuery] = useState('')
  const [productCodeQuery, setProductCodeQuery] = useState('')
  const [productNameQuery, setProductNameQuery] = useState('')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)
  const [drawerProductId, setDrawerProductId] = useState<string | null>(null)
  const [openedItemUuid, setOpenedItemUuid] = useState<string | null>(null)
  const [hydrateSnap, setHydrateSnap] = useState<OrderSnapshotDocumentV1 | null>(null)
  const [drawerForecastMonths, setDrawerForecastMonths] = useState(8)

  const [itemDeleteTarget, setItemDeleteTarget] = useState<CandidateItemSummary | null>(null)
  const [itemDeleteBusy, setItemDeleteBusy] = useState(false)

  useEffect(() => {
    void (async () => {
      const list = await getCandidateStashes()
      setStashes(list)
    })()
  }, [])

  const loadItems = useCallback(async () => {
    if (!stashUuid) return
    setDetailLoading(true)
    setDetailError(null)
    try {
      const rows = await getCandidateItemsByStash(stashUuid)
      setItems(rows)
    } catch (err) {
      const message = err instanceof Error ? err.message : '이너 후보 목록 스냅샷 데이터가 올바르지 않습니다.'
      setItems([])
      setDetailError(message)
    } finally {
      setDetailLoading(false)
    }
  }, [stashUuid])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  const detailTarget = useMemo(
    () => (stashUuid ? stashes.find((s) => s.uuid === stashUuid) ?? null : null),
    [stashUuid, stashes],
  )

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const bq = brandQuery.trim().toLowerCase()
      const cq = productCodeQuery.trim().toLowerCase()
      const nq = productNameQuery.trim().toLowerCase()
      if (bq && !item.brand.toLowerCase().includes(bq)) return false
      if (cq && !item.productCode.toLowerCase().includes(cq)) return false
      if (nq && !item.productName.toLowerCase().includes(nq)) return false
      return true
    })
  }, [brandQuery, items, productCodeQuery, productNameQuery])

  const tableRows = useMemo(
    (): InnerCandidateRow[] => filteredItems.map((item) => ({ ...item, id: item.uuid })),
    [filteredItems],
  )

  const totals = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => {
        acc.qty += item.qty
        acc.orderAmount += item.orderAmount
        acc.expectedSalesAmount += item.expectedSalesAmount
        acc.expectedOpProfit += item.expectedOpProfit
        return acc
      },
      { qty: 0, orderAmount: 0, expectedSalesAmount: 0, expectedOpProfit: 0 },
    )
  }, [filteredItems])

  const totalExpectedOpProfitRatePct = useMemo(() => {
    if (totals.expectedSalesAmount <= 0) return null
    return (totals.expectedOpProfit / totals.expectedSalesAmount) * 100
  }, [totals.expectedOpProfit, totals.expectedSalesAmount])

  const fc = clampForecastMonths(drawerForecastMonths)
  const bundle = useProductDrawerBundle(drawerOpen ? drawerProductId : null, fc)

  const mergedSummary = useMemo((): ProductPrimarySummary | null => {
    if (!bundle || !drawerProductId) return null
    const snap1 = hydrateSnap?.drawer1?.summary
    if (!snap1) return bundle.summary
    return {
      ...bundle.summary,
      ...snap1,
      monthlySalesTrend: bundle.summary.monthlySalesTrend,
    }
  }, [bundle, drawerProductId, hydrateSnap])

  const periodStart = hydrateSnap?.context.periodStart
  const periodEnd = hydrateSnap?.context.periodEnd
  if (drawerOpen && (!periodStart || !periodEnd)) {
    throw new Error('후보 스냅샷 기간 정보 누락')
  }

  const openItemDrawer = async (row: InnerCandidateRow) => {
    setDrawerError(null)
    try {
      const detail = await getCandidateItemByUuid(row.uuid)
      if (!detail) throw new Error(`후보 상세 데이터 없음: ${row.uuid}`)
      const snap = parseOrderSnapshot(detail.details)
      setHydrateSnap(snap)
      setDrawerForecastMonths(clampForecastMonths(snap.context.forecastMonths))
      setDrawerProductId(row.productId)
      setOpenedItemUuid(row.uuid)
      setDrawerOpen(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : '후보 상세 스냅샷 로드에 실패했습니다.'
      setDrawerError(message)
    }
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setDrawerProductId(null)
    setOpenedItemUuid(null)
    setHydrateSnap(null)
  }

  const onDrawerForecastMonthsChange = useCallback((n: number) => {
    setDrawerForecastMonths(clampForecastMonths(n))
  }, [])

  const refreshStashes = useCallback(async () => {
    const list = await getCandidateStashes()
    setStashes(list)
    onStashesInvalidate?.()
  }, [onStashesInvalidate])

  return (
    <>
      <div
        className={pageStyles.stashDetailModalBackdrop}
        onClick={() => onClose()}
        role="presentation"
      >
        <div
          className={pageStyles.stashDetailModalPanel}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="stash-detail-modal-title"
        >
          <div className={pageStyles.stashDetailModalBody}>
            {!detailTarget ? (
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
                        {detailTarget.name}
                      </h3>
                    </div>
                    <div className={pageStyles.detailMetaStack}>
                      <span className={pageStyles.detailMetaLine}>
                        생성 {formatDateTimeMinute(detailTarget.dbCreatedAt)}
                      </span>
                      <span className={pageStyles.detailMetaLine}>
                        변경 {formatDateTimeMinute(detailTarget.dbUpdatedAt)}
                      </span>
                    </div>
                    <div className={pageStyles.detailHeaderDeleteCell}>
                      <DeleteButton onClick={() => setDeleteOpen(true)} aria-label="후보군 삭제" />
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
                    {detailTarget.note && (
                      <div className={pageStyles.detailNoteGridCell}>{detailTarget.note}</div>
                    )}
                  </div>
                </div>

                <FilterBar
                  title=""
                  fields={[
                    {
                      label: '브랜드',
                      kind: 'input',
                      inputType: 'text',
                      value: brandQuery,
                      onChange: setBrandQuery,
                    },
                    {
                      label: '상품코드',
                      kind: 'input',
                      inputType: 'text',
                      value: productCodeQuery,
                      onChange: setProductCodeQuery,
                    },
                    {
                      label: '상품명',
                      kind: 'input',
                      inputType: 'text',
                      value: productNameQuery,
                      onChange: setProductNameQuery,
                    },
                  ]}
                />

                <div className={pageStyles.innerSummaryGrid}>
                  <div className={pageStyles.innerSummaryCard}>
                    <span className={pageStyles.innerSummaryLabel}>합계 오더 수량</span>
                    <strong className={pageStyles.innerSummaryValue}>
                      {c(totals.qty)} <span className={pageStyles.innerSummaryUnit}>EA</span>
                    </strong>
                  </div>
                  <div className={pageStyles.innerSummaryCard}>
                    <span className={pageStyles.innerSummaryLabel}>합계 오더 금액</span>
                    <strong className={pageStyles.innerSummaryValue}>
                      {won(totals.orderAmount)} <span className={pageStyles.innerSummaryUnit}>원</span>
                    </strong>
                  </div>
                  <div className={pageStyles.innerSummaryCard}>
                    <span className={pageStyles.innerSummaryLabel}>합계 총 기대 매출</span>
                    <strong className={pageStyles.innerSummaryValue}>
                      {won(totals.expectedSalesAmount)} <span className={pageStyles.innerSummaryUnit}>원</span>
                    </strong>
                  </div>
                  <div className={pageStyles.innerSummaryCard}>
                    <span className={pageStyles.innerSummaryLabel}>합계 총 기대 영업 이익</span>
                    <strong className={pageStyles.innerSummaryValue}>
                      {won(totals.expectedOpProfit)} <span className={pageStyles.innerSummaryUnit}>원</span>
                    </strong>
                  </div>
                  <div className={pageStyles.innerSummaryCard}>
                    <span className={pageStyles.innerSummaryLabel}>합계 총 기대 영업이익률</span>
                    <strong className={pageStyles.innerSummaryValue}>
                      {totalExpectedOpProfitRatePct == null
                        ? '-'
                        : `${pct2n(totalExpectedOpProfitRatePct)}`}
                      <span className={pageStyles.innerSummaryUnit}>%</span>
                    </strong>
                  </div>
                </div>

                <div className={pageStyles.innerCandidateListBlock}>
                  {detailLoading ? (
                    <div className={`${styles.card} ${pageStyles.emptyState}`}>
                      이너 후보 목록을 불러오는 중...
                    </div>
                  ) : drawerError ? (
                    <div className={`${styles.card} ${pageStyles.emptyState}`}>
                      이너 후보 상세 로드 실패: {drawerError}
                    </div>
                  ) : detailError ? (
                    <div className={`${styles.card} ${pageStyles.emptyState}`}>
                      이너 후보 목록 로드 실패: {detailError}
                    </div>
                  ) : !tableRows.length ? (
                    <div className={`${styles.card} ${pageStyles.emptyState}`}>
                      {brandQuery.trim() || productCodeQuery.trim() || productNameQuery.trim()
                        ? '검색 결과가 없습니다.'
                        : '등록된 이너 후보가 없습니다.'}
                    </div>
                  ) : (
                    <AnalysisList<InnerCandidateRow>
                      wrapClassName={pageStyles.innerCandidateTableWrap}
                      columns={[
                        { key: 'brand', header: '브랜드', cell: (r) => r.brand, sortValue: (r) => r.brand },
                        {
                          key: 'productCode',
                          header: '상품코드',
                          cell: (r) => r.productCode,
                          sortValue: (r) => r.productCode,
                        },
                        {
                          key: 'productName',
                          header: '상품명',
                          cell: (r) => r.productName,
                          sortValue: (r) => r.productName,
                        },
                        {
                          key: 'qty',
                          header: '오더 수량 (EA)',
                          cell: (r) => c(r.qty),
                          align: 'right',
                          sortValue: (r) => r.qty,
                        },
                        {
                          key: 'orderAmount',
                          header: '오더 금액 (원)',
                          cell: (r) => won(r.orderAmount),
                          align: 'right',
                          sortValue: (r) => r.orderAmount,
                        },
                        {
                          key: 'expectedSalesAmount',
                          header: '총 기대 매출 (원)',
                          cell: (r) => won(r.expectedSalesAmount),
                          align: 'right',
                          sortValue: (r) => r.expectedSalesAmount,
                        },
                        {
                          key: 'expectedOpProfit',
                          header: '총 기대 영업이익 (원)',
                          cell: (r) => won(r.expectedOpProfit),
                          align: 'right',
                          sortValue: (r) => r.expectedOpProfit,
                        },
                        {
                          key: 'datesMeta',
                          header: '등록·변경',
                          align: 'right',
                          cell: (r) => (
                            <div className={pageStyles.innerCandidateDateStack}>
                              <span className={pageStyles.innerCandidateDateLine}>
                                등록 {formatDateTimeMinute(r.dbCreatedAt)}
                              </span>
                              <span className={pageStyles.innerCandidateDateLine}>
                                변경 {formatDateTimeMinute(r.dbUpdatedAt)}
                              </span>
                            </div>
                          ),
                          sortValue: (r) => r.dbUpdatedAt,
                        },
                        {
                          key: 'delete',
                          header: null,
                          align: 'center',
                          sortable: false,
                          cell: (r) => (
                            <DeleteButton
                              aria-label={`${r.productName} 이너 후보에서 삭제`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setItemDeleteTarget(r)
                              }}
                            />
                          ),
                        },
                      ]}
                      rows={tableRows}
                      onRowClick={(row) => void openItemDrawer(row)}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ProductSummaryDrawer
        summary={mergedSummary}
        stockTrend={bundle?.stockTrend ?? []}
        onClose={closeDrawer}
        periodStart={periodStart!}
        periodEnd={periodEnd!}
        forecastMonths={fc}
        onForecastMonthsChange={onDrawerForecastMonthsChange}
        hydrateSnapshot={hydrateSnap}
        initialExpandSecondary
        candidateItemContext={
          detailTarget && openedItemUuid
            ? {
                stashName: detailTarget.name,
                stashNote: detailTarget.note,
                itemUuid: openedItemUuid,
                onSaved: () => {
                  void loadItems()
                  void refreshStashes()
                },
                onRequestDeleteItem: () => {
                  const row = items.find((i) => i.uuid === openedItemUuid)
                  if (row) setItemDeleteTarget(row)
                },
              }
            : null
        }
      />

      <ConfirmModal
        open={Boolean(deleteOpen && detailTarget)}
        busy={deleteBusy}
        title="삭제 확인"
        message={detailTarget ? <><b>{detailTarget.name}</b> 후보군을 삭제할까요?</> : null}
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
        onCancel={() => setDeleteOpen(false)}
        onConfirm={async () => {
          if (!detailTarget) return
          setDeleteBusy(true)
          try {
            await deleteCandidateStash(detailTarget.uuid)
            await refreshStashes()
            onClose()
          } finally {
            setDeleteBusy(false)
          }
        }}
      />

      <ConfirmModal
        open={Boolean(itemDeleteTarget)}
        busy={itemDeleteBusy}
        title="상품 삭제"
        message={itemDeleteTarget ? <><b>{itemDeleteTarget.productName}</b>을(를) 이너 후보에서 제거할까요?</> : null}
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
        onCancel={() => setItemDeleteTarget(null)}
        onConfirm={async () => {
          if (!itemDeleteTarget) return
          setItemDeleteBusy(true)
          try {
            await deleteCandidateItem(itemDeleteTarget.uuid)
            if (openedItemUuid === itemDeleteTarget.uuid) closeDrawer()
            setItemDeleteTarget(null)
            await loadItems()
            await refreshStashes()
          } finally {
            setItemDeleteBusy(false)
          }
        }}
      />
    </>
  )
}
