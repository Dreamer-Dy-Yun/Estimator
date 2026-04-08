export const c = (v: number | null): string => {
  if (v === null) return '-'
  return v.toLocaleString('ko-KR')
}

export const won = (v: number | null): string => {
  if (v === null) return '-'
  return v.toLocaleString('ko-KR')
}

export const pct = (v: number): string => `${v.toFixed(1)}%`
export const formatCurrency = (value: number): string => {
  return `${value.toLocaleString('ko-KR')}원`
}

export const formatNumber = (value: number): string => {
  return value.toLocaleString('ko-KR')
}

export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`
}
