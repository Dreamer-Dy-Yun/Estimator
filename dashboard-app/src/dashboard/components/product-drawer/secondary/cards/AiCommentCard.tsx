import { LoadingSpinner } from '../../../../../components/LoadingSpinner'
import type { OrderSnapshotAiCommentV2 } from '../../../../../snapshot/orderSnapshotTypes'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'

export type Props = {
  aiComment: OrderSnapshotAiCommentV2
  loading: boolean
  error: ApiUnitErrorInfo | null
  onRequest: () => void
}

export function AiCommentCard({
  aiComment,
  loading,
  error,
  onRequest,
}: Props) : React.JSX.Element {
  const content: string = error
    ? `AI 코멘트 요청 실패: ${error.error}`
    : aiComment.answer || KO.answerEmpty

  return (
    <div className={`${styles.card} ${styles.gridColumnCard}`}>
      <h3 className={styles.sectionTitle}>
        {KO.sectionAi}
      </h3>
      <div className={styles.aiCardBody}>
        <div className={styles.aiAnswer} aria-live="polite">
          {content}
        </div>
        <div className={styles.aiCommentActions}>
          <button
            type="button"
            className={styles.btn}
            onClick={onRequest}
            disabled={loading}
          >
            {loading
              ? <LoadingSpinner size="inline" label={KO.btnRequestAiComment} />
              : KO.btnRequestAiComment}
          </button>
        </div>
      </div>
    </div>
  )
}

