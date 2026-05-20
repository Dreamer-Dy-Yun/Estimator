export const daysInMonth = (yyyymm: string): number => {
  const [yearPart, monthPart] = yyyymm.split('-').map(Number)
  return new Date(yearPart ?? 0, monthPart ?? 1, 0).getDate()
}

export const parseIsoDateUtc = (iso: string): Date => {
  const [yearPart, monthPart, dayPart] = iso.split('-').map(Number)
  return new Date(Date.UTC(yearPart ?? 0, (monthPart ?? 1) - 1, dayPart ?? 1))
}

export const formatIsoDateUtc = (date: Date): string => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
