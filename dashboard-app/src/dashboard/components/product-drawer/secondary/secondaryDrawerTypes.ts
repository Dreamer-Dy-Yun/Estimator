import type { CandidateItemDetail } from '../../../../api'
import type { OrderSnapshotDocumentV2 } from '../../../../snapshot/orderSnapshotTypes'

export type SecondaryHelpId =
  | 'confirmOrder'
  | 'forecastQtyCalc'
  | 'expectedOpProfitRate'
  | 'totalOrderBalance'
  | 'expectedInboundOrderBalance'
  | 'sizeRecQty'
  | 'salesForecastSizeOrder'

export type SecondaryHelpIds = Record<SecondaryHelpId, string>

export type CandidateItemPanelContext = {
  stashName: string
  stashNote: string | null
  itemUuid: string
  isDetailConfirmed: boolean
  confirmedSnapshot?: OrderSnapshotDocumentV2 | null
  hydrateSnapshotSource?: 'confirmed' | 'live' | null
  onDraftChange?: (snapshot: OrderSnapshotDocumentV2, source: 'confirmed' | 'live') => void
  onResetDraft?: () => void
  onRestoreConfirmed?: () => void
  onConfirmed?: (snapshot: OrderSnapshotDocumentV2, updatedItem: CandidateItemDetail) => void
  onUnconfirmed?: (updatedItem: CandidateItemDetail) => void
  onSaved?: () => void
  onRequestDeleteItem: () => void
}
