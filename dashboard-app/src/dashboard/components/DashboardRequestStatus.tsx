import type { DashboardRequestState } from '../hooks/useDashboardRequest'
import styles from './DashboardRequestStatus.module.css'

type RequestStatusItem = {
  label: string
  state: Pick<DashboardRequestState<unknown>, 'loading' | 'isRefreshing' | 'error' | 'lastUpdatedAt' | 'isStale'>
}

type DashboardRequestStatusProps = {
  items: RequestStatusItem[]
  compact?: boolean
}

const dateTimeFormat = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatUpdatedAt(value: string | null) {
  if (!value) return '아직 없음'
  const time = new Date(value)
  if (Number.isNaN(time.getTime())) return '확인 불가'
  return dateTimeFormat.format(time)
}

export function DashboardRequestStatus({ items, compact = false }: DashboardRequestStatusProps) {
  const loading = items.some(({ state }) => state.loading)
  const refreshing = items.some(({ state }) => state.isRefreshing)
  const failedItems = items.filter(({ state }) => state.error)
  const stale = failedItems.some(({ state }) => state.isStale)
  const shouldHideIdleCompactStatus = compact && !loading && !refreshing && !failedItems.length
  const lastUpdatedAt = items
    .map(({ state }) => state.lastUpdatedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null

  if (shouldHideIdleCompactStatus) return null

  const status = failedItems.length
    ? (stale ? '이전 데이터 표시' : '조회 실패')
    : refreshing
      ? '갱신 중'
      : loading
        ? '조회 중'
        : '최신'
  const tone = failedItems.length ? (stale ? styles.warn : styles.error) : refreshing || loading ? styles.busy : styles.ok
  const failedLabel = failedItems.map((item) => item.label).join(', ')
  const message = failedItems.length
    ? `${failedLabel} 요청 실패`
    : refreshing
      ? '기존 데이터를 유지한 채 새 데이터를 확인 중'
      : loading
        ? '초기 데이터를 불러오는 중'
        : '요청이 정상 처리됨'
  const updatedAtLabel = `마지막 갱신 ${formatUpdatedAt(lastUpdatedAt)}`
  const className = compact ? `${styles.statusBar} ${styles.statusBarCompact}` : styles.statusBar

  return (
    <section className={className} aria-live="polite" aria-label="분석 데이터 요청 상태" title={`${message} · ${updatedAtLabel}`}>
      <span className={`${styles.badge} ${tone}`}>{status}</span>
      {!compact && <span className={styles.message}>{message}</span>}
      <span className={styles.updatedAt}>{updatedAtLabel}</span>
    </section>
  )
}
