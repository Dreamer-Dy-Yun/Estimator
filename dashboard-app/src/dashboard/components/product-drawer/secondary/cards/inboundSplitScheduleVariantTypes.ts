import type { usePortalHelpPopover } from '../../../usePortalHelpPopover'
import type { SecondaryExistingOrderInboundSupplyBySize, SecondaryInboundSplitSource } from '../../../../../api/types/secondary'
import type { ApiUnitErrorInfo } from '../../../../../types'
import type { SecondaryHelpId } from '../secondaryDrawerTypes'
import type { InboundSplitScheduleRow, InboundSplitSizeColumn } from './inboundSplitScheduleModel'
import type { InboundSplitDraftRequest } from './inboundSplitScheduleTypes'

export type InboundSplitScheduleVariant = 'v0' | 'v1' | 'v2'

export interface InboundSplitScheduleDialogProps {
  open: boolean
  variant?: InboundSplitScheduleVariant
  currentOrderInboundDueDate: string
  nextOrderInboundDueDate: string
  calculationBaseDate: string
  initialCount: number
  initialRows: InboundSplitScheduleRow[]
  columns: InboundSplitSizeColumn[]
  inboundSplitSource?: SecondaryInboundSplitSource | null
  existingOrderInboundSupplyBySize?: SecondaryExistingOrderInboundSupplyBySize | null
  buildRowsForCount: (next: number) => InboundSplitScheduleRow[]
  recalculateRows: (rows: InboundSplitScheduleRow[]) => InboundSplitScheduleRow[]
  draftError?: ApiUnitErrorInfo | null
  help?: {
    labelId: string
    portal: ReturnType<typeof usePortalHelpPopover<SecondaryHelpId>>
  }
  debugSourcePayload?: unknown
  onDraftError?: (err: unknown | null, request: InboundSplitDraftRequest) => void
  onApply: (rows: InboundSplitScheduleRow[]) => void
  onClose: () => void
}

export interface InboundSplitScheduleTableProps {
  currentOrderInboundDueDate: string
  nextOrderInboundDueDate: string
  rows: InboundSplitScheduleRow[]
  columns: InboundSplitSizeColumn[]
  datesLocked: boolean
  onDatesLockedToggle: () => void
  onDateChange: (rowIndex: number, value: string) => void
  onRowTotalChange: (rowIndex: number, value: string) => void
  onQtyChange: (rowIndex: number, size: string, value: string) => void
}
