import { useCallback, useEffect, useMemo, useState } from 'react'
import { daysInclusiveBetween, formatIsoDateLocal } from '../../../../../utils/date'
import { buildDefaultLeadTimeDates } from '../secondaryDefaultLeadTime'

export function useSecondaryLeadTimeDates() {
  const defaultLeadTime = useMemo(() => buildDefaultLeadTimeDates(), [])
  const [leadTimeStartDate, setLeadTimeStartDate] = useState(defaultLeadTime.start)
  const [leadTimeEndDate, setLeadTimeEndDate] = useState(defaultLeadTime.end)

  const minOrderDate = formatIsoDateLocal(new Date())

  useEffect(() => {
    let alive = true
    queueMicrotask(() => {
      if (alive) setLeadTimeStartDate((s) => (s < minOrderDate ? minOrderDate : s))
    })
    return () => {
      alive = false
    }
  }, [minOrderDate])

  useEffect(() => {
    let alive = true
    queueMicrotask(() => {
      if (alive) setLeadTimeEndDate((e) => (e < leadTimeStartDate ? leadTimeStartDate : e))
    })
    return () => {
      alive = false
    }
  }, [leadTimeStartDate])

  const leadTimeDays = useMemo(
    () => daysInclusiveBetween(leadTimeStartDate, leadTimeEndDate),
    [leadTimeEndDate, leadTimeStartDate],
  )

  const handleCurrentOrderDateChange = useCallback((next: string) => {
    const v = next < minOrderDate ? minOrderDate : next
    setLeadTimeStartDate(v)
    setLeadTimeEndDate((e) => (e < v ? v : e))
  }, [minOrderDate])

  const handleNextOrderDateChange = useCallback((next: string) => {
    let v = next < minOrderDate ? minOrderDate : next
    if (v < leadTimeStartDate) v = leadTimeStartDate
    setLeadTimeEndDate(v)
  }, [leadTimeStartDate, minOrderDate])

  const resetLeadTimeToLive = useCallback(() => {
    const nextStart = defaultLeadTime.start < minOrderDate ? minOrderDate : defaultLeadTime.start
    const nextEnd = defaultLeadTime.end < nextStart ? nextStart : defaultLeadTime.end
    setLeadTimeStartDate(nextStart)
    setLeadTimeEndDate(nextEnd)
  }, [defaultLeadTime.end, defaultLeadTime.start, minOrderDate])

  return {
    defaultLeadTime,
    minOrderDate,
    leadTimeStartDate,
    leadTimeEndDate,
    leadTimeDays,
    setLeadTimeStartDate,
    setLeadTimeEndDate,
    handleCurrentOrderDateChange,
    handleNextOrderDateChange,
    resetLeadTimeToLive,
  }
}
