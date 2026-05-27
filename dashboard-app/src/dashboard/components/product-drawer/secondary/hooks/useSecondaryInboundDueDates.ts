import { useCallback, useEffect, useMemo, useState } from 'react'
import { daysInclusiveBetween, formatIsoDateLocal } from '../../../../../utils/date'

export type InboundDueDateDefaults = {
  start: string
  end: string
}

function buildDefaultInboundDueDates(): InboundDueDateDefaults {
  const today = new Date()
  const currentOrderDate = new Date(today)
  const nextOrderDate = new Date(today)
  currentOrderDate.setMonth(currentOrderDate.getMonth() + 6)
  nextOrderDate.setFullYear(nextOrderDate.getFullYear() + 1)
  return {
    start: formatIsoDateLocal(currentOrderDate),
    end: formatIsoDateLocal(nextOrderDate),
  }
}

export function useSecondaryInboundDueDates() {
  const defaultInboundDueDates = useMemo(() => buildDefaultInboundDueDates(), [])
  const [currentOrderInboundDueDate, setCurrentOrderInboundDueDate] = useState(defaultInboundDueDates.start)
  const [nextOrderInboundDueDate, setNextOrderInboundDueDate] = useState(defaultInboundDueDates.end)

  const minOrderDate = formatIsoDateLocal(new Date())

  useEffect(() => {
    let alive = true
    queueMicrotask(() => {
      if (alive) setCurrentOrderInboundDueDate((s) => (s < minOrderDate ? minOrderDate : s))
    })
    return () => {
      alive = false
    }
  }, [minOrderDate])

  useEffect(() => {
    let alive = true
    queueMicrotask(() => {
      if (alive) setNextOrderInboundDueDate((e) => (e < currentOrderInboundDueDate ? currentOrderInboundDueDate : e))
    })
    return () => {
      alive = false
    }
  }, [currentOrderInboundDueDate])

  const leadTimeDays = useMemo(
    () => daysInclusiveBetween(currentOrderInboundDueDate, nextOrderInboundDueDate),
    [nextOrderInboundDueDate, currentOrderInboundDueDate],
  )

  const handleCurrentOrderInboundDueDateChange = useCallback((next: string) => {
    const v = next < minOrderDate ? minOrderDate : next
    setCurrentOrderInboundDueDate(v)
    setNextOrderInboundDueDate((e) => (e < v ? v : e))
  }, [minOrderDate])

  const handleNextOrderInboundDueDateChange = useCallback((next: string) => {
    let v = next < minOrderDate ? minOrderDate : next
    if (v < currentOrderInboundDueDate) v = currentOrderInboundDueDate
    setNextOrderInboundDueDate(v)
  }, [currentOrderInboundDueDate, minOrderDate])

  const resetInboundDueDatesToLive = useCallback(() => {
    const nextStart = defaultInboundDueDates.start < minOrderDate ? minOrderDate : defaultInboundDueDates.start
    const nextEnd = defaultInboundDueDates.end < nextStart ? nextStart : defaultInboundDueDates.end
    setCurrentOrderInboundDueDate(nextStart)
    setNextOrderInboundDueDate(nextEnd)
  }, [defaultInboundDueDates.end, defaultInboundDueDates.start, minOrderDate])

  return {
    defaultInboundDueDates,
    minOrderDate,
    currentOrderInboundDueDate,
    nextOrderInboundDueDate,
    leadTimeDays,
    setCurrentOrderInboundDueDate,
    setNextOrderInboundDueDate,
    handleCurrentOrderInboundDueDateChange,
    handleNextOrderInboundDueDateChange,
    resetInboundDueDatesToLive,
  }
}
