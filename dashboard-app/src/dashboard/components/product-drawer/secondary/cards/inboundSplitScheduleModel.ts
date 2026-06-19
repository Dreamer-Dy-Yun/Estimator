import type { SecondaryInboundSplitSource, SecondaryStockOrderCalcResult, SecondaryStockOrderDisplaySizeRow } from '../../../../../api/types/secondary'
import type { SecondaryConfirmedRound } from '../model/secondaryConfirmedRoundModel'
import type { SecondarySizeOrderDisplayRow } from '../model/secondarySizeOrderRows'
import { buildInboundSplitSuggestionRows, type InboundSplitSuggestionBasis, type InboundSplitSuggestionRow } from './inboundSplitSuggestionModel'

export const MIN_INBOUND_SPLIT_COUNT = 1 as const
export const MAX_INBOUND_SPLIT_COUNT = 10 as const

export interface InboundSplitSizeColumn {
  size: string
  confirmedQty: number
  recommendedQty: number
  expectedInboundBeforeCurrentOrderQty?: number
  targetEndingStockQty?: number
}

export interface InboundSplitScheduleRow {
  id: string
  round: number
  inboundDate: string
  ignoreExistingOrderInbound: boolean
  suggestedQuantitiesBySize: Record<string, number>
  suggestionBasisBySize?: Record<string, InboundSplitSuggestionBasis>
  quantitiesBySize: Record<string, number>
}

type ParsedIsoDate = {
  year: number
  monthIndex: number
  day: number
}

export interface InboundSplitIntegerAllocationInput {
  /**
   * Integer target quantity to distribute. Non-finite or negative values are normalized to 0.
   */
  total: number
  /**
   * Distribution weights by target bucket. The returned `values` array preserves this order.
   * If every weight is 0 or invalid, the function falls back to equal weights.
   */
  weights: readonly number[]
}

export interface InboundSplitIntegerAllocationResult {
  /**
   * Distributed non-negative integer quantities. The sum always equals `normalizedTotal`.
   */
  values: number[]
  /**
   * Normalized non-negative integer target used by the allocator.
   */
  normalizedTotal: number
}

export function clampInboundSplitCount(value: number): number {
  if (!Number.isFinite(value)) return MIN_INBOUND_SPLIT_COUNT
  return Math.min(MAX_INBOUND_SPLIT_COUNT, Math.max(MIN_INBOUND_SPLIT_COUNT, Math.round(value)))
}

export function getInboundSplitSizeColumns(sizeRows: SecondarySizeOrderDisplayRow[], stockOrderDisplay: SecondaryStockOrderCalcResult['display'] | null = null): InboundSplitSizeColumn[] {
  const stockOrderRowBySize: Map<string, SecondaryStockOrderDisplaySizeRow> = new Map((stockOrderDisplay?.sizeRows ?? []).map((row: SecondaryStockOrderDisplaySizeRow): [string, SecondaryStockOrderDisplaySizeRow] => [row.size, row]))
  return sizeRows.map((row: SecondarySizeOrderDisplayRow): InboundSplitSizeColumn => ({
    size: row.size,
    confirmedQty: Math.max(0, Math.round(row.confirmQty)),
    recommendedQty: Math.max(0, Math.round(row.recommendedQty)),
    expectedInboundBeforeCurrentOrderQty: Math.max(0, Math.round(stockOrderRowBySize.get(row.size)?.expectedInboundOrderBalance ?? 0)),
    targetEndingStockQty: Math.max(0, Math.round(row.bufferQty ?? 0)),
  }))
}

export function getInboundSplitTotalQty(row: InboundSplitScheduleRow, columns: readonly InboundSplitSizeColumn[]): number {
  return columns.reduce((sum: number, column: InboundSplitSizeColumn): number => sum + Math.max(0, Math.round(row.quantitiesBySize[column.size] ?? 0)), 0)
}

export function cloneInboundSplitRows(rows: readonly InboundSplitScheduleRow[]): InboundSplitScheduleRow[] {
  return rows.map((row: InboundSplitScheduleRow): InboundSplitScheduleRow => ({
    ...row,
    suggestedQuantitiesBySize: { ...row.suggestedQuantitiesBySize },
    suggestionBasisBySize: { ...(row.suggestionBasisBySize ?? {}) },
    quantitiesBySize: { ...row.quantitiesBySize },
  }))
}

