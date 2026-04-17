/** `YYYY-MM` → `YYYY-MM-01` */
export const monthToStartDate = (month: string) => `${month}-01`

/** `YYYY-MM` → 해당 월 말일 */
export const monthToEndDate = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return `${month}-${String(lastDay).padStart(2, '0')}`
}

export const dateToMonth = (date: string) => date.slice(0, 7)

/** ISO 날짜 `YYYY-MM-DD` 양끝 포함 일수(유효하지 않으면 1). */
export function daysInclusiveBetween(start: string, end: string): number {
  const s = new Date(`${start}T00:00:00`)
  const e = new Date(`${end}T00:00:00`)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 1
  const diffDays = Math.floor((e.getTime() - s.getTime()) / 86400000) + 1
  return Math.max(1, diffDays)
}
