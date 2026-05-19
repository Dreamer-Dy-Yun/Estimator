import { memo, useCallback, useEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { formatEaQuantity, formatGroupedNumber } from '../../../utils/format'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import { CandidateInsightBadges } from './CandidateInsightBadges'
import type { InnerCandidateRow, InnerCandidateSortKey } from './candidateStashDetailTypes'
import { useInnerCandidateOrderKeyboardFocus } from './useInnerCandidateOrderKeyboardFocus'
import type { AdjacentDirection } from '../../../utils/adjacentListNavigation'
import { isInteractiveControlTarget } from '../../interaction/interactionTarget'
import styles from '../common.module.css'
import detailStyles from './CandidateStashDetailModal.module.css'

type SortHeaderProps = {
  label: string
  sortKey: InnerCandidateSortKey
  activeKey: InnerCandidateSortKey | null
  activeDir: 'asc' | 'desc' | null
  align?: 'left' | 'right'
  onSort: (key: InnerCandidateSortKey) => void
}

function InnerOrderSortHeader({ label, sortKey, activeKey, activeDir, align = 'left', onSort }: SortHeaderProps) {
  const active = activeKey === sortKey
  const sortMark = active ? (activeDir === 'asc' ? '▲' : '▼') : ''

  return (
    <button
      type="button"
      className={`${detailStyles.innerOrderSortHeader} ${
        align === 'right' ? detailStyles.innerOrderSortHeaderNum : ''
      }`}
      onClick={() => onSort(sortKey)}
      aria-label={`${label} 정렬`}
      aria-pressed={active}
    >
      <span>{label}</span>
      <span className={detailStyles.innerOrderSortIcon} aria-hidden="true">{sortMark}</span>
    </button>
  )
}

const OrderMetricCell = memo(function OrderMetricCell({ row, kind }: { row: InnerCandidateRow; kind: 'qty' | 'amount' }) {
  if (row.orderMetricStatus === 'failed') return <span className={detailStyles.innerOrderMetricState}>실패</span>
  if (row.orderMetricStatus !== 'loaded') {
    return <LoadingSpinner size="inline" label="오더 지표 계산 중" showLabel={false} />
  }
  if (kind === 'qty') return <>{formatGroupedNumber(row.insight.expectedSalesQty)} EA</>
  return <>{formatGroupedNumber(row.expectedOrderAmount)} 원</>
})

type InnerCandidateOrderRowProps = {
  row: InnerCandidateRow
  index: number
  selected: boolean
  active: boolean
  drawerOpen: boolean
  rowRefs: RefObject<Map<string, HTMLDivElement>>
  onToggleSelectedItem: (uuid: string) => void
  onToggleItemDrawer: (row: InnerCandidateRow) => void
  onRequestFocusAdjacent: (currentUuid: string | null, direction: AdjacentDirection) => void
}

const InnerCandidateOrderRow = memo(function InnerCandidateOrderRow({
  row,
  index,
  selected,
  active,
  drawerOpen,
  rowRefs,
  onToggleSelectedItem,
  onToggleItemDrawer,
  onRequestFocusAdjacent,
}: InnerCandidateOrderRowProps) {
  const rowRefMap = rowRefs.current
  const setRowRef = useCallback((node: HTMLDivElement | null) => {
    if (node) rowRefMap.set(row.uuid, node)
    else rowRefMap.delete(row.uuid)
  }, [row.uuid, rowRefMap])
  const toggleDrawer = useCallback(() => {
    onToggleItemDrawer(row)
  }, [onToggleItemDrawer, row])
  const toggleSelected = useCallback(() => {
    onToggleSelectedItem(row.uuid)
  }, [onToggleSelectedItem, row.uuid])
  const onRowKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (isInteractiveControlTarget(e.target)) return
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      e.stopPropagation()
      onToggleItemDrawer(row)
      return
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      e.stopPropagation()
      onRequestFocusAdjacent(row.uuid, e.key === 'ArrowDown' ? 'next' : 'prev')
      return
    }
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    e.stopPropagation()
    onToggleItemDrawer(row)
  }, [onRequestFocusAdjacent, onToggleItemDrawer, row])
  const rankToneClass = row.insight.rankTone === 'top'
    ? detailStyles.innerOrderRowTop
    : row.insight.rankTone === 'bottom'
      ? detailStyles.innerOrderRowBottom
      : ''

  return (
    <div
      ref={setRowRef}
      className={`${detailStyles.innerOrderRow} ${rankToneClass} ${active ? detailStyles.innerOrderRowActive : ''}`}
      onClick={toggleDrawer}
      onKeyDown={onRowKeyDown}
      role="listitem"
      tabIndex={0}
      aria-expanded={drawerOpen && active}
      aria-current={active ? 'true' : undefined}
    >
      <span className={detailStyles.innerOrderIndexCell}>{index + 1}</span>
      <span className={detailStyles.innerOrderCheckCell} onClick={(e) => e.stopPropagation()}>
        <label className={detailStyles.innerOrderCheckboxTarget}>
          <input
            type="checkbox"
            checked={selected}
            aria-label={`${row.productName} 선택`}
            onChange={toggleSelected}
          />
        </label>
      </span>
      <span className={detailStyles.innerOrderBrand}>{row.brand}</span>
      <span className={detailStyles.innerOrderCode}>{row.code}</span>
      <span className={detailStyles.innerOrderName}>{row.productName}</span>
      <span className={detailStyles.innerOrderColor}>{row.colorCode}</span>
      <span className={detailStyles.innerOrderConfirmState}>
        {row.isDetailConfirmed ? '상세확정' : '상세미확정'}
      </span>
      <span className={detailStyles.innerOrderCellNum}>{formatEaQuantity(row.insight.selfQty)}</span>
      <span className={detailStyles.innerOrderCellNum}>{formatEaQuantity(row.insight.competitorQty)}</span>
      <span className={detailStyles.innerOrderCellNum}>
        <OrderMetricCell row={row} kind="qty" />
      </span>
      <span className={detailStyles.innerOrderCellNum}>
        <OrderMetricCell row={row} kind="amount" />
      </span>
      <span className={detailStyles.innerOrderBadgeList}>
        <CandidateInsightBadges
          badges={row.insight.badges}
          loading={row.insightStatus === 'loading'}
          failed={row.insightStatus === 'failed'}
        />
      </span>
    </div>
  )
})

