/** `null`이면 `'-'`, 아니면 천 단위 구분 `ko-KR` (수량·금액 공통 표기). */
export function formatGroupedNumber(value: number | null): string {
  if (value === null) return '-'
  return value.toLocaleString('ko-KR')
}

/** 퍼센트, 소수 첫째 자리까지 + `%`. */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

/** 퍼센트, 소수 둘째 자리까지 + `%`. */
export function formatPercentTwoDecimals(value: number): string {
  return `${value.toFixed(2)}%`
}

/** 비율 수치만 소수 둘째 자리 (단위 `%`는 헤더 등에서 별도 표기). */
export function formatRatioDecimalKo(value: number): string {
  return value.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatCurrency(value: number): string {
  return `${value.toLocaleString('ko-KR')}원`
}

export function formatEaQuantity(value: number | null): string {
  return value == null ? '-' : `${formatGroupedNumber(value)} EA`
}

export function formatNumber(value: number): string {
  return value.toLocaleString('ko-KR')
}
