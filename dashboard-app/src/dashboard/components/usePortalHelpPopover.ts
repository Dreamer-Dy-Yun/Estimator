import { useCallback, useEffect, useRef, useState } from 'react'
import {
  computeHelpPopoverPosition,
  type PortalHelpPopoverOptions,
  type PortalHelpPlacement,
} from './portalHelpPopoverPosition'

const DEFAULT_W = 260 as const
const DEFAULT_PAD = 8 as const
const DEFAULT_EST_H = 140 as const

export function usePortalHelpPopover<T extends string>(options?: PortalHelpPopoverOptions) : { activeId: T | null; activePlacement: PortalHelpPlacement; position: { top: number; left: number; }; setAnchor: (id: T) => (el: HTMLElement | null) => void; open: (id: T, placement: PortalHelpPlacement) => void; updateMeasuredBox: (measuredWidth: number, measuredHeight: number) => void; scheduleClose: () => void; cancelClose: () => void; close: () => void; } {
  const width: number = options?.width ?? DEFAULT_W
  const pad: number = options?.pad ?? DEFAULT_PAD
  const estH: number = options?.estHeight ?? DEFAULT_EST_H
  const closeDelayMs: number = options?.closeDelayMs ?? 180

  const [activeId, setActiveId]: [T | null, React.Dispatch<React.SetStateAction<T | null>>] = useState<T | null>(null)
  const [activePlacement, setActivePlacement]: [PortalHelpPlacement, React.Dispatch<React.SetStateAction<PortalHelpPlacement>>] = useState<PortalHelpPlacement>('above')
  const [activeAnchorRect, setActiveAnchorRect]: [DOMRect | null, React.Dispatch<React.SetStateAction<DOMRect | null>>] = useState<DOMRect | null>(null)
  const [position, setPosition]: [{ top: number; left: number; }, React.Dispatch<React.SetStateAction<{ top: number; left: number; }>>] = useState({ top: 0, left: 0 })
  const anchorsRef: React.RefObject<Map<T, HTMLElement>> = useRef(new Map<T, HTMLElement>())
  const closeTimerRef: React.RefObject<number | null> = useRef<number | null>(null)

  const setAnchor: (id: T) => (el: HTMLElement | null) => void = useCallback((id: T) : (el: HTMLElement | null) => void => (el: HTMLElement | null) : void => {
    const m: Map<T, HTMLElement> = anchorsRef.current
    if (el) m.set(id, el)
    else m.delete(id)
  }, [])

  const open: (id: T, placement: PortalHelpPlacement) => void = useCallback(
    (id: T, placement: PortalHelpPlacement) : void => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
      const el: HTMLElement | undefined = anchorsRef.current.get(id)
      if (!el) return
      const rect: DOMRect = el.getBoundingClientRect()
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

  const updateMeasuredBox: (measuredWidth: number, measuredHeight: number) => void = useCallback(
    (measuredWidth: number, measuredHeight: number) : void => {
      if (!activeAnchorRect) return
      const w: number = Number.isFinite(measuredWidth) && measuredWidth > 0 ? measuredWidth : width
      const h: number = Number.isFinite(measuredHeight) && measuredHeight > 0 ? measuredHeight : estH
      const next: { top: number; left: number; } = computeHelpPopoverPosition(activeAnchorRect, activePlacement, {
        width: w,
        pad,
        estHeight: h,
      })
      setPosition((prev: { top: number; left: number; }) : { top: number; left: number; } => (
        prev.top === next.top && prev.left === next.left ? prev : next
      ))
    },
    [activeAnchorRect, activePlacement, estH, pad, width],
  )

  const scheduleClose: () => void = useCallback(() : void => {
    closeTimerRef.current = window.setTimeout(() : void => {
      setActiveId(null)
      closeTimerRef.current = null
    }, closeDelayMs)
  }, [closeDelayMs])

  const cancelClose: () => void = useCallback(() : void => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const close: () => void = useCallback(() : void => {
    cancelClose()
    setActiveId(null)
  }, [cancelClose])

  useEffect(() : () => void => {
    return () : void => {
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
