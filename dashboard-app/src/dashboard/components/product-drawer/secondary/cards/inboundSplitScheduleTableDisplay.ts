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

export function formatInboundSplitSuggestionBasisTooltip(basis: InboundSplitSuggestionBasis | null): string | undefined {
  if (!basis) return undefined
  const salesIntervalText: string = `${basis.intervalStartDate}~${formatExclusiveEndDate(basis.intervalEndDate)}`
  const existingOrderInboundPeriodText: string = basis.existingOrderInboundStartDate < basis.existingOrderInboundEndDate
    ? ` (${basis.existingOrderInboundStartDate}~${formatExclusiveEndDate(basis.existingOrderInboundEndDate)})`
    : ''
  const existingOrderInboundText: string = basis.excludeSegmentExistingOrderInbound && existingOrderInboundPeriodText
    ? KO.valueNotApplicable
    : formatTooltipQty(basis.existingOrderInboundQty)
  const lines: string[] = [
    `${KO.labelInboundSplitSuggestionBasis} (${salesIntervalText})`,
    `${KO.labelInboundSplitBasisSalesForecast}: ${formatTooltipQty(basis.salesForecastQty)}`,
    `${KO.labelInboundSplitBasisExistingOrderInbound}: ${existingOrderInboundText}`,
    `${KO.labelInboundSplitBasisOpeningStock}: ${formatTooltipQty(basis.carriedStockQty)}`,
    `${KO.labelInboundSplitBasisMinimumStock}: ${formatTooltipQty(basis.minimumStockQty)}`,
  ]
  if (basis.targetEndingStockQty > 0) {
    lines.push(`${KO.labelInboundSplitBasisTargetEndingStock}: ${formatTooltipQty(basis.targetEndingStockQty)}`)
  }
  lines.push(`${KO.rowInboundSplitSuggestedQty}: ${formatTooltipQty(basis.suggestedQty)}`)
  return lines.join('\n')
}

export function aggregateInboundSplitSuggestionBasisBySize(row: InboundSplitScheduleRow, columns: readonly InboundSplitSizeColumn[]): InboundSplitSuggestionBasis | null {
  const bases: InboundSplitSuggestionBasis[] = columns
    .map((column: InboundSplitSizeColumn): InboundSplitSuggestionBasis | undefined => row.suggestionBasisBySize?.[column.size])
    .filter((basis: InboundSplitSuggestionBasis | undefined): basis is InboundSplitSuggestionBasis => basis != null)
  if (!bases.length) return null
  const first: InboundSplitSuggestionBasis = bases[0]
  return bases.reduce((sum: InboundSplitSuggestionBasis, basis: InboundSplitSuggestionBasis): InboundSplitSuggestionBasis => ({
    intervalStartDate: sum.intervalStartDate,
    intervalEndDate: sum.intervalEndDate,
    existingOrderInboundStartDate: sum.existingOrderInboundStartDate,
    existingOrderInboundEndDate: sum.existingOrderInboundEndDate,
    excludeSegmentExistingOrderInbound: sum.excludeSegmentExistingOrderInbound,
    salesForecastQty: sum.salesForecastQty + basis.salesForecastQty,
    existingOrderInboundQty: sum.existingOrderInboundQty + basis.existingOrderInboundQty,
    carriedStockQty: sum.carriedStockQty + basis.carriedStockQty,
    minimumStockQty: sum.minimumStockQty + basis.minimumStockQty,
    targetEndingStockQty: sum.targetEndingStockQty + basis.targetEndingStockQty,
    suggestedQty: sum.suggestedQty + basis.suggestedQty,
    endingStockQty: sum.endingStockQty + basis.endingStockQty,
  }), {
    intervalStartDate: first.intervalStartDate,
    intervalEndDate: first.intervalEndDate,
    existingOrderInboundStartDate: first.existingOrderInboundStartDate,
    existingOrderInboundEndDate: first.existingOrderInboundEndDate,
    excludeSegmentExistingOrderInbound: first.excludeSegmentExistingOrderInbound,
    salesForecastQty: 0,
    existingOrderInboundQty: 0,
    carriedStockQty: 0,
    minimumStockQty: 0,
    targetEndingStockQty: 0,
    suggestedQty: 0,
    endingStockQty: 0,
  })
}
