/** `YYYY-MM` → `YYYY-MM-01` */
export const monthToStartDate = (month: string) => `${month}-01`

/** `YYYY-MM` → 해당 월 말일 */
export const monthToEndDate = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return `${month}-${String(lastDay).padStart(2, '0')}`
}

export const dateToMonth = (date: string) => date.slice(0, 7)
