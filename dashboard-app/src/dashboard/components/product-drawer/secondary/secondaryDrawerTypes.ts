import type { CandidateItemDetail } from '../../../../api'
import type { OrderSnapshotDocument } from '../../../../snapshot/orderSnapshotTypes'

export type SecondaryHelpId =
  | 'confirmOrder'
  | 'orderQtyCalc'
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
  hasConfirmedOrderSnapshot: boolean
  confirmedSnapshot?: OrderSnapshotDocument | null
  hydrateSnapshotSource?: 'confirmed' | 'live' | null
  onDraftChange?: (snapshot: OrderSnapshotDocument, source: 'confirmed' | 'live') => void
  onResetDraft?: () => void
  onRestoreConfirmed?: () => void
  onConfirmed?: (snapshot: OrderSnapshotDocument, updatedItem: CandidateItemDetail) => void
  onUnconfirmed?: (updatedItem: CandidateItemDetail) => void
  onSaved?: () => void
  onRequestDeleteItem: () => void
}
