import { memo, type CSSProperties } from 'react'
import type { CandidateBadge } from '../../../api'
import styles from './CandidateInsightBadges.module.css'

const DEFAULT_BADGE_COLOR = '#64748b' as const
const badgeStyleByColor: Map<string, CSSProperties> = new Map<string, CSSProperties>()

export type Props = {
  badges: CandidateBadge[]
  loading?: boolean
  failed?: boolean
}

function getBadgeStyle(color: string): CSSProperties {
  const cached: CSSProperties | undefined = badgeStyleByColor.get(color)
  if (cached) return cached
  const style: CSSProperties = { '--candidate-badge-color': color } as CSSProperties
  badgeStyleByColor.set(color, style)
  return style
}

const CandidateInsightBadgeItem: React.MemoExoticComponent<({ badge }: { badge: CandidateBadge; }) => React.JSX.Element> = memo(function CandidateInsightBadgeItem({ badge }: { badge: CandidateBadge }) : React.JSX.Element {
  const color: string = badge.color || DEFAULT_BADGE_COLOR
  return (
    <span
      className={styles.badge}
      title={badge.tooltip || badge.name}
      style={getBadgeStyle(color)}
    >
      <span>{badge.name}</span>
    </span>
  )
})

export const CandidateInsightBadges: React.MemoExoticComponent<({ badges, loading, failed, }: Props) => React.JSX.Element> = memo(function CandidateInsightBadges({
  badges,
  loading = false,
  failed = false,
}: Props) : React.JSX.Element {
  if (loading) {
    return <span className={styles.pending}>로딩중...</span>
  }

  if (failed) {
    return <span className={styles.failed}>실패</span>
  }

  if (!badges.length) {
    return <span className={styles.empty}>-</span>
  }

  return (
    <>
      {badges.map((badge: CandidateBadge) : React.JSX.Element => (
        <CandidateInsightBadgeItem key={badge.name} badge={badge} />
      ))}
    </>
  )
})
