// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi , type Mock} from 'vitest';
import { FilterListCombo } from './FilterListCombo'

let root: Root | null = null
let container: HTMLDivElement | null = null

function renderCombo(props: Partial<Parameters<typeof FilterListCombo>[0]> = {}) : { input: HTMLInputElement; onChange: Mock<(...args: unknown[]) => unknown>; } {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const onChange: Mock<(...args: unknown[]) => unknown> = vi.fn()

  act(() : void => {
    root?.render(
      <FilterListCombo
        inputId="brand-filter"
        value=""
        onChange={onChange}
        options={['전체', '나이키', '푸마', '아디다스']}
        {...props}
      />,
    )
  })

  return { input: container.querySelector('input')!, onChange }
}

function optionLabels() : string[] {
  return [...document.body.querySelectorAll('[role="option"]')].map((node: Element) : string => node.textContent)
}

function changeInput(input: HTMLInputElement, value: string) : void {
  const valueSetter: ((value: string) => void) | undefined = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  act(() : void => {
    valueSetter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

afterEach(() : void => {
  act(() : void => {
    root?.unmount()
  })
  root = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
})

describe('FilterListCombo', () : void => {
  it('shows every option when the empty/default field receives focus', () : void => {
    const { input }: { input: HTMLInputElement; onChange: Mock<(...args: unknown[]) => unknown>; } = renderCombo()

    act(() : void => {
      input.focus()
    })

    expect(optionLabels()).toEqual(['전체', '나이키', '푸마', '아디다스'])
  })

  it('does not open the option panel while disabled', () : void => {
    const { input }: { input: HTMLInputElement; onChange: Mock<(...args: unknown[]) => unknown>; } = renderCombo({ disabled: true })

    act(() : void => {
      input.focus()
    })

    expect(document.body.querySelector('[role="listbox"]')).toBeNull()
  })

  it('renders the all filter value as the plain all label', () : void => {
    const { input }: { input: HTMLInputElement; onChange: Mock<(...args: unknown[]) => unknown>; } = renderCombo({ value: '전체' })

    expect(input.value).toBe('전체')
  })

  it('replaces the all display label when the user starts typing', () : void => {
    const { input, onChange }: { input: HTMLInputElement; onChange: Mock<(...args: unknown[]) => unknown>; } = renderCombo({ value: '전체' })

    changeInput(input, '전체아')

    expect(onChange).toHaveBeenLastCalledWith('아')
  })

  it('keeps the all option visible when the search text exactly matches another option', () : void => {
    const { input }: { input: HTMLInputElement; onChange: Mock<(...args: unknown[]) => unknown>; } = renderCombo({ value: '아디다스' })

    act(() : void => {
      input.focus()
    })

    expect(optionLabels()).toEqual(['전체', '아디다스'])
  })

  it('passes the original all value when the all display option is selected', () : void => {
    const { input, onChange }: { input: HTMLInputElement; onChange: Mock<(...args: unknown[]) => unknown>; } = renderCombo({ value: '아디다스' })

    act(() : void => {
      input.focus()
    })

    const allOption: HTMLButtonElement | undefined = [...document.body.querySelectorAll<HTMLButtonElement>('[role="option"]')]
      .find((option: HTMLButtonElement) : boolean => option.textContent === '전체')

    act(() : void => {
      allOption?.click()
    })

    expect(onChange).toHaveBeenLastCalledWith('전체')
  })

  it('reopens the option panel when the focused input is clicked after selecting an option', () : void => {
    const { input }: { input: HTMLInputElement; onChange: Mock<(...args: unknown[]) => unknown>; } = renderCombo({ value: '아디다스' })

    act(() : void => {
      input.focus()
    })

    const pumaOption: HTMLButtonElement | undefined = [...document.body.querySelectorAll<HTMLButtonElement>('[role="option"]')]
      .find((option: HTMLButtonElement) : boolean => option.textContent === '아디다스')

    act(() : void => {
      pumaOption?.click()
    })

    expect(document.body.querySelector('[role="listbox"]')).toBeNull()

    act(() : void => {
      input.click()
    })

    expect(optionLabels()).toEqual(['전체', '아디다스'])
  })

  it('shows a no-match hint while keeping the all option available', () : void => {
    const { input }: { input: HTMLInputElement; onChange: Mock<(...args: unknown[]) => unknown>; } = renderCombo({ value: '없는값' })

    act(() : void => {
      input.focus()
    })

    expect(optionLabels()).toEqual(['전체'])
    expect(document.body.textContent).toContain('검색 결과가 없습니다.')
  })
})
