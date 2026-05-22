// @vitest-environment jsdom
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CandidateStashPickerModal, type CandidateStashPickerOption } from './CandidateStashPickerModal'

const OPTIONS: CandidateStashPickerOption[] = [
  {
    uuid: 'stash-1',
    name: 'Candidate A',
    note: 'Primary option',
    dbCreatedAt: '2026-05-22T09:00:00.000Z',
  },
  {
    uuid: 'stash-2',
    name: 'Candidate B',
    note: null,
    dbCreatedAt: '2026-05-22T10:00:00.000Z',
  },
]

type RenderResult = {
  container: HTMLDivElement
  root: Root
  props: {
    onClose: ReturnType<typeof vi.fn>
    onCreate: ReturnType<typeof vi.fn>
    onSelect: ReturnType<typeof vi.fn>
    onNameInputChange: ReturnType<typeof vi.fn>
    onNoteInputChange: ReturnType<typeof vi.fn>
  }
}

const mountedRoots = new Set<Root>()

const renderModal = (overrides: Partial<ComponentProps<typeof CandidateStashPickerModal>> = {}): RenderResult => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mountedRoots.add(root)
  const props = {
    onClose: vi.fn(),
    onCreate: vi.fn(),
    onSelect: vi.fn(),
    onNameInputChange: vi.fn(),
    onNoteInputChange: vi.fn(),
  }

  act(() => {
    root.render(
      <CandidateStashPickerModal
        options={OPTIONS}
        selectedUuid="stash-1"
        nameInput=""
        noteInput=""
        loading={false}
        onNameInputChange={props.onNameInputChange}
        onNoteInputChange={props.onNoteInputChange}
        onCreate={props.onCreate}
        onSelect={props.onSelect}
        onClose={props.onClose}
        {...overrides}
      />,
    )
  })

  return { container, root, props }
}

const dispatchKeyDown = (key: string, init: KeyboardEventInit = {}) => {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }))
  })
}

afterEach(() => {
  act(() => {
    mountedRoots.forEach((root) => root.unmount())
    mountedRoots.clear()
  })
  document.body.innerHTML = ''
})

describe('CandidateStashPickerModal focus management', () => {
  it('moves initial focus to the candidate name input and restores the previous focus on unmount', () => {
    const opener = document.createElement('button')
    opener.type = 'button'
    opener.textContent = 'Open picker'
    document.body.appendChild(opener)
    opener.focus()

    const { root, container } = renderModal()

    expect(document.activeElement).toBe(document.getElementById('candidate-name-input'))

    act(() => {
      root.unmount()
    })
    mountedRoots.delete(root)
    container.remove()

    expect(document.activeElement).toBe(opener)
  })

  it('keeps Tab focus inside the picker modal', () => {
    renderModal()

    const nameInput = document.getElementById('candidate-name-input') as HTMLInputElement
    const closeButton = document.querySelector<HTMLButtonElement>('button[aria-label="후보군 선택 닫기"]')
    const secondOption = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
      button.textContent?.includes('Candidate B'),
    )

    expect(closeButton).toBeTruthy()
    expect(secondOption).toBeTruthy()

    closeButton?.focus()
    dispatchKeyDown('Tab', { shiftKey: true })
    expect(document.activeElement).toBe(secondOption)

    dispatchKeyDown('Tab')
    expect(document.activeElement).toBe(closeButton)

    nameInput.focus()
    expect(document.activeElement).toBe(nameInput)
  })

  it('closes the picker modal when Escape is pressed', () => {
    const { props } = renderModal()

    dispatchKeyDown('Escape')

    expect(props.onClose).toHaveBeenCalledTimes(1)
  })
})

describe('CandidateStashPickerModal loading state', () => {
  it('announces option refresh and exposes why existing options are disabled', () => {
    renderModal({ loading: true })

    const status = document.querySelector<HTMLElement>('[role="status"]')
    const optionButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).filter((button) =>
      button.textContent?.includes('Candidate'),
    )

    expect(status?.id).toBe('candidate-stash-picker-refreshing-status')
    expect(status?.textContent).toContain('후보군 목록을 갱신 중입니다')
    expect(status?.getAttribute('aria-live')).toBe('polite')
    expect(status?.parentElement?.getAttribute('aria-busy')).toBe('true')
    expect(optionButtons).toHaveLength(2)
    optionButtons.forEach((button) => {
      expect(button.disabled).toBe(true)
      expect(button.getAttribute('aria-describedby')).toBe('candidate-stash-picker-refreshing-status')
    })
  })

  it('keeps selection blocked while options are refreshing', () => {
    const { props } = renderModal({ loading: true })
    const firstOption = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
      button.textContent?.includes('Candidate A'),
    )

    firstOption?.click()

    expect(props.onSelect).not.toHaveBeenCalled()
  })
})
