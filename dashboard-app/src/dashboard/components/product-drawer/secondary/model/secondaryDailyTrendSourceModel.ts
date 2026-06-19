import type {
  SecondaryDailyTrendBaseFlow,
  SecondaryDailyTrendComparisonFlow,
  SecondaryDailyTrendFlowCell,
  SecondaryDailyTrendPoint,
  SecondaryDailyTrendSource,
} from '../../../../../api/types'

const DAY_MS: number = 86_400_000

function parseIsoDateMs(value: string): number {
  const parsed: number = Date.parse(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid daily trend date: ${value}`)
  }
  return parsed
}

function formatIsoDate(dateMs: number): string {
  return new Date(dateMs).toISOString().slice(0, 10)
}

function requireQuantity(value: number, field: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid daily trend source quantity: ${field}`)
  }
  return Math.max(0, Math.round(value))
}

function requireNullableQuantity(value: number | null, field: string): number | null {
  if (value == null) {
    return null
  }
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid daily trend source quantity: ${field}`)
  }
  return Math.max(0, Math.round(value))
}

export interface SecondaryDailyTrendSourceExpectation {
  size: string | null
  dateStart: string
  dateEnd: string
  forecastStartDate: string
}

export function validateSecondaryDailyTrendSource(source: SecondaryDailyTrendSource, expected: SecondaryDailyTrendSourceExpectation): SecondaryDailyTrendSource {
  if (source.size !== expected.size) {
    throw new Error(`Daily trend source size mismatch: expected ${expected.size ?? 'all'}, got ${source.size ?? 'all'}.`)
  }
  return source
}

function getFlowCell(source: SecondaryDailyTrendSource, date: string): SecondaryDailyTrendFlowCell {
  const base: SecondaryDailyTrendBaseFlow | undefined = source.data.base[date]
  const comparison: SecondaryDailyTrendComparisonFlow | undefined = source.data.comparison[date]
  if (base == null || comparison == null) {
    throw new Error(`Missing daily trend source date: ${date}`)
  }
  return { base, comparison }
}

function normalizeBaseFlow(flow: SecondaryDailyTrendBaseFlow, field: string): SecondaryDailyTrendBaseFlow {
  return {
    sale: requireQuantity(flow.sale, `${field}.sale`),
    inbound: requireQuantity(flow.inbound, `${field}.inbound`),
  }
}

function normalizeComparisonFlow(flow: SecondaryDailyTrendComparisonFlow, field: string): SecondaryDailyTrendComparisonFlow {
  return {
    sale: requireQuantity(flow.sale, `${field}.sale`),
    inbound: requireNullableQuantity(flow.inbound, `${field}.inbound`),
  }
}

export function buildSecondaryDailyTrendPoints(source: SecondaryDailyTrendSource, expected: SecondaryDailyTrendSourceExpectation): SecondaryDailyTrendPoint[] {
  const startMs: number = parseIsoDateMs(expected.dateStart)
  const endMs: number = parseIsoDateMs(expected.dateEnd)
  const forecastStartMs: number = parseIsoDateMs(expected.forecastStartDate)
  if (endMs < startMs) {
    throw new Error('Daily trend source dateEnd must be greater than or equal to dateStart.')
  }

  let runningBaseStock: number | null = requireNullableQuantity(source.baseStock, 'baseStock')
  const points: SecondaryDailyTrendPoint[] = []

  for (let cursorMs: number = startMs; cursorMs <= endMs; cursorMs += DAY_MS) {
    const date: string = formatIsoDate(cursorMs)
    const cell: SecondaryDailyTrendFlowCell = getFlowCell(source, date)
    const base: SecondaryDailyTrendBaseFlow = normalizeBaseFlow(cell.base, `${date}.base`)
    const comparison: SecondaryDailyTrendComparisonFlow = normalizeComparisonFlow(cell.comparison, `${date}.comparison`)
    const baseInbound: number = base.inbound

    if (runningBaseStock != null) {
      runningBaseStock = Math.max(0, runningBaseStock + baseInbound - base.sale)
    }

    points.push({
      idx: points.length,
      date,
      month: date.slice(0, 7),
      sales: base.sale,
      stockBar: runningBaseStock,
      inboundAccumBar: base.inbound,
      baseSales: base.sale,
      comparisonSales: comparison.sale,
      isForecast: cursorMs >= forecastStartMs,
    })
  }

  return points
}
