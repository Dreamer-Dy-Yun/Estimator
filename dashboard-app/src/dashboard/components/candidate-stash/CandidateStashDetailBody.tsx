import type { ReactNode } from 'react'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import { formatGroupedNumber, formatRatioDecimalKo } from '../../../utils/format'
import { InnerCandidateOrderEmptyState, InnerCandidateOrderList } from './InnerCandidateOrderList'
import type { CandidateStashDetailModalModel, InnerCandidateRow, InnerCandidateSortKey } from './useCandidateStashDetailModal'
import detailStyles from './CandidateStashDetailModal.module.css'
import type { RefObject } from 'react'

type Props = {
  model: CandidateStashDetailModalModel
  visibleItemUuids: string[]
  selectedUuidSet: Set<string>
  allVisibleSelected: boolean
  selectAllRef: RefObject<HTMLInputElement | null>
  competitorSalesQtyHeader: string
  activeSortKey: InnerCandidateSortKey | null
  activeSortDir: 'asc' | 'desc' | null
  onToggleAllVisibleItems: () => void
  onToggleSelectedItem: (uuid: string) => void
  onToggleItemDrawer: (row: InnerCandidateRow) => void
  keyboardNavigationDisabled?: boolean
}

const summaryRows = [
  ['합계 오더 수량', 'qty', 'EA'],
  ['합계 오더 금액', 'expectedOrderAmount', '원'],
  ['합계 총 기대 매출', 'expectedSalesAmount', '원'],
  ['합계 총 기대 영업 이익', 'expectedOpProfit', '원'],
] as const

export function CandidateStashDetailBody({
  model,
  visibleItemUuids,
  selectedUuidSet,
  allVisibleSelected,
  selectAllRef,
  competitorSalesQtyHeader,
  activeSortKey,
  activeSortDir,
  onToggleAllVisibleItems,
  onToggleSelectedItem,
  onToggleItemDrawer,
  keyboardNavigationDisabled = false,
}: Props) {
  const hasCachedItems = model.items.length > 0
  const hasVisibleRows = model.tableRows.length > 0
  const hasSearchQuery = Boolean(model.brandQuery.trim() || model.codeQuery.trim() || model.productNameQuery.trim())
  const emptyMessage = model.drawerError
    ? `이너 후보 상세 로드 실패: ${model.drawerError}`
    : model.candidateItemsLoadError && !hasCachedItems
      ? `이너 후보 목록 로드 실패: ${model.candidateItemsLoadError}`
      : hasSearchQuery ? '검색 결과가 없습니다.' : '등록된 이너 후보가 없습니다.'

  return (
    <div className={detailStyles.innerDrawerAwareBody}>
      <div className={detailStyles.innerSummaryGrid}>
        {summaryRows.map(([label, key, unit]) => <SummaryCard key={key} label={label} value={formatGroupedNumber(model.totals[key])} unit={unit} />)}
        <SummaryCard label="합계 총 기대 영업이익률" value={model.totalExpectedOpProfitRatePct == null ? '-' : formatRatioDecimalKo(model.totalExpectedOpProfitRatePct)} unit="%" />
      </div>
      <div className={detailStyles.innerCandidateListBlock}>
        {model.candidateItemsLoadError && hasCachedItems ? <Alert>이너 후보 목록 갱신 실패: {model.candidateItemsLoadError}</Alert> : null}
        {model.candidateItemsLoading && !hasCachedItems ? (
          <InnerCandidateOrderEmptyState><LoadingSpinner label="이너 후보 목록을 불러오는 중" /></InnerCandidateOrderEmptyState>
        ) : !hasVisibleRows || model.drawerError || (model.candidateItemsLoadError && !hasCachedItems) ? (
          <InnerCandidateOrderEmptyState>{emptyMessage}</InnerCandidateOrderEmptyState>
        ) : (
          <InnerCandidateOrderList
            rows={model.tableRows}
            visibleItemUuids={visibleItemUuids}
            selectedUuidSet={selectedUuidSet}
            allVisibleSelected={allVisibleSelected}
            selectAllRef={selectAllRef}
            competitorSalesQtyHeader={competitorSalesQtyHeader}
            activeSortKey={activeSortKey}
            activeSortDir={activeSortDir}
            drawerOpen={model.drawerOpen}
            drawerClosing={model.drawerClosing}
            openedItemUuid={model.openedItemUuid}
            keyboardNavigationDisabled={keyboardNavigationDisabled}
            onToggleAllVisibleItems={onToggleAllVisibleItems}
            onToggleSelectedItem={onToggleSelectedItem}
            onToggleItemDrawer={onToggleItemDrawer}
            onSort={model.toggleTableSort}
          />
        )}
      </div>
    </div>
  )
}

function Alert({ children }: { children: ReactNode }) {
  return <div className={detailStyles.orderExportError} role="alert">{children}</div>
}

function SummaryCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return <div className={detailStyles.innerSummaryCard}><span className={detailStyles.innerSummaryLabel}>{label}</span><strong className={detailStyles.innerSummaryValue}>{value} <span className={detailStyles.innerSummaryUnit}>{unit}</span></strong></div>
}
