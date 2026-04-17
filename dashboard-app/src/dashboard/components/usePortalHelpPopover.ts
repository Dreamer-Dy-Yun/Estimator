import { useCallback, useEffect, useRef, useState } from 'react'
import {
  computeHelpPopoverPosition,
  type PortalHelpPopoverOptions,
  type PortalHelpPlacement,
} from './portalHelpPopoverPosition'

const DEFAULT_W = 260
const DEFAULT_PAD = 8
const DEFAULT_EST_H = 140

export function usePortalHelpPopover<T extends string>(options?: PortalHelpPopoverOptions) {
  const width = options?.width ?? DEFAULT_W
  const pad = options?.pad ?? DEFAULT_PAD
  const estH = options?.estHeight ?? DEFAULT_EST_H
  const closeDelayMs = options?.closeDelayMs ?? 180

  const [activeId, setActiveId] = useState<T | null>(null)
  const [activePlacement, setActivePlacement] = useState<PortalHelpPlacement>('above')
  const [activeAnchorRect, setActiveAnchorRect] = useState<DOMRect | null>(null)
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
      const rect = el.getBoundingClientRect()
      setPosition(
        computeHelpPopoverPosition(rect, placement, {
          width,
          pad,
          estHeight: estH,
        }),
      )
      setActivePlacement(placement)
      setActiveAnchorRect(rect)
      setActiveId(id)
    },
    [estH, pad, width],
  )

  const updateMeasuredBox = useCallback(
    (measuredWidth: number, measuredHeight: number) => {
      if (!activeAnchorRect) return
      const w = Number.isFinite(measuredWidth) && measuredWidth > 0 ? measuredWidth : width
      const h = Number.isFinite(measuredHeight) && measuredHeight > 0 ? measuredHeight : estH
      const next = computeHelpPopoverPosition(activeAnchorRect, activePlacement, {
        width: w,
        pad,
        estHeight: h,
      })
      setPosition((prev) => (
        prev.top === next.top && prev.left === next.left ? prev : next
      ))
    },
    [activeAnchorRect, activePlacement, estH, pad, width],
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
    activePlacement,
    position,
    setAnchor,
    open,
    updateMeasuredBox,
    scheduleClose,
    cancelClose,
    close,
  }
}
