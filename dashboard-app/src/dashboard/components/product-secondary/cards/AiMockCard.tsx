import { ApiUnitErrorBadge } from '../../../../components/ApiUnitErrorBadge'
import type { ApiUnitErrorInfo } from '../../../../types'
import { KO } from '../ko'
import styles from '../productSecondaryPanel.module.css'

type Props = {
  ai: {
    prompt: string
    answer: string
    loading: boolean
    error: ApiUnitErrorInfo | null
  }
  actions: {
    onPromptChange: (next: string) => void
    onSend: () => void
  }
}

export function AiMockCard({ ai, actions }: Props) {
  const { prompt, answer, loading, error } = ai
  const { onPromptChange, onSend } = actions
  return (
    <div className={`${styles.card} ${styles.gridColumnCard}`}>
      <h3 className={styles.sectionTitle}>
        {KO.sectionAi}
        <ApiUnitErrorBadge error={error} />
      </h3>
      <div className={styles.aiCardBody}>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={KO.placeholderPrompt}
          aria-label={KO.ariaLlmPrompt}
        />
        <button type="button" className={styles.btn} onClick={onSend} disabled={loading}>
          {loading ? KO.btnGenerating : KO.btnAnswerGen}
        </button>
        <div className={styles.aiAnswer} aria-live="polite">
          {answer || KO.answerEmpty}
        </div>
      </div>
    </div>
  )
}
