import { formatIsoDateLocal } from '../../../../utils/date'

export function buildDefaultLeadTimeDates() {
  const today = new Date()
  const startDate = new Date(today)
  startDate.setMonth(startDate.getMonth() + 6)
  const start = formatIsoDateLocal(startDate)
  const endDate = new Date(today)
  endDate.setFullYear(endDate.getFullYear() + 1)
  const end = formatIsoDateLocal(endDate)
  return { start, end }
}
