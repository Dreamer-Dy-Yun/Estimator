// @vitest-environment jsdom
import { act, type ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { ConfirmModal } from './ConfirmModal'

const renderConfirmModal = (props?: Partial<ComponentProps<typeof ConfirmModal>>) => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const onCancel = vi.fn()
  const onConfirm = vi.fn()

  act(() => {
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

const cleanup = (root: Root, container: HTMLElement) => {
  act(() => {
    root.unmount()
  })
  container.remove()
}

beforeEach(() => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    callback(0)
    return 0
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('ConfirmModal', () => {
  it('moves initial focus to the cancel button and restores previous focus on close', () => {
    const trigger = document.createElement('button')
    trigger.type = 'button'
    trigger.textContent = 'Open modal'
    document.body.appendChild(trigger)
    trigger.focus()

    const { container, root } = renderConfirmModal()
    const cancelButton = container.querySelector<HTMLButtonElement>('button')

    expect(document.activeElement).toBe(cancelButton)

    cleanup(root, container)

    expect(document.activeElement).toBe(trigger)
  })

  it('keeps Tab and Shift+Tab focus movement inside the dialog', () => {
    const { container, root } = renderConfirmModal()
    const buttons = container.querySelectorAll<HTMLButtonElement>('button')
    const cancelButton = buttons[0]
    const confirmButton = buttons[1]
    const backdrop = container.firstElementChild as HTMLDivElement

    confirmButton.focus()

    act(() => {
      backdrop.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    })

    expect(document.activeElement).toBe(cancelButton)

    act(() => {
      backdrop.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    })

    expect(document.activeElement).toBe(confirmButton)

    cleanup(root, container)
  })

  it('closes with Escape when not busy and keeps busy Escape behavior unchanged', () => {
    const idle = renderConfirmModal()
    const idleBackdrop = idle.container.firstElementChild as HTMLDivElement

    act(() => {
      idleBackdrop.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(idle.onCancel).toHaveBeenCalledTimes(1)
    cleanup(idle.root, idle.container)

    const busy = renderConfirmModal({ busy: true })
    const busyBackdrop = busy.container.firstElementChild as HTMLDivElement

    act(() => {
      busyBackdrop.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(busy.onCancel).not.toHaveBeenCalled()
    cleanup(busy.root, busy.container)
  })
})
