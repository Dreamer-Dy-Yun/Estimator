import { LoadingSpinner } from '../../../../../components/LoadingSpinner'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { KO } from '../../ko'
import styles from '../secondaryDrawer.module.css'
import aiStyles from '../style-parts/cardAi.module.css'

type Props = {
  comment: string
  loading: boolean
  error: ApiUnitErrorInfo | null
  onRequest: () => void
}

export function AiCommentCard({
  comment,
  loading,
  error,
  onRequest,
}: Props) {
  const content = error
    ? `AI 코멘트 요청 실패: ${error.error}`
    : comment || KO.answerEmpty

  return (
    <div className={`${styles.card} ${styles.gridColumnCard}`}>
      <h3 className={styles.sectionTitle}>
        {KO.sectionAi}
      </h3>
      <div className={aiStyles.aiCardBody}>
        <div className={aiStyles.aiAnswer} aria-live="polite">
          {content}
        </div>
        <div className={aiStyles.aiCommentActions}>
          <button
            type="button"
            className={aiStyles.btn}
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

