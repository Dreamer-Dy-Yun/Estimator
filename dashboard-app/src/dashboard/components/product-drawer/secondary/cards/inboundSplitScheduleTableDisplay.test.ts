import { describe, expect, it } from 'vitest'
import type { InboundSplitSuggestionBasis } from './inboundSplitSuggestionModel'
import { formatInboundSplitSuggestionBasisTooltip } from './inboundSplitScheduleTableDisplay'

function basis(overrides: Partial<InboundSplitSuggestionBasis> = {}): InboundSplitSuggestionBasis {
  return {
    intervalStartDate: '2026-12-24',
    intervalEndDate: '2027-01-10',
    existingOrderInboundStartDate: '2026-12-24',
    existingOrderInboundEndDate: '2027-01-10',
    excludeSegmentExistingOrderInbound: false,
    salesForecastQty: 12,
    existingOrderInboundQty: 3,
    carriedStockQty: 5,
    minimumStockQty: 0,
    targetEndingStockQty: 0,
    suggestedQty: 4,
    endingStockQty: 1,
    ...overrides,
  }
}

describe('formatInboundSplitSuggestionBasisTooltip', (): void => {
  it('keeps the interval on the suggestion basis title only', (): void => {
    const tooltip: string | undefined = formatInboundSplitSuggestionBasisTooltip(basis())

    expect(tooltip).toContain('제안 근거 (2026-12-24~2027-01-09)')
    expect(tooltip).toContain('구간 기오더 입고예정: 3EA')
    expect(tooltip).not.toContain('구간 기오더 입고예정 (2026-12-24~2027-01-09)')
  })
})
