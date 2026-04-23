/** `ArrowLeft` / `ArrowRight` 등에서 이전·다음 항목으로 쓰는 방향. */
export type AdjacentDirection = 'prev' | 'next'

/**
 * 필터링된 `order`(문자열 id 배열)에서 `currentId`의 이웃 id를 반환한다. 끝에서 wrap.
 * `currentId`가 목록에 없으면 인덱스 0을 기준으로 이웃을 계산한다.
 */
export function adjacentIdInOrder(
  order: readonly string[],
  currentId: string | null,
  direction: AdjacentDirection,
): string | null {
  if (order.length === 0 || !currentId) return null
  const i = order.indexOf(currentId)
  const base = i >= 0 ? i : 0
  const delta = direction === 'next' ? 1 : -1
  const ni = (base + delta + order.length) % order.length
  return order[ni] ?? null
}
