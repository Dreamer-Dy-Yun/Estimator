import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
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
