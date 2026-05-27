import { memo, useCallback, useEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { LoadingSpinner } from '../../../components/LoadingSpinner'
import type { AdjacentDirection } from '../../../utils/adjacentListNavigation'
import { formatEaQuantity, formatGroupedNumber } from '../../../utils/format'
import { isInteractiveControlTarget } from '../../interaction/interactionTarget'
import styles from '../common.module.css'
import { CandidateInsightBadges } from './CandidateInsightBadges'
import type { InnerCandidateRow, InnerCandidateSortKey } from './candidateStashDetailTypes'
import { useInnerCandidateOrderKeyboardFocus } from './useInnerCandidateOrderKeyboardFocus'
import detailStyles from './CandidateStashDetailModal.module.css'

type SortDir = 'asc' | 'desc' | null

type SortHeader = {
  label: string
  sortKey: InnerCandidateSortKey
  align?: 'center' | 'right'
}

type RowProps = {
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

type Props = {
  rows: InnerCandidateRow[]
  visibleItemUuids: string[]
  selectedUuidSet: Set<string>
  allVisibleSelected: boolean
  selectAllRef: RefObject<HTMLInputElement | null>
  competitorSalesQtyHeader: string
  activeSortKey: InnerCandidateSortKey | null
  activeSortDir: SortDir
  drawerOpen: boolean
  drawerClosing: boolean
  openedItemUuid: string | null
  keyboardNavigationDisabled?: boolean
  onToggleAllVisibleItems: () => void
  onToggleSelectedItem: (uuid: string) => void
  onToggleItemDrawer: (row: InnerCandidateRow) => void
  onSort: (key: InnerCandidateSortKey) => void
}

const sortHeaders = (competitorSalesQtyHeader: string): SortHeader[] => [
  { label: '브랜드', sortKey: 'brand' },
  { label: '품번', sortKey: 'code' },
  { label: '상품명', sortKey: 'productName' },
  { label: '색상', sortKey: 'colorCode' },
  { label: '상태', sortKey: 'isDetailConfirmed', align: 'center' },
  { label: '자사 기간 총 판매량', sortKey: 'selfQty', align: 'right' },
  { label: competitorSalesQtyHeader, sortKey: 'competitorQty', align: 'right' },
  { label: '총 오더 수량', sortKey: 'expectedSalesQty', align: 'right' },
  { label: '총 오더 금액', sortKey: 'expectedOrderAmount', align: 'right' },
]

function SortButton({ header, activeKey, activeDir, onSort }: { header: SortHeader; activeKey: InnerCandidateSortKey | null; activeDir: SortDir; onSort: (key: InnerCandidateSortKey) => void }) {
  const active = activeKey === header.sortKey
  const stateLabel = active ? (activeDir === 'asc' ? '오름차순 정렬 적용됨' : '내림차순 정렬 적용됨') : '정렬 적용되지 않음'
  const nextLabel = active && activeDir === 'asc' ? '내림차순으로 정렬' : '오름차순으로 정렬'
  return (
    <button
      type="button"
      className={[detailStyles.innerOrderSortHeader, header.align === 'center' ? detailStyles.innerOrderSortHeaderCenter : '', header.align === 'right' ? detailStyles.innerOrderSortHeaderNum : ''].filter(Boolean).join(' ')}
      onClick={() => onSort(header.sortKey)}
      aria-label={`${header.label} 정렬. 현재 상태: ${stateLabel}. 실행 시 ${nextLabel}`}
      aria-pressed={active}
    >
      <span className={detailStyles.innerOrderSortLabel}>{header.label}</span>
      <span className={detailStyles.innerOrderSortIcon} aria-hidden="true">{active ? (activeDir === 'asc' ? '▲' : '▼') : ''}</span>
    </button>
  )
}

const OrderMetricCell = memo(function OrderMetricCell({ row, kind }: { row: InnerCandidateRow; kind: 'qty' | 'amount' }) {
  if (row.orderMetricStatus === 'failed') return <span className={detailStyles.innerOrderMetricState}>실패</span>
  if (row.orderMetricStatus !== 'loaded') return <LoadingSpinner size="inline" label="오더 지표 계산 중" showLabel={false} />
  return kind === 'qty' ? <>{formatGroupedNumber(row.insight.expectedSalesQty)} EA</> : <>{formatGroupedNumber(row.expectedOrderAmount)} 원</>
})

const InnerCandidateOrderRow = memo(function InnerCandidateOrderRow({ row, index, selected, active, drawerOpen, rowRefs, onToggleSelectedItem, onToggleItemDrawer, onRequestFocusAdjacent }: RowProps) {
  const rowRefMap = rowRefs.current
  const setRowRef = useCallback((node: HTMLDivElement | null) => {
    if (node) rowRefMap.set(row.uuid, node)
    else rowRefMap.delete(row.uuid)
  }, [row.uuid, rowRefMap])
  const onRowKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (isInteractiveControlTarget(event.target)) return
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      event.stopPropagation()
      onToggleItemDrawer(row)
      return
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      event.stopPropagation()
      onRequestFocusAdjacent(row.uuid, event.key === 'ArrowDown' ? 'next' : 'prev')
      return
    }
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    event.stopPropagation()
    onToggleItemDrawer(row)
  }, [onRequestFocusAdjacent, onToggleItemDrawer, row])
  const rankToneClass = row.insight.rankTone === 'top' ? detailStyles.innerOrderRowTop : row.insight.rankTone === 'bottom' ? detailStyles.innerOrderRowBottom : ''

  return (
    <div ref={setRowRef} className={`${detailStyles.innerOrderRow} ${rankToneClass} ${active ? detailStyles.innerOrderRowActive : ''}`} onClick={() => onToggleItemDrawer(row)} onKeyDown={onRowKeyDown} role="listitem" tabIndex={0} aria-expanded={drawerOpen && active} aria-current={active ? 'true' : undefined}>
      <span className={detailStyles.innerOrderCheckCell} onClick={(event) => event.stopPropagation()}>
        <label className={detailStyles.innerOrderCheckboxTarget}><input type="checkbox" checked={selected} aria-label={`${row.productName} 선택`} onChange={() => onToggleSelectedItem(row.uuid)} /></label>
      </span>
      <span className={detailStyles.innerOrderIndexCell}>{index + 1}</span>
      <span className={detailStyles.innerOrderBrand}>{row.brand}</span>
      <span className={detailStyles.innerOrderCode}>{row.code}</span>
      <span className={detailStyles.innerOrderName}>{row.productName}</span>
      <span className={detailStyles.innerOrderColor}>{row.colorCode}</span>
      <span className={detailStyles.innerOrderConfirmState}>{row.isDetailConfirmed ? '상세확정' : '상세미확정'}</span>
      <span className={detailStyles.innerOrderCellNum}>{formatEaQuantity(row.insight.selfQty)}</span>
      <span className={detailStyles.innerOrderCellNum}>{formatEaQuantity(row.insight.competitorQty)}</span>
      <span className={detailStyles.innerOrderCellNum}><OrderMetricCell row={row} kind="qty" /></span>
      <span className={detailStyles.innerOrderCellNum}><OrderMetricCell row={row} kind="amount" /></span>
      <span className={detailStyles.innerOrderBadgeList}><CandidateInsightBadges badges={row.insight.badges} loading={row.insightStatus === 'loading'} failed={row.insightStatus === 'failed'} /></span>
    </div>
  )
})

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
  const { activeItemUuid, focusAdjacent } = useInnerCandidateOrderKeyboardFocus({ rows, drawerOpen, drawerClosing, openedItemUuid, disabled: keyboardNavigationDisabled, onOpenItemDrawer: onToggleItemDrawer })
  const onListKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
    event.preventDefault()
    event.stopPropagation()
    focusAdjacent(activeItemUuid, event.key === 'ArrowDown' ? 'next' : 'prev')
  }, [activeItemUuid, focusAdjacent])

  useEffect(() => {
    if (!activeItemUuid) return
    const activeRow = rowRefs.current.get(activeItemUuid)
    activeRow?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    activeRow?.focus({ preventScroll: true })
  }, [activeItemUuid, rows.length])

  return (
    <div className={detailStyles.innerOrderList} role="list" tabIndex={0} onKeyDown={onListKeyDown}>
      <div className={detailStyles.innerOrderHeader} role="presentation">
        <span className={detailStyles.innerOrderCheckCell}>
          <label className={detailStyles.innerOrderCheckboxTarget}><input ref={selectAllRef} type="checkbox" checked={allVisibleSelected} disabled={visibleItemUuids.length === 0} aria-label="전체 선택" onChange={onToggleAllVisibleItems} /></label>
        </span>
        <span className={detailStyles.innerOrderIndexCell} aria-hidden="true" />
        {sortHeaders(competitorSalesQtyHeader).map((header) => <SortButton key={header.sortKey} header={header} activeKey={activeSortKey} activeDir={activeSortDir} onSort={onSort} />)}
      </div>
      {rows.map((row, index) => (
        <InnerCandidateOrderRow key={row.uuid} row={row} index={index} selected={selectedUuidSet.has(row.uuid)} active={activeItemUuid === row.uuid} drawerOpen={drawerOpen} rowRefs={rowRefs} onToggleSelectedItem={onToggleSelectedItem} onToggleItemDrawer={onToggleItemDrawer} onRequestFocusAdjacent={focusAdjacent} />
      ))}
    </div>
  )
}

export function InnerCandidateOrderEmptyState({ children }: { children: ReactNode }) {
  return <div className={`${styles.card} ${detailStyles.emptyState}`}>{children}</div>
}
