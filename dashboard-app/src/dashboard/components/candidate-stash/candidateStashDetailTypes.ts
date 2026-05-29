import type { MutableRefObject } from 'react'
import type { CandidateItemSummary, CandidateStashItemSummary, CandidateReferenceItemSummary } from '../../../api'
import type { ToastContextValue } from '../../../components/AppToastContext'
import type { SortState } from '../../../utils/sort'

export type InnerCandidateRow = CandidateItemSummary
export type CandidateMountedRef = MutableRefObject<boolean>
export type CandidateItemsRef = MutableRefObject<CandidateItemSummary[]>
export type CandidateShowToast = ToastContextValue['showToast']
export type CandidateItemStateUpdater =
  | CandidateItemSummary[]
  | ((current: CandidateItemSummary[]) => CandidateItemSummary[])
export type CandidateSetItems = (next: CandidateItemStateUpdater) => void

export type CandidateItemActionScope = {
  stashUuid: string
  companyUuid?: string
  drawerItemUuid: string | null
  itemTargetUuid?: string | null
}

export type AppendRecommendedItems = (
  candidateItems: CandidateStashItemSummary[],
  recommendations: CandidateReferenceItemSummary[],
) => number

export type AppendRecommendedItemsResult =
  | { status: 'applied'; appendedCount: number }
  | { status: 'stale' }
  | { status: 'no-op' }
  | { status: 'empty-selection' }

export type InnerCandidateSortKey =
  | 'brand'
  | 'code'
  | 'productName'
  | 'colorCode'
  | 'isDetailConfirmed'
  | 'selfQty'
  | 'competitorQty'
  | 'expectedSalesQty'
  | 'expectedOrderAmount'

export type InnerCandidateSortState = SortState<InnerCandidateSortKey>
