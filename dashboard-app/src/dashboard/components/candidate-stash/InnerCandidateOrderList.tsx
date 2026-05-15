import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { formatEaQuantity, formatGroupedNumber } from '../../../utils/format'
import { CandidateInsightBadges } from './CandidateInsightBadges'
import type { InnerCandidateRow, InnerCandidateSortKey } from './useCandidateStashDetailModal'
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
  openedItemUuid: string | null
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
  openedItemUuid,
  onToggleAllVisibleItems,
  onToggleSelectedItem,
  onToggleItemDrawer,
  onSort,
}: Props) {
  const rowRefs = useRef(new Map<string, HTMLDivElement>())

  useEffect(() => {
    if (!drawerOpen || !openedItemUuid) return
    const activeRow = rowRefs.current.get(openedItemUuid)
    if (!activeRow) return
    activeRow.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    activeRow.focus({ preventScroll: true })
  }, [drawerOpen, openedItemUuid, rows.length])

  return (
    <div className={detailStyles.innerOrderList} role="list">
      <div className={detailStyles.innerOrderHeader} role="presentation">
        <span className={detailStyles.innerOrderIndexCell} aria-hidden="true" />
        <span className={detailStyles.innerOrderCheckCell}>
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={allVisibleSelected}
            disabled={visibleItemUuids.length === 0}
            aria-label="전체 선택"
            onChange={onToggleAllVisibleItems}
          />
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
        const active = drawerOpen && openedItemUuid === row.uuid
        return (
          <div
            key={row.uuid}
            ref={(node) => {
              if (node) rowRefs.current.set(row.uuid, node)
              else rowRefs.current.delete(row.uuid)
            }}
            className={`${detailStyles.innerOrderRow} ${
              row.insight.rankTone === 'top'
                ? detailStyles.innerOrderRowTop
                : row.insight.rankTone === 'bottom'
                  ? detailStyles.innerOrderRowBottom
                  : ''
            } ${active ? detailStyles.innerOrderRowActive : ''}`}
            onClick={() => onToggleItemDrawer(row)}
            onKeyDown={(e) => {
              const target = e.target as HTMLElement | null
              if (target?.closest('input, button, a, select, textarea')) return
              if (e.key === 'ArrowLeft') {
                e.preventDefault()
                onToggleItemDrawer(row)
                return
              }
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              onToggleItemDrawer(row)
            }}
            role="listitem"
            tabIndex={0}
            aria-expanded={drawerOpen && openedItemUuid === row.uuid}
            aria-current={active ? 'true' : undefined}
          >
            <span className={detailStyles.innerOrderIndexCell}>{index + 1}</span>
            <span className={detailStyles.innerOrderCheckCell}>
              <input
                type="checkbox"
                checked={selected}
                aria-label={`${row.productName} 선택`}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggleSelectedItem(row.uuid)}
              />
            </span>
            <span className={detailStyles.innerOrderBrand}>{row.brand}</span>
            <span className={detailStyles.innerOrderCode}>{row.code}</span>
            <span className={detailStyles.innerOrderName}>{row.productName}</span>
            <span className={detailStyles.innerOrderColor}>{row.colorCode}</span>
            <span className={detailStyles.innerOrderConfirmState}>
              {row.isDetailConfirmed ? '상세확정' : '미확정'}
            </span>
            <span className={detailStyles.innerOrderCellNum}>{formatEaQuantity(row.insight.selfQty)}</span>
            <span className={detailStyles.innerOrderCellNum}>{formatEaQuantity(row.insight.competitorQty)}</span>
            <span className={detailStyles.innerOrderCellNum}>
              {formatGroupedNumber(row.insight.expectedSalesQty)} EA
            </span>
            <span className={detailStyles.innerOrderCellNum}>
              {formatGroupedNumber(row.expectedOrderAmount)} 원
            </span>
            <span className={detailStyles.innerOrderBadgeList}>
              <CandidateInsightBadges badges={row.insight.badges} />
            </span>
          </div>
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
