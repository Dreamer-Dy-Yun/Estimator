import { DeleteButton } from '../DeleteButton'
import styles from '../common.module.css'
import detailStyles from './CandidateStashDetailModal.module.css'

export type Props = {
  selectedVisibleCount: number
  selectedUnconfirmedCount: number
  selectedConfirmedCount: number
  bulkConfirmBusy: boolean
  onBulkConfirm: () => void
  onOpenBulkUnconfirm: () => void
  onOpenBulkDelete: () => void
}

export function CandidateStashBulkActionCard({ selectedVisibleCount, selectedUnconfirmedCount, selectedConfirmedCount, bulkConfirmBusy, onBulkConfirm, onOpenBulkUnconfirm, onOpenBulkDelete }: Props) : React.JSX.Element {
  return (
    <div className={styles.card}>
      <div className={detailStyles.bulkActionCard}>
        <button type="button" className={`${styles.actionBtn} ${detailStyles.bulkConfirmButton}`} onClick={onBulkConfirm} disabled={bulkConfirmBusy || selectedUnconfirmedCount === 0} title={selectedUnconfirmedCount === 0 ? '상세확정할 미확정 이너 오더를 선택하세요.' : `선택한 상세미확정 이너 오더 ${selectedUnconfirmedCount}개 확정`}>
          {bulkConfirmBusy ? '확정 중...' : '상세 일괄확정'}
        </button>
        <button type="button" className={`${styles.actionBtn} ${detailStyles.bulkUnconfirmButton}`} onClick={onOpenBulkUnconfirm} disabled={selectedConfirmedCount === 0} title={selectedConfirmedCount === 0 ? '상세확정 해제할 이너 오더를 선택하세요.' : `선택한 상세확정 이너 오더 ${selectedConfirmedCount}개 해제`}>
          상세확정 일괄해제
        </button>
        <DeleteButton label="일괄삭제" onClick={onOpenBulkDelete} disabled={selectedVisibleCount === 0} aria-label="선택 이너 오더 일괄삭제" title={selectedVisibleCount === 0 ? '삭제할 이너 오더를 선택하세요.' : `선택한 이너 오더 ${selectedVisibleCount}개 삭제`} />
      </div>
    </div>
  )
}
