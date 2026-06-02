// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FilterListCombo } from './FilterListCombo'

let root: Root | null = null
let container: HTMLDivElement | null = null

function renderCombo(props: Partial<Parameters<typeof FilterListCombo>[0]> = {}) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const onChange = vi.fn()

  act(() => {
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

function optionLabels() {
  return [...document.body.querySelectorAll('[role="option"]')].map((node) => node.textContent)
}

function changeInput(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  act(() => {
    valueSetter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
})

describe('FilterListCombo', () => {
  it('shows every option when the empty/default field receives focus', () => {
    const { input } = renderCombo()

    act(() => {
      input.focus()
    })

    expect(optionLabels()).toEqual(['전체', '나이키', '푸마', '아디다스'])
  })

  it('does not open the option panel while disabled', () => {
    const { input } = renderCombo({ disabled: true })

    act(() => {
      input.focus()
    })

    expect(document.body.querySelector('[role="listbox"]')).toBeNull()
  })

  it('renders the all filter value as the plain all label', () => {
    const { input } = renderCombo({ value: '전체' })

    expect(input.value).toBe('전체')
  })

  it('replaces the all display label when the user starts typing', () => {
    const { input, onChange } = renderCombo({ value: '전체' })

    changeInput(input, '전체아')

    expect(onChange).toHaveBeenLastCalledWith('아')
  })

  it('keeps the all option visible when the search text exactly matches another option', () => {
    const { input } = renderCombo({ value: '아디다스' })

    act(() => {
      input.focus()
    })

    expect(optionLabels()).toEqual(['전체', '아디다스'])
  })

  it('passes the original all value when the all display option is selected', () => {
    const { input, onChange } = renderCombo({ value: '아디다스' })

    act(() => {
      input.focus()
    })

    const allOption = [...document.body.querySelectorAll<HTMLButtonElement>('[role="option"]')]
      .find((option) => option.textContent === '전체')

    act(() => {
      allOption?.click()
    })

    expect(onChange).toHaveBeenLastCalledWith('전체')
  })

  it('shows a no-match hint while keeping the all option available', () => {
    const { input } = renderCombo({ value: '없는값' })

    act(() => {
      input.focus()
    })

    expect(optionLabels()).toEqual(['전체'])
    expect(document.body.textContent).toContain('검색 결과가 없습니다.')
  })
})
