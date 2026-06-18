import { useCallback, useEffect, useMemo, useState } from 'react'
import { addIsoDays, daysBetweenIsoDates, formatIsoDateLocal } from '../../../../../utils/date'

export type InboundDueDateDefaults = {
  start: string
  end: string
}

function nextInboundDateAfter(dateText: string): string {
  return addIsoDays(dateText, 1)
}

function buildDefaultInboundDueDates(): InboundDueDateDefaults {
  const today: Date = new Date()
  const currentOrderDate: Date = new Date(today)
  const nextOrderDate: Date = new Date(today)
  currentOrderDate.setMonth(currentOrderDate.getMonth() + 6)
  nextOrderDate.setFullYear(nextOrderDate.getFullYear() + 1)
  return {
    start: formatIsoDateLocal(currentOrderDate),
    end: formatIsoDateLocal(nextOrderDate),
  }
}

export function useSecondaryInboundDueDates() : { defaultInboundDueDates: InboundDueDateDefaults; minOrderDate: string; currentOrderInboundDueDate: string; nextOrderInboundDueDate: string; orderCoverageDays: number; setCurrentOrderInboundDueDate: React.Dispatch<React.SetStateAction<string>>; setNextOrderInboundDueDate: React.Dispatch<React.SetStateAction<string>>; handleCurrentOrderInboundDueDateChange: (next: string) => void; handleNextOrderInboundDueDateChange: (next: string) => void; resetInboundDueDatesToLive: () => void; } {
  const defaultInboundDueDates: InboundDueDateDefaults = useMemo(() : InboundDueDateDefaults => buildDefaultInboundDueDates(), [])
  const [currentOrderInboundDueDate, setCurrentOrderInboundDueDate]: [string, React.Dispatch<React.SetStateAction<string>>] = useState(defaultInboundDueDates.start)
  const [nextOrderInboundDueDate, setNextOrderInboundDueDate]: [string, React.Dispatch<React.SetStateAction<string>>] = useState(defaultInboundDueDates.end)

  const minOrderDate: string = formatIsoDateLocal(new Date())

  useEffect(() : () => void => {
    let alive: boolean = true
    queueMicrotask(() : void => {
      if (alive) setCurrentOrderInboundDueDate((s: string) : string => (s < minOrderDate ? minOrderDate : s))
    })
    return () : void => {
      alive = false
    }
  }, [minOrderDate])

  useEffect(() : () => void => {
    let alive: boolean = true
    queueMicrotask(() : void => {
      if (alive) setNextOrderInboundDueDate((e: string) : string => (e <= currentOrderInboundDueDate ? nextInboundDateAfter(currentOrderInboundDueDate) : e))
    })
    return () : void => {
      alive = false
    }
  }, [currentOrderInboundDueDate])

  const orderCoverageDays: number = useMemo(
    () : number => Math.max(0, daysBetweenIsoDates(currentOrderInboundDueDate, nextOrderInboundDueDate) ?? 0),
    [nextOrderInboundDueDate, currentOrderInboundDueDate],
  )

  const handleCurrentOrderInboundDueDateChange: (next: string) => void = useCallback((next: string) : void => {
    const v: string = next < minOrderDate ? minOrderDate : next
    setCurrentOrderInboundDueDate(v)
    setNextOrderInboundDueDate((e: string) : string => (e <= v ? nextInboundDateAfter(v) : e))
  }, [minOrderDate])

  const handleNextOrderInboundDueDateChange: (next: string) => void = useCallback((next: string) : void => {
    let v: string = next < minOrderDate ? minOrderDate : next
    if (v <= currentOrderInboundDueDate) v = nextInboundDateAfter(currentOrderInboundDueDate)
    setNextOrderInboundDueDate(v)
  }, [currentOrderInboundDueDate, minOrderDate])

  const resetInboundDueDatesToLive: () => void = useCallback(() : void => {
    const nextStart: string = defaultInboundDueDates.start < minOrderDate ? minOrderDate : defaultInboundDueDates.start
    const nextEnd: string = defaultInboundDueDates.end <= nextStart ? nextInboundDateAfter(nextStart) : defaultInboundDueDates.end
    setCurrentOrderInboundDueDate(nextStart)
    setNextOrderInboundDueDate(nextEnd)
  }, [defaultInboundDueDates.end, defaultInboundDueDates.start, minOrderDate])

  return {
    defaultInboundDueDates,
    minOrderDate,
    currentOrderInboundDueDate,
    nextOrderInboundDueDate,
    orderCoverageDays,
    setCurrentOrderInboundDueDate,
    setNextOrderInboundDueDate,
    handleCurrentOrderInboundDueDateChange,
    handleNextOrderInboundDueDateChange,
    resetInboundDueDatesToLive,
  }
}
