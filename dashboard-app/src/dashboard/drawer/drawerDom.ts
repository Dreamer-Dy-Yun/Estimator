/**
 * ProductDrawer 바깥 클릭 시 닫지 않을 영역(테이블 랩·모달·확인창 등) 표시.
 * selector 는 `Element.closest` 용.
 */
const DRAWER_KEEP_OPEN_ATTR = 'data-drawer-keep-open' as const

export const DRAWER_KEEP_OPEN_SELECTOR = `[${DRAWER_KEEP_OPEN_ATTR}="true"]` as const

export function drawerKeepOpenDataProps(): { [DRAWER_KEEP_OPEN_ATTR]: 'true' } {
  return { [DRAWER_KEEP_OPEN_ATTR]: 'true' }
}

/** 이너 오더 모달만 드로어에 맞춰 축소한다. 스타일은 `CandidateStashDetailModal.module.css`가 소유한다. */
const INNER_DRAWER_LAYOUT_SHIFT_ATTR = 'data-inner-drawer-open' as const
const INNER_DRAWER_LAYOUT_CLOSING_ATTR = 'data-inner-drawer-closing' as const

export function stashDetailModalBackdropDataProps(drawerOpen: boolean, drawerClosing = false): {
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
