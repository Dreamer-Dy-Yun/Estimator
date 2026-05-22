import type { RefObject } from 'react'
import { formatGroupedNumber, formatRatioDecimalKo } from '../../../utils/format'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import { InnerCandidateOrderEmptyState, InnerCandidateOrderList } from './InnerCandidateOrderList'
import type {
  CandidateStashDetailModalModel,
  InnerCandidateRow,
  InnerCandidateSortKey,
} from './useCandidateStashDetailModal'
import detailStyles from './CandidateStashDetailModal.module.css'

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
  const hasSearchQuery = Boolean(
    model.brandQuery.trim() || model.codeQuery.trim() || model.productNameQuery.trim(),
  )
  const showCandidateItemsLoadAlert = Boolean(model.candidateItemsLoadError && hasCachedItems)

  return (
    <div className={detailStyles.innerDrawerAwareBody}>
      <div className={detailStyles.innerSummaryGrid}>
        <SummaryCard label="합계 오더 수량" value={formatGroupedNumber(model.totals.qty)} unit="EA" />
        <SummaryCard
          label="합계 오더 금액"
          value={formatGroupedNumber(model.totals.expectedOrderAmount)}
          unit="원"
        />
        <SummaryCard
          label="합계 총 기대 매출"
          value={formatGroupedNumber(model.totals.expectedSalesAmount)}
          unit="원"
        />
        <SummaryCard
          label="합계 총 기대 영업 이익"
          value={formatGroupedNumber(model.totals.expectedOpProfit)}
          unit="원"
        />
        <SummaryCard
          label="합계 총 기대 영업이익률"
          value={
            model.totalExpectedOpProfitRatePct == null
              ? '-'
              : formatRatioDecimalKo(model.totalExpectedOpProfitRatePct)
          }
          unit="%"
        />
      </div>

      <div className={detailStyles.innerCandidateListBlock}>
        {showCandidateItemsLoadAlert ? (
          <div
            role="alert"
            aria-live="polite"
            style={{
              marginBottom: 12,
              border: '1px solid rgba(220, 38, 38, 0.35)',
              borderRadius: 12,
              background: 'rgba(254, 242, 242, 0.92)',
              color: '#991b1b',
              padding: '10px 12px',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            이너 후보 목록 갱신 실패: {model.candidateItemsLoadError}
          </div>
        ) : null}
        {model.candidateItemsLoading && !hasCachedItems ? (
          <InnerCandidateOrderEmptyState>
            <LoadingSpinner label="이너 후보 목록을 불러오는 중" />
          </InnerCandidateOrderEmptyState>
        ) : model.drawerError ? (
          <InnerCandidateOrderEmptyState>
            이너 후보 상세 로드 실패: {model.drawerError}
          </InnerCandidateOrderEmptyState>
        ) : model.candidateItemsLoadError && !hasCachedItems ? (
          <InnerCandidateOrderEmptyState>
            이너 후보 목록 로드 실패: {model.candidateItemsLoadError}
          </InnerCandidateOrderEmptyState>
        ) : !hasVisibleRows ? (
          <InnerCandidateOrderEmptyState>
            {hasSearchQuery
              ? '검색 결과가 없습니다.'
              : '등록된 이너 후보가 없습니다.'}
          </InnerCandidateOrderEmptyState>
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

function SummaryCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className={detailStyles.innerSummaryCard}>
      <span className={detailStyles.innerSummaryLabel}>{label}</span>
      <strong className={detailStyles.innerSummaryValue}>
        {value} <span className={detailStyles.innerSummaryUnit}>{unit}</span>
      </strong>
    </div>
  )
}
