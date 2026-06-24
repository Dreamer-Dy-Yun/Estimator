import { InboundSplitScheduleDialogV0 } from './InboundSplitScheduleDialogV0'
import { InboundSplitScheduleDialogV1 } from './InboundSplitScheduleDialogV1'
import { InboundSplitScheduleDialogV2 } from './InboundSplitScheduleDialogV2'
import type { InboundSplitScheduleDialogProps } from './inboundSplitScheduleVariantTypes'

export type { InboundSplitDraftRequest } from './inboundSplitScheduleTypes'
export type { InboundSplitScheduleDialogProps, InboundSplitScheduleVariant } from './inboundSplitScheduleVariantTypes'

export function InboundSplitScheduleDialog(props: InboundSplitScheduleDialogProps): React.JSX.Element | null {
  if (props.variant === 'v0') {
    return <InboundSplitScheduleDialogV0 {...props} />
  }
  if (props.variant === 'v2') {
    return <InboundSplitScheduleDialogV2 {...props} />
  }
  if (props.variant === 'v1') {
    return <InboundSplitScheduleDialogV1 {...props} />
  }

  return <InboundSplitScheduleDialogV2 {...props} />
}
