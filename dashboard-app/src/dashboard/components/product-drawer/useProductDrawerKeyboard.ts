import { useEffect } from 'react'
import type { AdjacentDirection } from '../../../utils/adjacentListNavigation'

function getEventTargetElement(target: EventTarget | null): Element | null {
  if (target instanceof Element) return target
  if (target instanceof Node) return target.parentElement
  return null
}

function blocksAdjacentKeyNavigation(target: EventTarget | null): boolean {
  const el = getEventTargetElement(target)
  return Boolean(el?.closest('input, textarea, select, [contenteditable="true"], [data-filter-combo-panel]'))
}

interface ProductDrawerKeyboardOptions {
  closing?: boolean
  expandPaneOpen?: boolean
  setExpandPaneOpen?: (open: boolean) => void
  secondaryEnabled?: boolean
  onClose: () => void
  onRequestNavigateAdjacent?: (direction: AdjacentDirection) => void | Promise<void>
  disableAdjacentNavigation?: boolean
}

export function useProductDrawerKeyboard({
  closing = false,
  expandPaneOpen = false,
  setExpandPaneOpen,
  secondaryEnabled = false,
  onClose,
  onRequestNavigateAdjacent,
  disableAdjacentNavigation,
}: ProductDrawerKeyboardOptions) {
  useEffect(() => {
    if (closing) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      if (blocksAdjacentKeyNavigation(e.target)) return
      e.preventDefault()
      e.stopPropagation()

      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && onRequestNavigateAdjacent && !disableAdjacentNavigation) {
        const direction: AdjacentDirection = e.key === 'ArrowDown' ? 'next' : 'prev'
        void Promise.resolve(onRequestNavigateAdjacent(direction))
        return
      }

      if (e.key === 'ArrowLeft') {
        if (secondaryEnabled && !expandPaneOpen) setExpandPaneOpen?.(true)
        return
      }

      if (expandPaneOpen) {
        setExpandPaneOpen?.(false)
        return
      }
      onClose()
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [
    closing,
    disableAdjacentNavigation,
    expandPaneOpen,
    onClose,
    onRequestNavigateAdjacent,
    secondaryEnabled,
    setExpandPaneOpen,
  ])

  useEffect(() => {
    if (closing) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      e.preventDefault()
      e.stopPropagation()
      if (expandPaneOpen) {
        setExpandPaneOpen?.(false)
        return
      }
      onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closing, expandPaneOpen, onClose, setExpandPaneOpen])
}
