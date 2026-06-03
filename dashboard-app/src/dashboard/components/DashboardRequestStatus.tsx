import type { DashboardRequestError } from '../hooks/useDashboardRequest'
import type { DashboardRequestState } from '../hooks/useDashboardRequest'
import styles from './DashboardRequestStatus.module.css'

export type RequestStatusItem = {
  label: string
  state: Pick<DashboardRequestState<unknown>, 'loading' | 'isRefreshing' | 'error' | 'lastUpdatedAt' | 'isStale'>
}

export type DashboardRequestStatusProps = {
  items: RequestStatusItem[]
  compact?: boolean
}

const dateTimeFormat: Intl.DateTimeFormat = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatUpdatedAt(value: string | null) : string {
  if (!value) return '아직 없음'
  const time: Date = new Date(value)
  if (Number.isNaN(time.getTime())) return '확인 불가'
  return dateTimeFormat.format(time)
}

export function DashboardRequestStatus({ items, compact = false }: DashboardRequestStatusProps) : React.JSX.Element | null {
  const loading: boolean = items.some(({ state }: RequestStatusItem) : boolean => state.loading)
  const refreshing: boolean = items.some(({ state }: RequestStatusItem) : boolean => state.isRefreshing)
  const failedItems: RequestStatusItem[] = items.filter(({ state }: RequestStatusItem) : DashboardRequestError | null => state.error)
  const stale: boolean = failedItems.some(({ state }: RequestStatusItem) : boolean => state.isStale)
  const shouldHideIdleCompactStatus: boolean = compact && !loading && !refreshing && !failedItems.length
  const lastUpdatedAt: string | null = items
    .map(({ state }: RequestStatusItem) : string | null => state.lastUpdatedAt)
    .filter((value: string | null): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null

  if (shouldHideIdleCompactStatus) return null

  const status: '이전 데이터 표시' | '조회 실패' | '갱신 중' | '조회 중' | '최신' = failedItems.length
    ? (stale ? '이전 데이터 표시' : '조회 실패')
    : refreshing
      ? '갱신 중'
      : loading
        ? '조회 중'
        : '최신'
  const tone: string = failedItems.length ? (stale ? styles.warn : styles.error) : refreshing || loading ? styles.busy : styles.ok
  const failedLabel: string = failedItems.map((item: RequestStatusItem) : string => item.label).join(', ')
  const message: string = failedItems.length
    ? `${failedLabel} 요청 실패`
    : refreshing
      ? '기존 데이터를 유지한 채 새 데이터를 확인 중'
      : loading
        ? '초기 데이터를 불러오는 중'
        : '요청이 정상 처리됨'
  const updatedAtLabel: string = `마지막 갱신 ${formatUpdatedAt(lastUpdatedAt)}`
  const className: string = compact ? `${styles.statusBar} ${styles.statusBarCompact}` : styles.statusBar

  return (
    <section className={className} aria-live="polite" aria-label="분석 데이터 요청 상태" title={`${message} · ${updatedAtLabel}`}>
      <span className={`${styles.badge} ${tone}`}>{status}</span>
      {!compact && <span className={styles.message}>{message}</span>}
      <span className={styles.updatedAt}>{updatedAtLabel}</span>
    </section>
  )
}
