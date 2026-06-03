import { createPortal } from 'react-dom'
import { useLayoutEffect, useRef } from 'react'
import type { PortalHelpPlacement } from './portalHelpPopoverPosition'
import { usePortalHelpPopover } from './usePortalHelpPopover'

export type { PortalHelpPlacement } from './portalHelpPopoverPosition'

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
}: PortalHelpMarkProps<T>) : React.JSX.Element {
  const { activeId, setAnchor, open, scheduleClose }: { activeId: T | null; activePlacement: PortalHelpPlacement; position: { top: number; left: number; }; setAnchor: (id: T) => (el: HTMLElement | null) => void; open: (id: T, placement: PortalHelpPlacement) => void; updateMeasuredBox: (measuredWidth: number, measuredHeight: number) => void; scheduleClose: () => void; cancelClose: () => void; close: () => void; } = help
  return (
    <span
      ref={setAnchor(helpId)}
      className={markClassName}
      tabIndex={0}
      aria-describedby={activeId === helpId ? labelId : undefined}
      aria-expanded={activeId === helpId}
      onMouseEnter={() : void => open(helpId, placement)}
      onMouseLeave={scheduleClose}
      onFocus={() : void => open(helpId, placement)}
      onBlur={scheduleClose}
      onMouseDown={stopMouseDownPropagation ? (e: React.MouseEvent<HTMLSpanElement, MouseEvent>) : void => e.stopPropagation() : undefined}
    >
      <span aria-hidden>?</span>
    </span>
  )
}

type PortalHelpPopoverLayerProps<T extends string> = {
  help: ReturnType<typeof usePortalHelpPopover<T>>
  popoverClassName: string
  getTooltipId: (id: T) => string
  children: (id: T) => React.ReactNode
}

export function PortalHelpPopoverLayer<T extends string>({
  help,
  popoverClassName,
  getTooltipId,
  children,
}: PortalHelpPopoverLayerProps<T>) : React.ReactPortal | null {
  const { activeId, position, updateMeasuredBox, scheduleClose, cancelClose }: { activeId: T | null; activePlacement: PortalHelpPlacement; position: { top: number; left: number; }; setAnchor: (id: T) => (el: HTMLElement | null) => void; open: (id: T, placement: PortalHelpPlacement) => void; updateMeasuredBox: (measuredWidth: number, measuredHeight: number) => void; scheduleClose: () => void; cancelClose: () => void; close: () => void; } = help
  const popRef: React.RefObject<HTMLDivElement | null> = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() : void => {
    if (activeId == null) return
    const el: HTMLDivElement | null = popRef.current
    if (!el) return
    const w: number = el.offsetWidth
    const h: number = el.offsetHeight
    if (!h || h <= 0) return
    updateMeasuredBox(w, h)
  }, [activeId, updateMeasuredBox])

  if (activeId == null) return null

  return createPortal(
    <div
      ref={popRef}
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
