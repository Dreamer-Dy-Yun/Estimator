import { memo, type CSSProperties } from 'react'
import type { CandidateBadge } from '../../../api'
import styles from './CandidateInsightBadges.module.css'

const DEFAULT_BADGE_COLOR = '#64748b'
const badgeStyleByColor = new Map<string, CSSProperties>()

type Props = {
  badges: CandidateBadge[]
  loading?: boolean
  failed?: boolean
}

function getBadgeStyle(color: string): CSSProperties {
  const cached = badgeStyleByColor.get(color)
  if (cached) return cached
  const style = { '--candidate-badge-color': color } as CSSProperties
  badgeStyleByColor.set(color, style)
  return style
}

const CandidateInsightBadgeItem = memo(function CandidateInsightBadgeItem({ badge }: { badge: CandidateBadge }) {
  const color = badge.color || DEFAULT_BADGE_COLOR
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

export const CandidateInsightBadges = memo(function CandidateInsightBadges({
  badges,
  loading = false,
  failed = false,
}: Props) {
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
      {badges.map((badge) => (
        <CandidateInsightBadgeItem key={badge.name} badge={badge} />
      ))}
    </>
  )
})
