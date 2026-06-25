import { formatGroupedNumber } from '../../../../../utils/format'
import { KO } from '../../ko'
import type { InboundSplitScheduleRow, InboundSplitSizeColumn } from './inboundSplitScheduleModel'
import type { InboundSplitDateInterval } from './inboundSplitScheduleDatePolicy'
import type { InboundSplitSuggestionBasis } from './inboundSplitSuggestionModel'

const DAY_MS = 86_400_000 as const

export function formatInboundSplitDateInterval(interval: InboundSplitDateInterval): string {
  if (interval.days == null) return '-'
  return `${interval.days >= 0 ? '+' : ''}${formatGroupedNumber(interval.days)}${KO.unitDays}`
}

function formatTooltipQty(value: number): string {
  return `${formatGroupedNumber(Math.round(value))}${KO.unitEa}`
}

function formatExclusiveEndDate(endDate: string): string {
  const endMs: number = Date.parse(`${endDate}T00:00:00.000Z`)
  if (!Number.isFinite(endMs)) return `${endDate} ${KO.labelPreviousDay}`
  return new Date(endMs - DAY_MS).toISOString().slice(0, 10)
}

export function formatSuggestedBasisTooltip(basis: InboundSplitSuggestionBasis | null): string | undefined {
  if (!basis) return undefined
  const periodText: string = `${basis.intervalStartDate}~${formatExclusiveEndDate(basis.intervalEndDate)}`
  const expectedInboundPeriodText: string = basis.expectedInboundStartDate < basis.expectedInboundEndDate
    ? ` (${basis.expectedInboundStartDate}~${formatExclusiveEndDate(basis.expectedInboundEndDate)})`
    : ''
  const expectedInboundText: string = basis.ignoreExistingOrderInbound && expectedInboundPeriodText
    ? KO.valueNotApplicable
    : formatTooltipQty(basis.expectedInboundQty)
  const lines: string[] = [
    `${KO.labelInboundSplitSuggestionBasis} (${periodText})`,
    `${KO.labelInboundSplitBasisSalesForecast}: ${formatTooltipQty(basis.salesForecastQty)}`,
    `${KO.labelInboundSplitBasisExpectedInbound}${expectedInboundPeriodText}: ${expectedInboundText}`,
    `${KO.labelInboundSplitBasisCarriedStock}: ${formatTooltipQty(basis.carriedStockQty)}`,
    `${KO.labelInboundSplitBasisMinimumStock}: ${formatTooltipQty(basis.minimumStockQty)}`,
  ]
  if (basis.targetEndingStockQty > 0) {
    lines.push(`${KO.labelInboundSplitBasisTargetEndingStock}: ${formatTooltipQty(basis.targetEndingStockQty)}`)
  }
  lines.push(`${KO.rowInboundSplitSuggestedQty}: ${formatTooltipQty(basis.suggestedQty)}`)
  return lines.join('\n')
}

export function aggregateSuggestedBasis(row: InboundSplitScheduleRow, columns: readonly InboundSplitSizeColumn[]): InboundSplitSuggestionBasis | null {
  const bases: InboundSplitSuggestionBasis[] = columns
    .map((column: InboundSplitSizeColumn): InboundSplitSuggestionBasis | undefined => row.suggestionBasisBySize?.[column.size])
    .filter((basis: InboundSplitSuggestionBasis | undefined): basis is InboundSplitSuggestionBasis => basis != null)
  if (!bases.length) return null
  const first: InboundSplitSuggestionBasis = bases[0]
  return bases.reduce((sum: InboundSplitSuggestionBasis, basis: InboundSplitSuggestionBasis): InboundSplitSuggestionBasis => ({
    intervalStartDate: sum.intervalStartDate,
    intervalEndDate: sum.intervalEndDate,
    expectedInboundStartDate: sum.expectedInboundStartDate,
    expectedInboundEndDate: sum.expectedInboundEndDate,
    ignoreExistingOrderInbound: sum.ignoreExistingOrderInbound,
    salesForecastQty: sum.salesForecastQty + basis.salesForecastQty,
    expectedInboundQty: sum.expectedInboundQty + basis.expectedInboundQty,
    carriedStockQty: sum.carriedStockQty + basis.carriedStockQty,
    minimumStockQty: sum.minimumStockQty + basis.minimumStockQty,
    targetEndingStockQty: sum.targetEndingStockQty + basis.targetEndingStockQty,
    suggestedQty: sum.suggestedQty + basis.suggestedQty,
    endingStockQty: sum.endingStockQty + basis.endingStockQty,
  }), {
    intervalStartDate: first.intervalStartDate,
    intervalEndDate: first.intervalEndDate,
    expectedInboundStartDate: first.expectedInboundStartDate,
    expectedInboundEndDate: first.expectedInboundEndDate,
    ignoreExistingOrderInbound: first.ignoreExistingOrderInbound,
    salesForecastQty: 0,
    expectedInboundQty: 0,
    carriedStockQty: 0,
    minimumStockQty: 0,
    targetEndingStockQty: 0,
    suggestedQty: 0,
    endingStockQty: 0,
  })
}