export function confirmedRoundsToInboundSplitRows(rounds: readonly SecondaryConfirmedRound[], columns: readonly InboundSplitSizeColumn[]): InboundSplitScheduleRow[] {
  return rounds.map((round: SecondaryConfirmedRound, index: number): InboundSplitScheduleRow => {
    const quantitiesBySize: Record<string, number> = {}
    columns.forEach((column: InboundSplitSizeColumn): void => {
      quantitiesBySize[column.size] = Math.max(0, Math.round(round.qtyBySize[column.size] ?? 0))
    })
    return {
      id: `confirmed-round-${index + 1}`,
      round: index + 1,
      inboundDate: round.date,
      ignoreExistingOrderInbound: round.ignoreExistingOrderInbound,
      suggestedQuantitiesBySize: {},
      suggestionBasisBySize: {},
      quantitiesBySize,
    }
  })
}

export function inboundSplitRowsToConfirmedRounds(rows: readonly InboundSplitScheduleRow[], columns: readonly InboundSplitSizeColumn[]): SecondaryConfirmedRound[] {
  return rows.map((row: InboundSplitScheduleRow): SecondaryConfirmedRound => {
    const qtyBySize: Record<string, number> = {}
    columns.forEach((column: InboundSplitSizeColumn): void => {
      qtyBySize[column.size] = Math.max(0, Math.round(row.quantitiesBySize[column.size] ?? 0))
    })
    return {
      date: row.inboundDate,
      ignoreExistingOrderInbound: row.ignoreExistingOrderInbound,
      qtyBySize,
    }
  })
}

export function getInboundSplitSuggestedTotalQty(row: InboundSplitScheduleRow, columns: readonly InboundSplitSizeColumn[]): number {
  return columns.reduce((sum: number, column: InboundSplitSizeColumn): number => sum + Math.max(0, Math.round(row.suggestedQuantitiesBySize[column.size] ?? 0)), 0)
}

export function allocateInboundSplitIntegerTotal({ total, weights }: InboundSplitIntegerAllocationInput): InboundSplitIntegerAllocationResult {
  const normalizedTotal: number = Number.isFinite(total) ? Math.max(0, Math.round(total)) : 0
  if (!weights.length) return { values: [], normalizedTotal }

  const normalizedWeights: number[] = weights.map((weight: number): number => (Number.isFinite(weight) ? Math.max(0, weight) : 0))
  const weightSum: number = normalizedWeights.reduce((sum: number, weight: number): number => sum + weight, 0)
  const effectiveWeights: number[] = weightSum > 0 ? normalizedWeights : normalizedWeights.map((): number => 1)
  const effectiveWeightSum: number = weightSum > 0 ? weightSum : effectiveWeights.length
  const exactValues: number[] = effectiveWeights.map((weight: number): number => (normalizedTotal * weight) / effectiveWeightSum)
  const values: number[] = exactValues.map((value: number): number => Math.floor(value))
  let remainder: number = normalizedTotal - values.reduce((sum: number, value: number): number => sum + value, 0)

  exactValues
    .map((value: number, index: number): { index: number; fraction: number } => ({ index, fraction: value - Math.floor(value) }))
    .sort((a: { index: number; fraction: number }, b: { index: number; fraction: number }): number => (b.fraction - a.fraction) || (a.index - b.index))
    .forEach(({ index }: { index: number; fraction: number }): void => {
      if (remainder <= 0) return
      values[index] += 1
      remainder -= 1
    })

  return { values, normalizedTotal }
}

function parseIsoDate(value: string): ParsedIsoDate | null {
  const match: RegExpMatchArray | null = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year: number = Number(match[1])
  const monthIndex: number = Number(match[2]) - 1
  const day: number = Number(match[3])
  const parsed: Date = new Date(Date.UTC(year, monthIndex, day))
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== monthIndex || parsed.getUTCDate() !== day) return null
  return { year, monthIndex, day }
}

function lastDayOfUtcMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

function toIsoDate(year: number, monthIndex: number, day: number): string {
  const safeDay: number = Math.min(day, lastDayOfUtcMonth(year, monthIndex))
  return new Date(Date.UTC(year, monthIndex, safeDay)).toISOString().slice(0, 10)
}

