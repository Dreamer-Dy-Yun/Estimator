import { DialogCloseButton } from '../../../../../components/DialogCloseButton'
import { LoadingSpinner } from '../../../../../components/LoadingSpinner'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ApiUnitErrorInfo } from '../../../../../types'
import { KO } from '../../ko'
import type { SecondaryAiCommentView } from '../model/secondaryAiCommentModel'
import styles from '../secondaryDrawer.module.css'

const AI_COMMENT_OVERFLOW_TOLERANCE_PX = 1 as const

export type Props = {
  aiComment: SecondaryAiCommentView
  loading: boolean
  error: ApiUnitErrorInfo | null
  onRequest: () => void
}

type AiCommentExpandedState = {
  content: string
  expanded: boolean
}

export function AiCommentCard({
  aiComment,
  loading,
  error,
  onRequest,
}: Props) : React.JSX.Element {
  const answerId: string = useId()
  const answerRef: React.RefObject<HTMLDivElement | null> = useRef<HTMLDivElement | null>(null)
  const [expandedState, setExpandedState]: [AiCommentExpandedState, React.Dispatch<React.SetStateAction<AiCommentExpandedState>>] = useState<AiCommentExpandedState>({ content: '', expanded: false })
  const [scrollable, setScrollable]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState<boolean>(false)
  const content: string = error
    ? `${KO.aiCommentErrorPrefix}: ${error.error}`
    : aiComment.answer || KO.answerEmpty
  const expanded: boolean = expandedState.content === content && expandedState.expanded

  const updateScrollable: () => void = useCallback(() : void => {
    const answerEl: HTMLDivElement | null = answerRef.current
    if (answerEl === null) {
      setScrollable(false)
      return
    }

    setScrollable(answerEl.scrollHeight > answerEl.clientHeight + AI_COMMENT_OVERFLOW_TOLERANCE_PX)
  }, [])

  useEffect(() : (() => void) | undefined => {
    const answerEl: HTMLDivElement | null = answerRef.current
    if (answerEl === null) return undefined

    const frameId: number = window.requestAnimationFrame(updateScrollable)

    if (typeof ResizeObserver === 'undefined') {
      return () : void => {
        window.cancelAnimationFrame(frameId)
      }
    }

    const resizeObserver: ResizeObserver = new ResizeObserver(updateScrollable)
    resizeObserver.observe(answerEl)

    return () : void => {
      window.cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
    }
  }, [content, updateScrollable])

  const handleToggleExpanded: () => void = useCallback(() : void => {
    setExpandedState((value: AiCommentExpandedState) : AiCommentExpandedState => ({
      content,
      expanded: value.content === content ? !value.expanded : true,
    }))
  }, [content])

  const handleCloseExpanded: () => void = useCallback(() : void => {
    setExpandedState((value: AiCommentExpandedState) : AiCommentExpandedState => ({
      content: value.content,
      expanded: false,
    }))
  }, [])

  const effectiveExpanded: boolean = expanded && scrollable

  return (
    <>
      <div className={`${styles.card} ${styles.gridColumnCard} ${styles.aiCommentCard}`}>
        <div className={styles.aiCommentHeader}>
          <h3 className={`${styles.sectionTitle} ${styles.aiCommentTitle}`}>
            {KO.sectionAi}
          </h3>
          {scrollable ? (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary} ${styles.aiCommentExpandBtn}`}
              onClick={handleToggleExpanded}
              aria-expanded={effectiveExpanded}
              aria-controls={effectiveExpanded ? `${answerId}-dialog` : answerId}
            >
              {KO.btnAiCommentExpand}
            </button>
          ) : null}
        </div>
        <div className={styles.aiCardBody}>
          <div
            id={answerId}
            ref={answerRef}
            className={styles.aiAnswer}
            aria-live="polite"
            role={scrollable ? 'region' : undefined}
            aria-label={scrollable ? KO.sectionAi : undefined}
            tabIndex={scrollable ? 0 : undefined}
          >
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
      {effectiveExpanded ? (
        <div className={styles.aiCommentDialogBackdrop} role="presentation" onClick={handleCloseExpanded}>
          <section id={`${answerId}-dialog`} className={styles.aiCommentDialog} role="dialog" aria-modal="true" aria-labelledby={`${answerId}-dialog-title`} onClick={(event: React.MouseEvent<HTMLElement, MouseEvent>) : void => event.stopPropagation()}>
            <header className={styles.aiCommentDialogHeader}>
              <h3 id={`${answerId}-dialog-title`} className={styles.aiCommentDialogTitle}>{KO.sectionAi}</h3>
              <DialogCloseButton onClose={handleCloseExpanded} />
            </header>
            <div className={styles.aiCommentDialogBody}>{content}</div>
          </section>
        </div>
      ) : null}
    </>
  )
}
