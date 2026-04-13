import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

const DEFAULT_W = 260
const DEFAULT_PAD = 8
const DEFAULT_EST_H = 140

export type PortalHelpPlacement = 'above' | 'below'

export function computeHelpPopoverPosition(
  anchorRect: DOMRect,
  placement: PortalHelpPlacement,
  options?: { width?: number; pad?: number; estHeight?: number },
): { top: number; left: number } {
  const width = options?.width ?? DEFAULT_W
  const pad = options?.pad ?? DEFAULT_PAD
  const estH = options?.estHeight ?? DEFAULT_EST_H

  let left = anchorRect.right - width
  left = Math.max(pad, Math.min(left, window.innerWidth - width - pad))

  let top: number
  if (placement === 'above') {
    top = anchorRect.top - estH - pad
    if (top < pad) {
      top = anchorRect.bottom + pad
    }
  } else {
    top = anchorRect.bottom + pad
    if (top + estH > window.innerHeight - pad) {
      top = Math.max(pad, anchorRect.top - estH - pad)
    }
  }
  return { top, left }
}

export type PortalHelpPopoverOptions = {
  /** 도움말 패널 가로(px) */
  width?: number
  pad?: number
  estHeight?: number
  closeDelayMs?: number
}

export function usePortalHelpPopover<T extends string>(options?: PortalHelpPopoverOptions) {
  const width = options?.width ?? DEFAULT_W
  const pad = options?.pad ?? DEFAULT_PAD
  const estH = options?.estHeight ?? DEFAULT_EST_H
  const closeDelayMs = options?.closeDelayMs ?? 180

  const [activeId, setActiveId] = useState<T | null>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const anchorsRef = useRef(new Map<T, HTMLElement>())
  const closeTimerRef = useRef<number | null>(null)

  const setAnchor = useCallback((id: T) => (el: HTMLElement | null) => {
    const m = anchorsRef.current
    if (el) m.set(id, el)
    else m.delete(id)
  }, [])

  const open = useCallback(
    (id: T, placement: PortalHelpPlacement) => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
      const el = anchorsRef.current.get(id)
      if (!el) return
      setPosition(
        computeHelpPopoverPosition(el.getBoundingClientRect(), placement, {
          width,
          pad,
          estHeight: estH,
        }),
      )
      setActiveId(id)
    },
    [estH, pad, width],
  )

  const scheduleClose = useCallback(() => {
    closeTimerRef.current = window.setTimeout(() => {
      setActiveId(null)
      closeTimerRef.current = null
    }, closeDelayMs)
  }, [closeDelayMs])

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const close = useCallback(() => {
    cancelClose()
    setActiveId(null)
  }, [cancelClose])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  return {
    activeId,
    position,
    setAnchor,
    open,
    scheduleClose,
    cancelClose,
    close,
  }
}

type PortalHelpMarkProps<T extends string> = {
  helpId: T
  placement: PortalHelpPlacement
  labelId: string
  markClassName: string
  help: ReturnType<typeof usePortalHelpPopover<T>>
  stopMouseDownPropagation?: boolean
}

export function PortalHelpMark<T extends string>({
  helpId,
  placement,
  labelId,
  markClassName,
  help,
  stopMouseDownPropagation,
}: PortalHelpMarkProps<T>) {
  const { activeId, setAnchor, open, scheduleClose } = help
  return (
    <span
      ref={setAnchor(helpId)}
      className={markClassName}
      tabIndex={0}
      aria-describedby={activeId === helpId ? labelId : undefined}
      aria-expanded={activeId === helpId}
      onMouseEnter={() => open(helpId, placement)}
      onMouseLeave={scheduleClose}
      onFocus={() => open(helpId, placement)}
      onBlur={scheduleClose}
      onMouseDown={stopMouseDownPropagation ? (e) => e.stopPropagation() : undefined}
    >
      <span aria-hidden>?</span>
    </span>
  )
}

type PortalHelpPopoverLayerProps<T extends string> = {
  help: ReturnType<typeof usePortalHelpPopover<T>>
  popoverClassName: string
  getTooltipId: (id: T) => string
  children: (id: T) => ReactNode
}

export function PortalHelpPopoverLayer<T extends string>({
  help,
  popoverClassName,
  getTooltipId,
  children,
}: PortalHelpPopoverLayerProps<T>) {
  const { activeId, position, scheduleClose, cancelClose } = help
  if (activeId == null) return null

  return createPortal(
    <div
      id={getTooltipId(activeId)}
      role="tooltip"
      className={popoverClassName}
      style={{ top: position.top, left: position.left }}
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
    >
      {children(activeId)}
    </div>,
    document.body,
  )
}
