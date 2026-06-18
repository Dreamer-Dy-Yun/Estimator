import type { SecondaryInboundSplitSource } from '../../../../../api/types/secondary'
import { buildSecondaryPlanningSuggestedQuantitiesByRow } from '../../../../../utils/secondaryInboundSplitPlanning'
import type { InboundSplitSizeColumn } from './inboundSplitScheduleModel'

export interface InboundSplitSuggestionRowInput {
  readonly inboundDate: string
  readonly ignoreExistingOrderInbound: boolean
}

export function buildInboundSplitSuggestedQuantitiesByRow(
  columns: readonly InboundSplitSizeColumn[],
  rows: readonly InboundSplitSuggestionRowInput[],
  dateEnd: string,
  source: SecondaryInboundSplitSource,
): Record<string, number>[] {
  return buildSecondaryPlanningSuggestedQuantitiesByRow(columns, rows, dateEnd, source)
}
