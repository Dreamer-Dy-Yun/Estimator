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
  const dir: 1 | -1 = direction === 'asc' ? 1 : -1
  let currentRank: number = 0
  let lastValue: SortValue = undefined

  return new Map(
    rows
      .map((row: T, index: number) : { row: T; index: number; value: SortValue; } => ({ row, index, value: rankValueOf(row) }))
      .sort((a: { row: T; index: number; value: SortValue; }, b: { row: T; index: number; value: SortValue; }) : number => {
        const aMissing: boolean = a.value == null
        const bMissing: boolean = b.value == null
        if (aMissing && bMissing) return a.index - b.index
        if (aMissing) return 1
        if (bMissing) return -1

        const valueCompare: number = compareSortValues(a.value, b.value) * dir
        return valueCompare || a.index - b.index
      })
      .map(({ row, value }: { row: T; index: number; value: SortValue; }, index: number) : [string, number] => {
        if (index === 0 || compareSortValues(value, lastValue) !== 0) currentRank = index + 1
        lastValue = value
        return [rowIdOf(row), currentRank]
      }),
  )
}
