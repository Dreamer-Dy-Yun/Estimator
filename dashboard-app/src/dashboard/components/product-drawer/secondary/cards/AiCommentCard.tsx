import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'

type Props = {
  comment: string
}

export function AiCommentCard({ comment }: Props) {
  return (
    <div className={`${styles.card} ${styles.gridColumnCard}`}>
      <h3 className={styles.sectionTitle}>
        {KO.sectionAi}
      </h3>
      <div className={styles.aiCardBody}>
        <div className={styles.aiAnswer} aria-live="polite">
          {comment || KO.answerEmpty}
        </div>
      </div>
    </div>
  )
}
