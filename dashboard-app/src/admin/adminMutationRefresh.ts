const ADMIN_MUTATION_REFRESH_STALE_MESSAGE =
  '변경은 저장됐지만 목록 새로고침에 실패했습니다. 페이지를 새로고침해 최신 상태를 확인해 주세요.' as const

export async function refreshAfterAdminMutation(refresh: () => Promise<unknown>): Promise<string | null> {
  try {
    await refresh()
    return null
  } catch {
    return ADMIN_MUTATION_REFRESH_STALE_MESSAGE
  }
}
