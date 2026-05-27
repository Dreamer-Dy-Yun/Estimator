import { useCallback, useEffect, type KeyboardEvent, type RefObject } from 'react'

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

type Args<T extends HTMLElement> = {
  panelRef: RefObject<T | null>
  onClose: () => void
  active?: boolean
  closeDisabled?: boolean
  trapDisabled?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
  getInitialFocus?: () => HTMLElement | null
  onEscape?: () => boolean
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true' && element.tabIndex !== -1)
}

export function useModalFocusTrap<T extends HTMLElement>({
  panelRef,
  onClose,
  active = true,
  closeDisabled = false,
  trapDisabled = false,
  initialFocusRef,
  getInitialFocus,
  onEscape,
}: Args<T>) {
  useEffect(() => {
    if (!active) return undefined
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const panel = panelRef.current
    const preferredFocus = getInitialFocus?.() ?? initialFocusRef?.current
    const initialFocus = preferredFocus && !preferredFocus.hasAttribute('disabled') && preferredFocus.tabIndex !== -1
      ? preferredFocus
      : panel
        ? getFocusableElements(panel)[0] ?? panel
        : null
    initialFocus?.focus()
    return () => {
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [active, getInitialFocus, initialFocusRef, panelRef])

  return useCallback((event: KeyboardEvent<T>) => {
    if (!active) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      if (onEscape?.()) return
      if (!closeDisabled) onClose()
      return
    }
    if (event.key !== 'Tab' || trapDisabled) return
    const panel = panelRef.current
    if (!panel) return
    const focusableElements = getFocusableElements(panel)
    if (!focusableElements.length) {
      event.preventDefault()
      panel.focus()
      return
    }
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
      return
    }
    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }, [active, closeDisabled, onClose, onEscape, panelRef, trapDisabled])
}
