// @vitest-environment jsdom
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi , type Mock} from 'vitest';
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

export type RenderResult = {
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

const mountedRoots: Set<Root> = new Set<Root>()

const renderModal: (overrides?: Partial<ComponentProps<typeof CandidateStashPickerModal>>) => RenderResult = (overrides: Partial<ComponentProps<typeof CandidateStashPickerModal>> = {}): RenderResult => {
  const container: HTMLDivElement = document.createElement('div')
  document.body.appendChild(container)
  const root: Root = createRoot(container)
  mountedRoots.add(root)
  const props: { onClose: Mock<(...args: unknown[]) => unknown>; onCreate: Mock<(...args: unknown[]) => unknown>; onSelect: Mock<(...args: unknown[]) => unknown>; onNameInputChange: Mock<(...args: unknown[]) => unknown>; onNoteInputChange: Mock<(...args: unknown[]) => unknown>; } = {
    onClose: vi.fn(),
    onCreate: vi.fn(),
    onSelect: vi.fn(),
    onNameInputChange: vi.fn(),
    onNoteInputChange: vi.fn(),
  }

  act(() : void => {
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

const dispatchKeyDown: (target: EventTarget, key: string, init?: KeyboardEventInit) => void = (target: EventTarget, key: string, init: KeyboardEventInit = {}) : void => {
  act(() : void => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }))
  })
}

afterEach(() : void => {
  act(() : void => {
    mountedRoots.forEach((root: Root) : void => root.unmount())
    mountedRoots.clear()
  })
  document.body.innerHTML = ''
})

describe('CandidateStashPickerModal focus management', () : void => {
  it('moves initial focus to the selected candidate option and restores the previous focus on unmount', () : void => {
    const opener: HTMLButtonElement = document.createElement('button')
    opener.type = 'button'
    opener.textContent = 'Open picker'
    document.body.appendChild(opener)
    opener.focus()

    const { root, container }: RenderResult = renderModal()

    const selectedOption: HTMLButtonElement | null = document.querySelector<HTMLButtonElement>('button[aria-current="true"]')
    expect(document.activeElement).toBe(selectedOption)

    act(() : void => {
      root.unmount()
    })
    mountedRoots.delete(root)
    container.remove()

    expect(document.activeElement).toBe(opener)
  })

  it('keeps Tab focus inside the picker modal', () : void => {
    renderModal()

    const nameInput: HTMLInputElement = document.getElementById('candidate-name-input') as HTMLInputElement
    const closeButton: HTMLButtonElement | null = document.querySelector<HTMLButtonElement>('button[aria-label="후보군 선택 닫기"]')
    const secondOption: HTMLButtonElement | undefined = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button: HTMLButtonElement) : boolean =>
      button.textContent?.includes('Candidate B'),
    )

    expect(closeButton).toBeTruthy()
    expect(secondOption).toBeTruthy()

    closeButton?.focus()
    dispatchKeyDown(closeButton as HTMLButtonElement, 'Tab', { shiftKey: true })
    expect(document.activeElement).toBe(secondOption)

    dispatchKeyDown(secondOption as HTMLButtonElement, 'Tab')
    expect(document.activeElement).toBe(closeButton)

    nameInput.focus()
    expect(document.activeElement).toBe(nameInput)
  })

  it('closes the picker modal when Escape is pressed', () : void => {
    const { props }: RenderResult = renderModal()
    const nameInput: HTMLInputElement = document.getElementById('candidate-name-input') as HTMLInputElement

    dispatchKeyDown(nameInput, 'Escape')

    expect(props.onClose).toHaveBeenCalledTimes(1)
  })
})

describe('CandidateStashPickerModal loading state', () : void => {
  it('announces option refresh and exposes why existing options are disabled', () : void => {
    renderModal({ loading: true })

    const status: HTMLElement | null = document.querySelector<HTMLElement>('[role="status"]')
    const optionButtons: HTMLButtonElement[] = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).filter((button: HTMLButtonElement) : boolean =>
      button.textContent?.includes('Candidate'),
    )

    expect(status?.id).toBe('candidate-stash-picker-refreshing-status')
    expect(status?.textContent).toContain('후보군 목록을 갱신 중입니다')
    expect(status?.getAttribute('aria-live')).toBe('polite')
    expect(status?.parentElement?.getAttribute('aria-busy')).toBe('true')
    expect(optionButtons).toHaveLength(2)
    optionButtons.forEach((button: HTMLButtonElement) : void => {
      expect(button.disabled).toBe(true)
      expect(button.getAttribute('aria-describedby')).toBe('candidate-stash-picker-refreshing-status')
      expect(button.getAttribute('role')).toBeNull()
    })
  })

  it('keeps selection blocked while options are refreshing', () : void => {
    const { props }: RenderResult = renderModal({ loading: true })
    const firstOption: HTMLButtonElement | undefined = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button: HTMLButtonElement) : boolean =>
      button.textContent?.includes('Candidate A'),
    )

    firstOption?.click()

    expect(props.onSelect).not.toHaveBeenCalled()
  })
})
