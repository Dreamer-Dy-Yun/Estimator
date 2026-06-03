const DEFAULT_W = 260 as const
const DEFAULT_PAD = 8 as const
const DEFAULT_EST_H = 140 as const

export type PortalHelpPlacement = 'above' | 'below'

export function computeHelpPopoverPosition(
  anchorRect: DOMRect,
  placement: PortalHelpPlacement,
  options?: { width?: number; pad?: number; estHeight?: number },
): { top: number; left: number } {
  const width: number = options?.width ?? DEFAULT_W
  const pad: number = options?.pad ?? DEFAULT_PAD
  const estH: number = options?.estHeight ?? DEFAULT_EST_H

  let left: number = anchorRect.left + (anchorRect.width - width) / 2
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
  width?: number
  pad?: number
  estHeight?: number
  closeDelayMs?: number
}
