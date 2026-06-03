import styles from './common.module.css'

export type AnalysisPeriodQueryButtonProps = {
  disabled: boolean
  onClick: () => void
}

export function AnalysisPeriodQueryButton({ disabled, onClick }: AnalysisPeriodQueryButtonProps) : React.JSX.Element {
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
