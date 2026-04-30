/** `YYYY-MM` → `YYYY-MM-01` */
export const monthToStartDate = (month: string) => `${month}-01`

/** `YYYY-MM` → 해당 월 말일 */
export const monthToEndDate = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return `${month}-${String(lastDay).padStart(2, '0')}`
}

export const dateToMonth = (date: string) => date.slice(0, 7)

/** `YYYY-MM` 달의 실제 일수(달력). */
export function calendarDaysInMonth(yyyyMm: string): number {
  const [y, m] = yyyyMm.split('-').map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(m)) return 30
  return new Date(y, m, 0).getDate()
}

/** ISO 날짜 `YYYY-MM-DD` 양끝 포함 일수. 끝이 시작보다 이전이면 0. 파싱 실패 시 0. */
export function daysInclusiveBetween(start: string, end: string): number {
  const s = new Date(`${start}T00:00:00`)
  const e = new Date(`${end}T00:00:00`)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0
  const diffDays = Math.floor((e.getTime() - s.getTime()) / 86400000) + 1
  return Math.max(0, diffDays)
}

/** ISO datetime -> `YYYY-MM-DD HH:mm` (로컬 시간 기준) */
export function formatDateTimeMinute(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const yy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yy}-${mm}-${dd} ${hh}:${mi}`
}
