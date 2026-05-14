import { compareSortValues } from './sort'

/**
 * Hardened module: option-string normalization helper.
 * Responsibility: trim, drop blanks, de-duplicate, then sort string options with the shared sort comparator.
 * Side effects: none. Input iterables are read once and never mutated.
 */
/** 문자열 나열에서 공백 제거·중복 제거·한국어 정렬된 배열 (필터 제안 옵션 등). */
export function uniqueSortedStrings(values: Iterable<string>): string[] {
  const arr = [...values].map((s) => String(s).trim()).filter(Boolean)
  return [...new Set(arr)].sort(compareSortValues)
}
