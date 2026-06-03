import { eventPathContainsInteractiveControl } from '../interaction/interactionTarget'

/**
 * Marks portal content that should not trigger product-drawer outside-click close.
 * The selector is attribute-based so `Element.closest` can detect nested portal nodes.
 */
const DRAWER_KEEP_OPEN_ATTR: 'data-drawer-keep-open' = 'data-drawer-keep-open' as const

export const DRAWER_KEEP_OPEN_SELECTOR: '[data-drawer-keep-open="true"]' = `[${DRAWER_KEEP_OPEN_ATTR}="true"]` as const

export function drawerKeepOpenDataProps(): { [DRAWER_KEEP_OPEN_ATTR]: 'true' } {
  return { [DRAWER_KEEP_OPEN_ATTR]: 'true' }
}

export function shouldKeepDrawerOpenFromEventPath(path: readonly EventTarget[]): boolean {
  return eventPathContainsInteractiveControl(path) || path.some((node: EventTarget) : boolean => (
    node instanceof Element && Boolean(node.closest(DRAWER_KEEP_OPEN_SELECTOR))
  ))
}

export function shouldKeepDrawerOpenOnOutsideMouseDown(event: MouseEvent): boolean {
  return shouldKeepDrawerOpenFromEventPath(event.composedPath())
}

/** Adds inner-drawer state attributes consumed by `CandidateStashDetailModal.module.css`. */
const INNER_DRAWER_LAYOUT_SHIFT_ATTR: 'data-inner-drawer-open' = 'data-inner-drawer-open' as const
const INNER_DRAWER_LAYOUT_CLOSING_ATTR: 'data-inner-drawer-closing' = 'data-inner-drawer-closing' as const

export function stashDetailModalBackdropDataProps(drawerOpen: boolean, drawerClosing: boolean = false): {
  [DRAWER_KEEP_OPEN_ATTR]: 'true'
  [INNER_DRAWER_LAYOUT_SHIFT_ATTR]?: 'true'
  [INNER_DRAWER_LAYOUT_CLOSING_ATTR]?: 'true'
} {
  return {
    ...drawerKeepOpenDataProps(),
    ...(drawerOpen ? { [INNER_DRAWER_LAYOUT_SHIFT_ATTR]: 'true' } : {}),
    ...(drawerClosing ? { [INNER_DRAWER_LAYOUT_CLOSING_ATTR]: 'true' } : {}),
  }
}
