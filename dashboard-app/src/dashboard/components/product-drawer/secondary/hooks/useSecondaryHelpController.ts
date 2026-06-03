import type { PortalHelpPlacement } from '../../../PortalHelpPopover'
import { useId } from 'react'
import { usePortalHelpPopover } from '../../../usePortalHelpPopover'
import type { SecondaryHelpId } from '../secondaryDrawerTypes'

export function useSecondaryHelpController() : { portalHelp: { activeId: SecondaryHelpId | null; activePlacement: PortalHelpPlacement; position: { top: number; left: number; }; setAnchor: (id: SecondaryHelpId) => (el: HTMLElement | null) => void; open: (id: SecondaryHelpId, placement: PortalHelpPlacement) => void; updateMeasuredBox: (measuredWidth: number, measuredHeight: number) => void; scheduleClose: () => void; cancelClose: () => void; close: () => void; }; helpIds: { confirmOrder: string; forecastQtyCalc: string; expectedOpProfitRate: string; totalOrderBalance: string; expectedInboundOrderBalance: string; sizeRecQty: string; salesForecastSizeOrder: string; }; } {
  return {
    portalHelp: usePortalHelpPopover<SecondaryHelpId>(),
    helpIds: {
      confirmOrder: useId(),
      forecastQtyCalc: useId(),
      expectedOpProfitRate: useId(),
      totalOrderBalance: useId(),
      expectedInboundOrderBalance: useId(),
      sizeRecQty: useId(),
      salesForecastSizeOrder: useId(),
    },
  }
}
