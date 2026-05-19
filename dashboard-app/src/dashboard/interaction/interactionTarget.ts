export const FILTER_COMBO_PANEL_SELECTOR = '[data-filter-combo-panel]' as const

export const EDITING_OR_COMBO_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  FILTER_COMBO_PANEL_SELECTOR,
].join(', ')

export const INTERACTIVE_CONTROL_SELECTOR = [
  EDITING_OR_COMBO_SELECTOR,
  'button',
  'a[href]',
  'label',
  'summary',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="radio"]',
  '[role="tab"]',
  '[role="menuitem"]',
].join(', ')

export const DIALOG_OR_INTERACTIVE_CONTROL_SELECTOR = [
  INTERACTIVE_CONTROL_SELECTOR,
  '[role="dialog"]',
].join(', ')

export function getEventTargetElement(target: EventTarget | null): Element | null {
  if (target instanceof Element) return target
  if (target instanceof Node) return target.parentElement
  return null
}

export function isClosestToSelector(target: EventTarget | null, selector: string): boolean {
  return Boolean(getEventTargetElement(target)?.closest(selector))
}

export function isEditingOrComboTarget(target: EventTarget | null): boolean {
  return isClosestToSelector(target, EDITING_OR_COMBO_SELECTOR)
}

export function isInteractiveControlTarget(target: EventTarget | null): boolean {
  return isClosestToSelector(target, INTERACTIVE_CONTROL_SELECTOR)
}

export function isDialogOrInteractiveControlTarget(target: EventTarget | null): boolean {
  return isClosestToSelector(target, DIALOG_OR_INTERACTIVE_CONTROL_SELECTOR)
}

export function eventPathContainsInteractiveControl(path: readonly EventTarget[]): boolean {
  return path.some(isInteractiveControlTarget)
}
