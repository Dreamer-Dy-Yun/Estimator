import { KO } from '../ko'
import styles from '../productSecondaryPanel.module.css'

type Props = {
  ai: {
    answer: string
  }
}

export function AiMockCard({ ai }: Props) {
  const { answer } = ai
  return (
    <div className={`${styles.card} ${styles.gridColumnCard}`}>
      <h3 className={styles.sectionTitle}>
        {KO.sectionAi}
      </h3>
      <div className={styles.aiCardBody}>
        <div className={styles.aiAnswer} aria-live="polite">
          {answer || KO.answerEmpty}
        </div>
      </div>
    </div>
  )
}
