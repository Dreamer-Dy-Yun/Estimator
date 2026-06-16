import { useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import styles from './DateInputWithWeekday.module.css'

export type DateInputWithWeekdayProps = {
  ariaLabel: string
  value: string
  onChange: (next: string) => void
  min?: string
  max?: string
  disabled?: boolean
  required?: boolean
  id?: string
  className?: string
  inputClassName?: string
  weekdayClassName?: string
  weekdayLocale?: WeekdayLocale
  showWeekday?: boolean
}

export type WeekdayLocale = 'ko-KR' | 'en-US'

function clampFontSizeByWidth(width: number): number {
  const minFont: number = 11.44
  const maxFont: number = 13.09
  const minWidth: number = 112
  const maxWidth: number = 170
  if (width >= maxWidth) return maxFont
  if (width <= minWidth) return minFont
  const ratio: number = (width - minWidth) / (maxWidth - minWidth)
  return Number((minFont + (maxFont - minFont) * ratio).toFixed(2))
}

function parseIsoDate(value: string): Date | null {
  const parts: Array<string> = value.split('-')
  if (parts.length !== 3) return null
  const [year, month, day] = parts
  if (year === '' || month === '' || day === '') return null
  const yyyy: number = Number.parseInt(year, 10)
  const mm: number = Number.parseInt(month, 10)
  const dd: number = Number.parseInt(day, 10)
  if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null
  const parsed: Date = new Date(yyyy, mm - 1, dd)
  if (parsed.getFullYear() !== yyyy || parsed.getMonth() !== mm - 1 || parsed.getDate() !== dd) return null
  return parsed
}

function buildWeekdayText(value: string, locale: WeekdayLocale): string | null {
  const d: Date | null = parseIsoDate(value)
  if (d == null) return null
  if (Number.isNaN(d.getTime())) return null
  const weekday: string = d.toLocaleDateString(locale, { weekday: 'short' })
  return `(${weekday})`
}

function weekdayColorClass(value: string): string {
  const d: Date | null = parseIsoDate(value)
  if (d == null || Number.isNaN(d.getTime())) return styles.dateWeekday
  const dayOfWeek: number = d.getDay()
  if (dayOfWeek === 0) return `${styles.dateWeekday} ${styles.dateWeekdaySunday}`
  if (dayOfWeek === 6) return `${styles.dateWeekday} ${styles.dateWeekdaySaturday}`
  return styles.dateWeekday
}

function cx(classes: Array<string | undefined>): string {
  return classes.filter((item: string | undefined) : boolean => Boolean(item)).join(' ')
}

export function DateInputWithWeekday({
  ariaLabel,
  value,
  onChange,
  min,
  max,
  disabled = false,
  required = false,
  id,
  className,
  inputClassName,
  weekdayClassName,
  weekdayLocale = 'ko-KR',
  showWeekday = true,
}: DateInputWithWeekdayProps): React.JSX.Element {
  const weekdayText: string | null = useMemo(() : string | null => buildWeekdayText(value, weekdayLocale), [value, weekdayLocale])
  const weekdayClass: string = useMemo(() : string => {
    if (value.length === 0) return styles.dateWeekday
    return cx([weekdayColorClass(value), weekdayClassName])
  }, [value, weekdayClassName])
  const mergedInputClassName: string = inputClassName ?? ''
  const nativeInputClassName: string = cx([styles.dateInputNative, mergedInputClassName])
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const [fontSize, setFontSize] = useState<number>(11.9)

  useLayoutEffect(() => {
    const wrapper: HTMLSpanElement | null = wrapperRef.current
    if (wrapper == null) return

    const updateFontSize = (): void => {
      const nextFontSize: number = clampFontSizeByWidth(wrapper.clientWidth)
      setFontSize((currentFontSize: number): number => {
        if (Math.abs(currentFontSize - nextFontSize) <= 0.01) return currentFontSize
        return nextFontSize
      })
    }

    updateFontSize()
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((): void => {
        updateFontSize()
      })
      observer.observe(wrapper)
      return () => {
        observer.disconnect()
      }
    }

    window.addEventListener('resize', updateFontSize)
    return () => {
      window.removeEventListener('resize', updateFontSize)
    }
  }, [])

  return (
    <span
      ref={wrapperRef}
      className={cx([styles.dateInputWithWeekday, className])}
      style={{ fontSize: `${fontSize}px` }}
    >
      <input
        id={id}
        type="date"
        className={nativeInputClassName}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) : void => onChange(event.target.value)}
        min={min}
        max={max}
        disabled={disabled}
        required={required}
        aria-label={ariaLabel}
        style={{ fontSize: `${fontSize}px`, lineHeight: '1.2' }}
      />
      <span className={styles.dateInputDisplayOverlay} style={{ fontSize: `${fontSize}px`, lineHeight: '1.2' }}>
        {value}
        {(showWeekday && weekdayText != null) ? <span className={weekdayClass}>&nbsp;{weekdayText}</span> : null}
      </span>
    </span>
  )
}
