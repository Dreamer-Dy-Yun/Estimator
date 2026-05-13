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
        options={['나이키', '푸마', '아식스']}
        {...props}
      />,
    )
  })

  return { input: container.querySelector('input')!, onChange }
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

    const options = [...document.body.querySelectorAll('[role="option"]')].map((node) => node.textContent)
    expect(options).toEqual(['나이키', '푸마', '아식스'])
  })

  it('does not open the option panel while disabled', () => {
    const { input } = renderCombo({ disabled: true })

    act(() => {
      input.focus()
    })

    expect(document.body.querySelector('[role="listbox"]')).toBeNull()
  })
})
