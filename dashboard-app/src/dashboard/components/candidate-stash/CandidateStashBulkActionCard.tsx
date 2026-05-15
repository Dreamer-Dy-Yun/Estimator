import { DeleteButton } from '../DeleteButton'
import styles from '../common.module.css'
import detailStyles from './CandidateStashDetailModal.module.css'

type Props = {
  selectedVisibleCount: number
  selectedConfirmedCount: number
  onOpenBulkUnconfirm: () => void
  onOpenBulkDelete: () => void
}

export function CandidateStashBulkActionCard({
  selectedVisibleCount,
  selectedConfirmedCount,
  onOpenBulkUnconfirm,
  onOpenBulkDelete,
}: Props) {
  return (
    <div className={styles.card}>
      <div className={detailStyles.bulkActionCard}>
        <button
          type="button"
          className={`${styles.actionBtn} ${detailStyles.bulkConfirmButton}`}
          disabled
          title="상세 일괄확정은 추후 연결 예정입니다."
        >
          상세 일괄확정
        </button>
        <button
          type="button"
          className={`${styles.actionBtn} ${detailStyles.bulkUnconfirmButton}`}
          onClick={onOpenBulkUnconfirm}
          disabled={selectedConfirmedCount === 0}
          title={
            selectedConfirmedCount === 0
              ? '상세확정 해제할 이너 오더를 선택하세요.'
              : `선택된 상세확정 이너 오더 ${selectedConfirmedCount}개 해제`
          }
        >
          상세확정 일괄해제
        </button>
        <DeleteButton
          label="일괄삭제"
          onClick={onOpenBulkDelete}
          disabled={selectedVisibleCount === 0}
          aria-label="선택 이너 오더 일괄삭제"
          title={
            selectedVisibleCount === 0
              ? '삭제할 이너 오더를 선택하세요.'
              : `선택된 이너 오더 ${selectedVisibleCount}개 삭제`
          }
        />
      </div>
    </div>
  )
}