type Props = {
  rows: InnerCandidateRow[]
  visibleItemUuids: string[]
  selectedUuidSet: Set<string>
  allVisibleSelected: boolean
  selectAllRef: RefObject<HTMLInputElement | null>
  competitorSalesQtyHeader: string
  activeSortKey: InnerCandidateSortKey | null
  activeSortDir: 'asc' | 'desc' | null
  drawerOpen: boolean
  drawerClosing: boolean
  openedItemUuid: string | null
  keyboardNavigationDisabled?: boolean
  onToggleAllVisibleItems: () => void
  onToggleSelectedItem: (uuid: string) => void
  onToggleItemDrawer: (row: InnerCandidateRow) => void
  onSort: (key: InnerCandidateSortKey) => void
}

export function InnerCandidateOrderList({
  rows,
  visibleItemUuids,
  selectedUuidSet,
  allVisibleSelected,
  selectAllRef,
  competitorSalesQtyHeader,
  activeSortKey,
  activeSortDir,
  drawerOpen,
  drawerClosing,
  openedItemUuid,
  keyboardNavigationDisabled = false,
  onToggleAllVisibleItems,
  onToggleSelectedItem,
  onToggleItemDrawer,
  onSort,
}: Props) {
  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const { activeItemUuid, focusAdjacent } = useInnerCandidateOrderKeyboardFocus({
    rows,
    drawerOpen,
    drawerClosing,
    openedItemUuid,
    disabled: keyboardNavigationDisabled,
    onOpenItemDrawer: onToggleItemDrawer,
  })

  useEffect(() => {
    if (!activeItemUuid) return
    const activeRow = rowRefs.current.get(activeItemUuid)
    if (!activeRow) return
    activeRow.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    activeRow.focus({ preventScroll: true })
  }, [activeItemUuid, rows.length])

  return (
    <div className={detailStyles.innerOrderList} role="list">
      <div className={detailStyles.innerOrderHeader} role="presentation">
        <span className={detailStyles.innerOrderIndexCell} aria-hidden="true" />
        <span className={detailStyles.innerOrderCheckCell}>
          <label className={detailStyles.innerOrderCheckboxTarget}>
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allVisibleSelected}
              disabled={visibleItemUuids.length === 0}
              aria-label="전체 선택"
              onChange={onToggleAllVisibleItems}
            />
          </label>
        </span>
        <InnerOrderSortHeader label="브랜드" sortKey="brand" activeKey={activeSortKey} activeDir={activeSortDir} onSort={onSort} />
        <InnerOrderSortHeader label="품번" sortKey="code" activeKey={activeSortKey} activeDir={activeSortDir} onSort={onSort} />
        <InnerOrderSortHeader label="상품명" sortKey="productName" activeKey={activeSortKey} activeDir={activeSortDir} onSort={onSort} />
        <InnerOrderSortHeader label="색상" sortKey="colorCode" activeKey={activeSortKey} activeDir={activeSortDir} onSort={onSort} />
        <InnerOrderSortHeader label="상태" sortKey="isDetailConfirmed" activeKey={activeSortKey} activeDir={activeSortDir} onSort={onSort} />
        <InnerOrderSortHeader label="자사 기간 총 판매량" sortKey="selfQty" activeKey={activeSortKey} activeDir={activeSortDir} align="right" onSort={onSort} />
        <InnerOrderSortHeader label={competitorSalesQtyHeader} sortKey="competitorQty" activeKey={activeSortKey} activeDir={activeSortDir} align="right" onSort={onSort} />
        <InnerOrderSortHeader label="총 오더 수량" sortKey="expectedSalesQty" activeKey={activeSortKey} activeDir={activeSortDir} align="right" onSort={onSort} />
        <InnerOrderSortHeader label="총 오더 금액" sortKey="expectedOrderAmount" activeKey={activeSortKey} activeDir={activeSortDir} align="right" onSort={onSort} />
      </div>
      {rows.map((row, index) => {
        const selected = selectedUuidSet.has(row.uuid)
        const active = activeItemUuid === row.uuid
        return (
          <InnerCandidateOrderRow
            key={row.uuid}
            row={row}
            index={index}
            selected={selected}
            active={active}
            drawerOpen={drawerOpen}
            rowRefs={rowRefs}
            onToggleSelectedItem={onToggleSelectedItem}
            onToggleItemDrawer={onToggleItemDrawer}
            onRequestFocusAdjacent={focusAdjacent}
          />
        )
      })}
    </div>
  )
}

export function InnerCandidateOrderEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className={`${styles.card} ${detailStyles.emptyState}`}>
      {children}
    </div>
  )
}
