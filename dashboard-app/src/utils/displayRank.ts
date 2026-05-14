import { compareSortValues, type SortValue } from './sort'

/**
 * Build a display rank map from the rows currently rendered by a list.
 * Equal values share the same competition rank; ties keep input order.
 */
export function createDisplayRankMap<T>(
  rows: readonly T[],
  rowIdOf: (row: T) => string,
  rankValueOf: (row: T) => SortValue,
  direction: 'asc' | 'desc' = 'asc',
): Map<string, number> {
  const dir = direction === 'asc' ? 1 : -1
  let currentRank = 0
  let lastValue: SortValue = undefined

  return new Map(
    rows
      .map((row, index) => ({ row, index, value: rankValueOf(row) }))
      .sort((a, b) => {
        const aMissing = a.value == null
        const bMissing = b.value == null
        if (aMissing && bMissing) return a.index - b.index
        if (aMissing) return 1
        if (bMissing) return -1

        const valueCompare = compareSortValues(a.value, b.value) * dir
        return valueCompare || a.index - b.index
      })
      .map(({ row, value }, index) => {
        if (index === 0 || compareSortValues(value, lastValue) !== 0) currentRank = index + 1
        lastValue = value
        return [rowIdOf(row), currentRank]
      }),
  )
}
