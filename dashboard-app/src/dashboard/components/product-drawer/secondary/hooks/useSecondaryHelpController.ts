import type { PortalHelpPlacement } from '../../../PortalHelpPopover'
import { useId } from 'react'
import { usePortalHelpPopover } from '../../../usePortalHelpPopover'
import type { SecondaryHelpId, SecondaryHelpIds } from '../secondaryDrawerTypes'

export function useSecondaryHelpController() : { portalHelp: { activeId: SecondaryHelpId | null; activePlacement: PortalHelpPlacement; position: { top: number; left: number; }; setAnchor: (id: SecondaryHelpId) => (el: HTMLElement | null) => void; open: (id: SecondaryHelpId, placement: PortalHelpPlacement) => void; updateMeasuredBox: (measuredWidth: number, measuredHeight: number) => void; scheduleClose: () => void; cancelClose: () => void; close: () => void; }; helpIds: SecondaryHelpIds; } {
  return {
    portalHelp: usePortalHelpPopover<SecondaryHelpId>(),
    helpIds: {
      confirmOrder: useId(),
      orderQtyCalc: useId(),
      expectedOpProfitRate: useId(),
      totalOrderBalance: useId(),
      sizeRecQty: useId(),
      salesForecastSizeOrder: useId(),
      inboundSplitSchedule: useId(),
    },
  }
}
