export type SortDirection = 'asc' | 'desc'
export type SortValue = string | number | null | undefined
export type SortState<TKey extends string = string> = {
  key: TKey
  dir: SortDirection
}

export function compareSortValues(a: SortValue, b: SortValue): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'ko')
}

export function nextSortState<TKey extends string>(
  current: SortState<TKey> | null,
  key: TKey,
): SortState<TKey> | null {
  if (!current || current.key !== key) return { key, dir: 'asc' }
  if (current.dir === 'asc') return { key, dir: 'desc' }
  return null
}
