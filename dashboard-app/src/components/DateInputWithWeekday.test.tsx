// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { DateInputWithWeekday, type DateInputWithWeekdayProps } from './DateInputWithWeekday'

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
    expect(input?.value).toBe('2026-04-01')
    expect(input?.getAttribute('aria-label')).toBe('date input')
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

  it('emits native date input changes', (): void => {
    const onChange: Mock<(next: string) => void> = renderDateInput()
    const input: HTMLInputElement = document.querySelector<HTMLInputElement>('input[type="date"]') as HTMLInputElement

    changeValue(input, '2026-04-10')

    expect(onChange).toHaveBeenCalledWith('2026-04-10')
  })
})
