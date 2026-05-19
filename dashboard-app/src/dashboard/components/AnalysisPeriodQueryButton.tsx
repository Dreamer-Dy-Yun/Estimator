import styles from './common.module.css'

type AnalysisPeriodQueryButtonProps = {
  disabled: boolean
  onClick: () => void
}

export function AnalysisPeriodQueryButton({ disabled, onClick }: AnalysisPeriodQueryButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.actionBtn} ${styles.btnPrimary} ${styles.analysisBulkAddButton}`}
      onClick={onClick}
      disabled={disabled}
    >
      조회
    </button>
  )
}
