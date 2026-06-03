import { useCallback, useEffect,} from 'react'

const FOCUSABLE_SELECTOR: string = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

type Args<T extends HTMLElement> = {
  panelRef: React.RefObject<T | null>
  onClose: () => void
  active?: boolean
  closeDisabled?: boolean
  trapDisabled?: boolean
  initialFocusRef?: React.RefObject<HTMLElement | null>
  getInitialFocus?: () => HTMLElement | null
  onEscape?: () => boolean
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element: HTMLElement) : boolean => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true' && element.tabIndex !== -1)
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
}: Args<T>) : (event: React.KeyboardEvent<T>) => void {
  useEffect(() : (() => void) | undefined => {
    if (!active) return undefined
    const previousFocus: HTMLElement | null = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const panel: T | null = panelRef.current
    const preferredFocus: HTMLElement | null | undefined = getInitialFocus?.() ?? initialFocusRef?.current
    const initialFocus: HTMLElement | null = preferredFocus && !preferredFocus.hasAttribute('disabled') && preferredFocus.tabIndex !== -1
      ? preferredFocus
      : panel
        ? getFocusableElements(panel)[0] ?? panel
        : null
    initialFocus?.focus()
    return () : void => {
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [active, getInitialFocus, initialFocusRef, panelRef])

  return useCallback((event: React.KeyboardEvent<T>) : void => {
    if (!active) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      if (onEscape?.()) return
      if (!closeDisabled) onClose()
      return
    }
    if (event.key !== 'Tab' || trapDisabled) return
    const panel: T | null = panelRef.current
    if (!panel) return
    const focusableElements: HTMLElement[] = getFocusableElements(panel)
    if (!focusableElements.length) {
      event.preventDefault()
      panel.focus()
      return
    }
    const firstElement: HTMLElement = focusableElements[0]
    const lastElement: HTMLElement = focusableElements[focusableElements.length - 1]
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
