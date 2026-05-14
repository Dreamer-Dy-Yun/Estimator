import type { CandidateItemSummary } from '../../../api'
import type { SortState } from '../../../utils/sort'

export type InnerCandidateRow = CandidateItemSummary & { id: string }

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
