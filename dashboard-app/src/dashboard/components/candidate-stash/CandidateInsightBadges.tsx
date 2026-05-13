import type { CSSProperties } from 'react'
import type { CandidateBadge } from '../../../api'
import styles from './CandidateInsightBadges.module.css'

type Props = {
  badges: CandidateBadge[]
}

export function CandidateInsightBadges({ badges }: Props) {
  if (!badges.length) {
    return <span className={styles.empty}>-</span>
  }

  return (
    <>
      {badges.map((badge) => {
        const color = badge.color || '#64748b'
        return (
          <span
            key={badge.name}
            className={styles.badge}
            title={badge.tooltip || badge.name}
            style={{ '--candidate-badge-color': color } as CSSProperties}
          >
            <span>{badge.name}</span>
          </span>
        )
      })}
    </>
  )
}
