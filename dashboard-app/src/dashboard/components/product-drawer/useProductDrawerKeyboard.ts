import { useEffect } from 'react'
import type { AdjacentDirection } from '../../../utils/adjacentListNavigation'
import { isEditingOrComboTarget } from '../../interaction/interactionTarget'

const CANDIDATE_STASH_PICKER_DIALOG_SELECTOR = '[aria-labelledby="candidate-stash-picker-title"]' as const

export interface ProductDrawerKeyboardOptions {
  closing?: boolean
  expandPaneOpen?: boolean
  setExpandPaneOpen?: (open: boolean) => void
  secondaryEnabled?: boolean
  onClose: () => void
  onRequestNavigateAdjacent?: (direction: AdjacentDirection) => void | Promise<void>
  disableAdjacentNavigation?: boolean
  disabled?: boolean
}

export function useProductDrawerKeyboard({
  closing = false,
  expandPaneOpen = false,
  setExpandPaneOpen,
  secondaryEnabled = false,
  onClose,
  onRequestNavigateAdjacent,
  disableAdjacentNavigation,
  disabled = false,
}: ProductDrawerKeyboardOptions) : void {
  useEffect(() : (() => void) | undefined => {
    if (closing || disabled) return

    const onKeyDown: (e: KeyboardEvent) => void = (e: KeyboardEvent) : void => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      if (isEditingOrComboTarget(e.target)) return
      if (isCandidateStashPickerOpen()) return
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
    return () : void => window.removeEventListener('keydown', onKeyDown, true)
  }, [
    closing,
    disabled,
    disableAdjacentNavigation,
    expandPaneOpen,
    onClose,
    onRequestNavigateAdjacent,
    secondaryEnabled,
    setExpandPaneOpen,
  ])

  useEffect(() : (() => void) | undefined => {
    if (closing || disabled) return

    const onKeyDown: (e: KeyboardEvent) => void = (e: KeyboardEvent) : void => {
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
    return () : void => window.removeEventListener('keydown', onKeyDown)
  }, [closing, disabled, expandPaneOpen, onClose, setExpandPaneOpen])
}

function isCandidateStashPickerOpen() : boolean {
  return Boolean(document.querySelector(CANDIDATE_STASH_PICKER_DIALOG_SELECTOR))
}
