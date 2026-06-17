// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { DateInputWithWeekday, type DateInputWithWeekdayProps } from './DateInputWithWeekday'
import styles from './DateInputWithWeekday.module.css'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let container: HTMLDivElement | null = null

function changeValue(input: HTMLInputElement, value: string): void {
  act((): void => {
    const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
    descriptor?.set?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function renderDateInput(overrides: Partial<DateInputWithWeekdayProps> = {}): Mock<(next: string) => void> {
  const onChange: Mock<(next: string) => void> = vi.fn()
  const props: DateInputWithWeekdayProps = {
    ariaLabel: 'date input',
    value: '2026-04-01',
    onChange,
    ...overrides,
  }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act((): void => {
    root?.render(<DateInputWithWeekday {...props} />)
  })
  return onChange
}

afterEach((): void => {
  act((): void => {
    root?.unmount()
  })
  root = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('DateInputWithWeekday', (): void => {
  it('renders a native date input with a Korean weekday by default', (): void => {
    renderDateInput()

    const input: HTMLInputElement | null = document.querySelector('input[type="date"]')
    const wrapper: HTMLSpanElement | null = document.querySelector(`.${styles.dateInputWithWeekday}`)
    expect(input?.value).toBe('2026-04-01')
    expect(input?.getAttribute('aria-label')).toBe('date input')
    expect(wrapper?.style.getPropertyValue('--date-input-bg-color')).toBe('#fff')
    expect(wrapper?.style.getPropertyValue('--date-input-bg-opacity')).toBe('1')
    expect(document.body.textContent).toContain('2026-04-01')
    expect(document.body.textContent).toContain('(\uC218)')
  })

  it('supports weekday locale override', (): void => {
    renderDateInput({ weekdayLocale: 'en-US' })

    expect(document.body.textContent).toContain('(Wed)')
  })

  it('can hide the weekday overlay suffix', (): void => {
    renderDateInput({ showWeekday: false })

    expect(document.body.textContent).toContain('2026-04-01')
    expect(document.body.textContent).not.toContain('(')
  })

  it('allows caller overrides for input background color and opacity', (): void => {
    renderDateInput({
      className: 'date-background-probe',
      inputBackgroundColor: '#f8fafc',
      inputBackgroundOpacity: 0.72,
    })

    const wrapper: HTMLSpanElement = document.querySelector<HTMLSpanElement>('span.date-background-probe') as HTMLSpanElement
    expect(wrapper.style.getPropertyValue('--date-input-bg-color')).toBe('#f8fafc')
    expect(wrapper.style.getPropertyValue('--date-input-bg-opacity')).toBe('0.72')
  })

  it('emits native date input changes', (): void => {
    const onChange: Mock<(next: string) => void> = renderDateInput()
    const input: HTMLInputElement = document.querySelector<HTMLInputElement>('input[type="date"]') as HTMLInputElement

    changeValue(input, '2026-04-10')

    expect(onChange).toHaveBeenCalledWith('2026-04-10')
  })

  it('passes native input and accessibility props through without exposing the visual overlay', (): void => {
    renderDateInput({
      ariaDescribedBy: 'date-help',
      ariaInvalid: true,
      ariaLabelledBy: 'date-label',
      id: 'date-field',
      min: '2026-04-01',
      max: '2026-04-30',
      disabled: true,
      required: true,
      className: 'outer-date-class',
      inputClassName: 'inner-date-class',
      weekdayClassName: 'weekday-extra-class',
    })

    const wrapper: HTMLSpanElement = document.querySelector<HTMLSpanElement>('span.outer-date-class') as HTMLSpanElement
    const input: HTMLInputElement = document.querySelector<HTMLInputElement>('#date-field') as HTMLInputElement
    const overlay: HTMLSpanElement = wrapper.querySelector<HTMLSpanElement>(`.${styles.dateInputDisplayOverlay}`) as HTMLSpanElement
    const weekday: HTMLSpanElement = overlay.querySelector<HTMLSpanElement>('span') as HTMLSpanElement

    expect(input.min).toBe('2026-04-01')
    expect(input.max).toBe('2026-04-30')
    expect(input.disabled).toBe(true)
    expect(input.required).toBe(true)
    expect(input.className).toContain('inner-date-class')
    expect(input.getAttribute('aria-describedby')).toBe('date-help')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-labelledby')).toBe('date-label')
    expect(overlay.getAttribute('aria-hidden')).toBe('true')
    expect(weekday.className).toContain('weekday-extra-class')
  })

  it('keeps malformed values visible while omitting derived weekday text', (): void => {
    renderDateInput({ value: '2026-02-31' })

    expect(document.body.textContent).toContain('2026-02-31')
    expect(document.body.textContent).not.toContain('(')
  })

  it('can render weekdays without weekend color policy', (): void => {
    renderDateInput({ value: '2026-04-05', colorWeekends: false })

    const weekday: HTMLSpanElement = document.querySelector<HTMLSpanElement>(`.${styles.dateWeekday}`) as HTMLSpanElement
    expect(weekday.textContent).toContain('일')
    expect(weekday.className).not.toContain(styles.dateWeekdaySunday)
  })
})
