import type { SecondaryInboundSplitSource } from '../../../../../api/types/secondary'
import {
  buildSecondaryPlanningSuggestedQuantitiesByRow,
  buildSecondaryPlanningSuggestionRows,
  type SecondaryPlanningSuggestionBasis,
} from '../../../../../utils/secondaryInboundSplitPlanning'
import type { InboundSplitSizeColumn } from './inboundSplitScheduleModel'

export interface InboundSplitSuggestionRowInput {
  readonly inboundDate: string
  readonly excludeSegmentExistingOrderInbound: boolean
}

export type InboundSplitSuggestionBasis = SecondaryPlanningSuggestionBasis

export interface InboundSplitSuggestionRow {
  readonly suggestedQuantitiesBySize: Record<string, number>
  readonly suggestionBasisBySize: Record<string, InboundSplitSuggestionBasis>
}

export function buildInboundSplitSuggestionRows(
  columns: readonly InboundSplitSizeColumn[],
  rows: readonly InboundSplitSuggestionRowInput[],
  dateEnd: string,
  source: SecondaryInboundSplitSource,
): InboundSplitSuggestionRow[] {
  return buildSecondaryPlanningSuggestionRows(columns, rows, dateEnd, source)
}

export function buildInboundSplitSuggestedQuantitiesByRow(
  columns: readonly InboundSplitSizeColumn[],
  rows: readonly InboundSplitSuggestionRowInput[],
  dateEnd: string,
  source: SecondaryInboundSplitSource,
): Record<string, number>[] {
  return buildSecondaryPlanningSuggestedQuantitiesByRow(columns, rows, dateEnd, source)
}
