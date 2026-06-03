// @vitest-environment jsdom
import { act, type ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi , type Mock} from 'vitest';
import { createRoot, type Root } from 'react-dom/client'
import { ConfirmModal } from './ConfirmModal'

const renderConfirmModal: (props?: Partial<ComponentProps<typeof ConfirmModal>>) => { container: HTMLDivElement; root: Root; onCancel: Mock<() => void>; onConfirm: Mock<() => void>; } = (props?: Partial<ComponentProps<typeof ConfirmModal>>) : { container: HTMLDivElement; root: Root; onCancel: Mock<() => void>; onConfirm: Mock<() => void>; } => {
  const container: HTMLDivElement = document.createElement('div')
  document.body.appendChild(container)
  const root: Root = createRoot(container)
  const onCancel: Mock<() => void> = vi.fn()
  const onConfirm: Mock<() => void> = vi.fn()

  act(() : void => {
    root.render(
      <ConfirmModal
        open
        title="Delete item"
        message="This action cannot be undone."
        cancelText="Cancel"
        confirmText="Confirm"
        confirmingText="Confirming"
        dialogTitleId="confirm-modal-title"
        onCancel={onCancel}
        onConfirm={onConfirm}
        {...props}
      />,
    )
  })

  return {
    container,
    root,
    onCancel,
    onConfirm,
  }
}

const cleanup: (root: Root, container: HTMLElement) => void = (root: Root, container: HTMLElement) : void => {
  act(() : void => {
    root.unmount()
  })
  container.remove()
}

beforeEach(() : void => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) : number => {
    callback(0)
    return 0
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() : undefined => undefined)
})

afterEach(() : void => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('ConfirmModal', () : void => {
  it('moves initial focus to the cancel button and restores previous focus on close', () : void => {
    const trigger: HTMLButtonElement = document.createElement('button')
    trigger.type = 'button'
    trigger.textContent = 'Open modal'
    document.body.appendChild(trigger)
    trigger.focus()

    const { container, root }: { container: HTMLDivElement; root: Root; onCancel: Mock<() => void>; onConfirm: Mock<() => void>; } = renderConfirmModal()
    const cancelButton: HTMLButtonElement | null = container.querySelector<HTMLButtonElement>('button')

    expect(document.activeElement).toBe(cancelButton)

    cleanup(root, container)

    expect(document.activeElement).toBe(trigger)
  })

  it('keeps Tab and Shift+Tab focus movement inside the dialog', () : void => {
    const { container, root }: { container: HTMLDivElement; root: Root; onCancel: Mock<() => void>; onConfirm: Mock<() => void>; } = renderConfirmModal()
    const buttons: NodeListOf<HTMLButtonElement> = container.querySelectorAll<HTMLButtonElement>('button')
    const cancelButton: HTMLButtonElement = buttons[0]
    const confirmButton: HTMLButtonElement = buttons[1]
    const backdrop: HTMLDivElement = container.firstElementChild as HTMLDivElement

    confirmButton.focus()

    act(() : void => {
      backdrop.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    })

    expect(document.activeElement).toBe(cancelButton)

    act(() : void => {
      backdrop.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    })

    expect(document.activeElement).toBe(confirmButton)

    cleanup(root, container)
  })

  it('closes with Escape when not busy and keeps busy Escape behavior unchanged', () : void => {
    const idle: { container: HTMLDivElement; root: Root; onCancel: Mock<() => void>; onConfirm: Mock<() => void>; } = renderConfirmModal()
    const idleBackdrop: HTMLDivElement = idle.container.firstElementChild as HTMLDivElement

    act(() : void => {
      idleBackdrop.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(idle.onCancel).toHaveBeenCalledTimes(1)
    cleanup(idle.root, idle.container)

    const busy: { container: HTMLDivElement; root: Root; onCancel: Mock<() => void>; onConfirm: Mock<() => void>; } = renderConfirmModal({ busy: true })
    const busyBackdrop: HTMLDivElement = busy.container.firstElementChild as HTMLDivElement

    act(() : void => {
      busyBackdrop.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(busy.onCancel).not.toHaveBeenCalled()
    cleanup(busy.root, busy.container)
  })
})
