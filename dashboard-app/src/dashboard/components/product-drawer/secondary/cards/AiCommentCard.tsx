import { LoadingSpinner } from '../../../../../components/LoadingSpinner'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'

type Props = {
  comment: string
  loading: boolean
  error: ApiUnitErrorInfo | null
}

export function AiCommentCard({ comment, loading, error }: Props) {
  const content = loading
    ? <LoadingSpinner label="AI 코멘트를 불러오는 중" />
    : error
      ? `AI 코멘트 요청 실패: ${error.error}`
      : comment || KO.answerEmpty

  return (
    <div className={`${styles.card} ${styles.gridColumnCard}`}>
      <h3 className={styles.sectionTitle}>
        {KO.sectionAi}
      </h3>
      <div className={styles.aiCardBody}>
        <div className={styles.aiAnswer} aria-live="polite">
          {content}
        </div>
      </div>
    </div>
  )
}
