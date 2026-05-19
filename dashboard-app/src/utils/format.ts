/**
 * Hardened module: shared display formatting.
 * Responsibility: convert already computed numeric values into Korean-locale UI strings.
 * Contract: nullable helpers render missing values as `-`; they do not invent business defaults.
 * Side effects: none.
 */
/** `null`이면 `'-'`, 아니면 천 단위 구분 `ko-KR` (수량·금액 공통 표기). */
export function formatGroupedNumber(value: number | null): string {
  if (value === null) return '-'
  return value.toLocaleString('ko-KR')
}

/** 천 단위 구분 + 소수 첫째 자리 고정 표기. 일평균 수량처럼 반올림 표시가 필요한 값에 사용한다. */
export function formatGroupedOneDecimal(value: number | null): string {
  if (value === null) return '-'
  return value.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

/** 퍼센트, 소수 첫째 자리까지 + `%`. */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

/** 비율 수치만 소수 둘째 자리 (단위 `%`는 헤더 등에서 별도 표기). */
export function formatRatioDecimalKo(value: number): string {
  return value.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatEaQuantity(value: number | null): string {
  return value == null ? '-' : `${formatGroupedNumber(value)} EA`
}
