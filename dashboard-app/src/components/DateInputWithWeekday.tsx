import { useLayoutEffect, useMemo, useRef, useState, type AriaAttributes, type ChangeEvent, type CSSProperties } from 'react'
import styles from './DateInputWithWeekday.module.css'

const DEFAULT_FONT_SIZE = 11.9
const MIN_FONT_SIZE = 11.44
const MAX_FONT_SIZE = 13.09
const MIN_WIDTH_FOR_FONT = 112
const MAX_WIDTH_FOR_FONT = 170

export interface DateInputWithWeekdayProps {
  ariaLabel: string
  ariaDescribedBy?: string
  ariaInvalid?: AriaAttributes['aria-invalid']
  ariaLabelledBy?: string
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
  weekdayLocale?: Intl.LocalesArgument
  showWeekday?: boolean
  colorWeekends?: boolean
  inputBackgroundColor?: string
  inputBackgroundOpacity?: number
}

function clampFontSizeByWidth(width: number): number {
  if (width >= MAX_WIDTH_FOR_FONT) return MAX_FONT_SIZE
  if (width <= MIN_WIDTH_FOR_FONT) return MIN_FONT_SIZE
  const ratio: number = (width - MIN_WIDTH_FOR_FONT) / (MAX_WIDTH_FOR_FONT - MIN_WIDTH_FOR_FONT)
  return Number((MIN_FONT_SIZE + (MAX_FONT_SIZE - MIN_FONT_SIZE) * ratio).toFixed(2))
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

function buildWeekdayText(value: string, locale: Intl.LocalesArgument): string | null {
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

function normalizeOpacity(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(1, Math.max(0, value))
}

// Invalid or empty controlled values remain visible as-is; caller-owned validation decides whether to mark or reject them.
export function DateInputWithWeekday({
  ariaLabel,
  ariaDescribedBy,
  ariaInvalid,
  ariaLabelledBy,
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
  colorWeekends = true,
  inputBackgroundColor = '#fff',
  inputBackgroundOpacity = 1,
}: DateInputWithWeekdayProps): React.JSX.Element {
  const weekdayText: string | null = useMemo(() : string | null => buildWeekdayText(value, weekdayLocale), [value, weekdayLocale])
  const weekdayClass: string = useMemo(() : string => {
    if (value.length === 0) return styles.dateWeekday
    const baseWeekdayClass: string = colorWeekends ? weekdayColorClass(value) : styles.dateWeekday
    return cx([baseWeekdayClass, weekdayClassName])
  }, [colorWeekends, value, weekdayClassName])
  const mergedInputClassName: string = inputClassName ?? ''
  const nativeInputClassName: string = cx([styles.dateInputNative, mergedInputClassName])
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const [fontSize, setFontSize] = useState<number>(DEFAULT_FONT_SIZE)
  const wrapperStyle: CSSProperties = {
    fontSize: `${fontSize}px`,
    '--date-input-bg-color': inputBackgroundColor,
    '--date-input-bg-opacity': String(normalizeOpacity(inputBackgroundOpacity)),
  } as CSSProperties

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
      style={wrapperStyle}
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
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-labelledby={ariaLabelledBy}
        style={{ fontSize: `${fontSize}px`, lineHeight: '1.2' }}
      />
      <span className={styles.dateInputDisplayOverlay} style={{ fontSize: `${fontSize}px`, lineHeight: '1.2' }} aria-hidden="true">
        {value}
        {(showWeekday && weekdayText != null) ? <span className={weekdayClass}>&nbsp;{weekdayText}</span> : null}
      </span>
    </span>
  )
}