function addUtcMonths(date: ParsedIsoDate, monthOffset: number): string {
  const rawMonthIndex: number = date.monthIndex + monthOffset
  const year: number = date.year + Math.floor(rawMonthIndex / 12)
  const monthIndex: number = ((rawMonthIndex % 12) + 12) % 12
  return toIsoDate(year, monthIndex, date.day)
}

function buildInboundSplitDates(count: number, startDate: string, nextDate: string): string[] {
  const safeCount: number = clampInboundSplitCount(count)
  const start: ParsedIsoDate | null = parseIsoDate(startDate)
  const next: ParsedIsoDate | null = parseIsoDate(nextDate)
  if (!start) throw new Error('Invalid inbound split start date.')
  if (!next) throw new Error('Invalid inbound split next date.')

  const startMs: number = Date.UTC(start.year, start.monthIndex, start.day)
  const nextMs: number = Date.UTC(next.year, next.monthIndex, next.day)
  if (nextMs <= startMs) throw new Error('Inbound split next date must be after the start date.')

  const monthDiff: number = (next.year - start.year) * 12 + (next.monthIndex - start.monthIndex)
  if (start.day === next.day && monthDiff >= safeCount && monthDiff % safeCount === 0) {
    const monthStep: number = monthDiff / safeCount
    return Array.from({ length: safeCount }, (_: unknown, index: number): string => addUtcMonths(start, index * monthStep))
  }

  const intervalMs: number = nextMs - startMs
  return Array.from({ length: safeCount }, (_: unknown, index: number): string => {
    const splitDateMs: number = startMs + Math.round((intervalMs * index) / safeCount)
    return new Date(splitDateMs).toISOString().slice(0, 10)
  })
}

export function buildInboundSplitScheduleRows(
  columns: InboundSplitSizeColumn[],
  count: number,
  inboundDate: string,
  nextInboundDate: string,
  source: SecondaryInboundSplitSource,
): InboundSplitScheduleRow[] {
  const safeCount: number = clampInboundSplitCount(count)
  const inboundDates: string[] = buildInboundSplitDates(safeCount, inboundDate, nextInboundDate)
  const rowInputs: Array<{ inboundDate: string; ignoreExistingOrderInbound: boolean }> = inboundDates.map((date: string): { inboundDate: string; ignoreExistingOrderInbound: boolean } => ({
    inboundDate: date,
    ignoreExistingOrderInbound: false,
  }))
  const suggestedRows: InboundSplitSuggestionRow[] = buildInboundSplitSuggestionRows(columns, rowInputs, nextInboundDate, source)
  return Array.from({ length: safeCount }, (_: unknown, rowIndex: number): InboundSplitScheduleRow => {
    const round: number = rowIndex + 1
    const suggestedQuantitiesBySize: Record<string, number> = {}
    const suggestionBasisBySize: Record<string, InboundSplitSuggestionBasis> = {}
    const quantitiesBySize: Record<string, number> = {}
    columns.forEach((column: InboundSplitSizeColumn): void => {
      const qty: number = Math.max(0, Math.round(suggestedRows[rowIndex]?.suggestedQuantitiesBySize[column.size] ?? 0))
      suggestedQuantitiesBySize[column.size] = qty
      const basis: InboundSplitSuggestionBasis | undefined = suggestedRows[rowIndex]?.suggestionBasisBySize[column.size]
      if (basis) suggestionBasisBySize[column.size] = basis
      quantitiesBySize[column.size] = qty
    })
    return {
      id: `inbound-split-${round}`,
      round,
      inboundDate: inboundDates[rowIndex] ?? inboundDate,
      ignoreExistingOrderInbound: false,
      suggestedQuantitiesBySize,
      suggestionBasisBySize,
      quantitiesBySize,
    }
  })
}

