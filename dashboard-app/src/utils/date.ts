/** `YYYY-MM` → `YYYY-MM-01` */
export const monthToStartDate: (month: string) => string = (month: string) : string => `${month}-01`

/** `YYYY-MM` → 해당 월 말일 */
export const monthToEndDate: (month: string) => string = (month: string) : string => {
  const [y, m]: number[] = month.split('-').map(Number)
  const lastDay: number = new Date(y, m, 0).getDate()
  return `${month}-${String(lastDay).padStart(2, '0')}`
}

export const dateToMonth: (date: string) => string = (date: string) : string => date.slice(0, 7)

export function formatIsoDateLocal(date: Date): string {
  const y: number = date.getFullYear()
  const m: string = String(date.getMonth() + 1).padStart(2, '0')
  const d: string = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addIsoDays(dateText: string, days: number): string {
  const date: Date = new Date(`${dateText}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return dateText
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** `YYYY-MM` 달의 실제 일수(달력). */
export function calendarDaysInMonth(yyyyMm: string): number {
  const [y, m]: number[] = yyyyMm.split('-').map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(m)) return 30
  return new Date(y, m, 0).getDate()
}

/** ISO 날짜 `YYYY-MM-DD` 양끝 포함 일수. 끝이 시작보다 이전이면 0. 파싱 실패 시 0. */
export function daysInclusiveBetween(start: string, end: string): number {
  const s: Date = new Date(`${start}T00:00:00`)
  const e: Date = new Date(`${end}T00:00:00`)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0
  const diffDays: number = Math.floor((e.getTime() - s.getTime()) / 86400000) + 1
  return Math.max(0, diffDays)
}

/** ISO datetime -> `YYYY-MM-DD HH:mm` (로컬 시간 기준) */
export function formatDateTimeMinute(iso: string): string {
  const d: Date = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const yy: number = d.getFullYear()
  const mm: string = String(d.getMonth() + 1).padStart(2, '0')
  const dd: string = String(d.getDate()).padStart(2, '0')
  const hh: string = String(d.getHours()).padStart(2, '0')
  const mi: string = String(d.getMinutes()).padStart(2, '0')
  return `${yy}-${mm}-${dd} ${hh}:${mi}`
}
