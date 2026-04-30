import type { CandidateItemBadgeSummary } from '../../api'
import styles from './CandidateInsightBadges.module.css'

type Props = {
  badges: CandidateItemBadgeSummary[]
}

export function CandidateInsightBadges({ badges }: Props) {
  if (!badges.length) {
    return <span className={styles.empty}>-</span>
  }

  return (
    <>
      {badges.map((badge) => (
        <span
          key={badge.id}
          className={styles.badge}
          title={badge.description}
          style={{
            color: badge.style.textColor,
            backgroundColor: badge.style.backgroundColor,
            borderColor: badge.style.borderColor,
          }}
        >
          <span>{badge.label}</span>
        </span>
      ))}
    </>
  )
}
