import { useId } from 'react'
import { usePortalHelpPopover } from '../../../usePortalHelpPopover'
import type { SecondaryHelpId } from '../secondaryDrawerTypes'

export function useSecondaryHelpController() {
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
