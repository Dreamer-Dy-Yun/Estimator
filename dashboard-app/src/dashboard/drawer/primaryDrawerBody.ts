/** `layout.module.css` 의 `body[data-primary-drawer-open]` 과 동일 */
export const PRIMARY_DRAWER_OPEN_ATTR = 'data-primary-drawer-open' as const

export function setBodyPrimaryDrawerOpen(open: boolean): void {
  if (open) document.body.setAttribute(PRIMARY_DRAWER_OPEN_ATTR, 'true')
  else document.body.removeAttribute(PRIMARY_DRAWER_OPEN_ATTR)
}
