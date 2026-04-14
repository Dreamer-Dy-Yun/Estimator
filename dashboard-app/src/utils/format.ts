export const c = (v: number | null): string => {
  if (v === null) return '-'
  return v.toLocaleString('ko-KR')
}

export const won = (v: number | null): string => {
  if (v === null) return '-'
  return v.toLocaleString('ko-KR')
}

export const pct = (v: number): string => `${v.toFixed(1)}%`

/** 퍼센트 표기 (소수 둘째 자리) */
export const pct2 = (v: number): string => `${v.toFixed(2)}%`

/** 비율 수치만 소수 둘째 자리 (표 셀·단위는 헤더에 %로 표기할 때) */
export const pct2n = (v: number): string =>
  v.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const formatCurrency = (value: number): string => {
  return `${value.toLocaleString('ko-KR')}원`
}

export const formatNumber = (value: number): string => {
  return value.toLocaleString('ko-KR')
}

export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`
}