export function recalculateInboundSplitScheduleRows(
  currentRows: readonly InboundSplitScheduleRow[],
  columns: readonly InboundSplitSizeColumn[],
  nextInboundDate: string,
  source: SecondaryInboundSplitSource,
): InboundSplitScheduleRow[] {
  const rowInputs: Array<{ inboundDate: string; ignoreExistingOrderInbound: boolean }> = currentRows.map((row: InboundSplitScheduleRow): { inboundDate: string; ignoreExistingOrderInbound: boolean } => ({
    inboundDate: row.inboundDate,
    ignoreExistingOrderInbound: row.ignoreExistingOrderInbound,
  }))
  const suggestedRows: InboundSplitSuggestionRow[] = buildInboundSplitSuggestionRows(columns, rowInputs, nextInboundDate, source)

  return currentRows.map((row: InboundSplitScheduleRow, rowIndex: number): InboundSplitScheduleRow => {
    const suggestedQuantitiesBySize: Record<string, number> = {}
    const suggestionBasisBySize: Record<string, InboundSplitSuggestionBasis> = {}
    const quantitiesBySize: Record<string, number> = {}
    columns.forEach((column: InboundSplitSizeColumn): void => {
      suggestedQuantitiesBySize[column.size] = Math.max(0, Math.round(suggestedRows[rowIndex]?.suggestedQuantitiesBySize[column.size] ?? 0))
      const basis: InboundSplitSuggestionBasis | undefined = suggestedRows[rowIndex]?.suggestionBasisBySize[column.size]
      if (basis) suggestionBasisBySize[column.size] = basis
      quantitiesBySize[column.size] = Math.max(0, Math.round(row.quantitiesBySize[column.size] ?? 0))
    })

    return {
      ...row,
      suggestedQuantitiesBySize,
      suggestionBasisBySize,
      quantitiesBySize,
    }
  })
}

export function reconcileInboundSplitScheduleRows(
  currentRows: InboundSplitScheduleRow[],
  columns: InboundSplitSizeColumn[],
  count: number,
  inboundDate: string,
  nextInboundDate: string,
  source: SecondaryInboundSplitSource,
): InboundSplitScheduleRow[] {
  const baseRows: InboundSplitScheduleRow[] = buildInboundSplitScheduleRows(columns, count, inboundDate, nextInboundDate, source)
  if (!currentRows.length) return baseRows

  const preserveCurrentValues: boolean = currentRows.length === baseRows.length
  const suggestedBaseRows: InboundSplitScheduleRow[] = preserveCurrentValues
    ? recalculateInboundSplitScheduleRows(
      baseRows.map((baseRow: InboundSplitScheduleRow, index: number): InboundSplitScheduleRow => ({
        ...baseRow,
        inboundDate: currentRows[index]?.inboundDate || baseRow.inboundDate,
        ignoreExistingOrderInbound: currentRows[index]?.ignoreExistingOrderInbound ?? baseRow.ignoreExistingOrderInbound,
      })),
      columns,
      nextInboundDate,
      source,
    )
    : baseRows
  return baseRows.map((baseRow: InboundSplitScheduleRow, index: number): InboundSplitScheduleRow => {
    const currentRow: InboundSplitScheduleRow | undefined = currentRows[index]
    if (!currentRow || !preserveCurrentValues) return baseRow
    const suggestedBaseRow: InboundSplitScheduleRow = suggestedBaseRows[index] ?? baseRow

    const suggestedQuantitiesBySize: Record<string, number> = {}
    const suggestionBasisBySize: Record<string, InboundSplitSuggestionBasis> = {}
    const quantitiesBySize: Record<string, number> = {}
    columns.forEach((column: InboundSplitSizeColumn): void => {
      suggestedQuantitiesBySize[column.size] = Math.max(0, Math.round(suggestedBaseRow.suggestedQuantitiesBySize[column.size] ?? 0))
      const basis: InboundSplitSuggestionBasis | undefined = suggestedBaseRow.suggestionBasisBySize?.[column.size]
      if (basis) suggestionBasisBySize[column.size] = basis
      quantitiesBySize[column.size] = Math.max(0, Math.round(currentRow.quantitiesBySize[column.size] ?? baseRow.quantitiesBySize[column.size] ?? 0))
    })

    return {
      id: baseRow.id,
      round: baseRow.round,
      inboundDate: currentRow.inboundDate || baseRow.inboundDate,
      ignoreExistingOrderInbound: currentRow.ignoreExistingOrderInbound,
      suggestedQuantitiesBySize,
      suggestionBasisBySize,
      quantitiesBySize,
    }
  })
}
