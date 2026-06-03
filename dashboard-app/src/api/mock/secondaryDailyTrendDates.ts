export const daysInMonth: (yyyymm: string) => number = (yyyymm: string): number => {
  const [yearPart, monthPart]: number[] = yyyymm.split('-').map(Number)
  return new Date(yearPart ?? 0, monthPart ?? 1, 0).getDate()
}

export const parseIsoDateUtc: (iso: string) => Date = (iso: string): Date => {
  const [yearPart, monthPart, dayPart]: number[] = iso.split('-').map(Number)
  return new Date(Date.UTC(yearPart ?? 0, (monthPart ?? 1) - 1, dayPart ?? 1))
}

export const formatIsoDateUtc: (date: Date) => string = (date: Date): string => {
  const year: number = date.getUTCFullYear()
  const month: string = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day: string = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
