import type { CSSProperties } from 'react'
import type { CandidateBadgeDefinitionMap } from '../../../api'
import styles from './CandidateInsightBadges.module.css'

type Props = {
  badgeNames: string[]
  definitions: CandidateBadgeDefinitionMap
}

export function CandidateInsightBadges({ badgeNames, definitions }: Props) {
  if (!badgeNames.length) {
    return <span className={styles.empty}>-</span>
  }

  return (
    <>
      {badgeNames.map((badgeName) => {
        const definition = definitions[badgeName]
        const color = definition?.color ?? '#64748b'
        return (
          <span
            key={badgeName}
            className={styles.badge}
            title={definition?.tooltip ?? badgeName}
            style={{ '--candidate-badge-color': color } as CSSProperties}
          >
            <span>{badgeName}</span>
          </span>
        )
      })}
    </>
  )
}
