import { ConfirmModal } from '../ConfirmModal'
import type { CandidateStashDetailModalModel } from './useCandidateStashDetailModal'

type Props = {
  model: CandidateStashDetailModalModel
  bulkDeleteOpen: boolean
  selectedVisibleCount: number
  selectedVisibleItemUuids: string[]
  onCloseBulkDelete: () => void
  onBulkDeleteDone: () => void
}

export function CandidateStashDeleteDialogs({
  model,
  bulkDeleteOpen,
  selectedVisibleCount,
  selectedVisibleItemUuids,
  onCloseBulkDelete,
  onBulkDeleteDone,
}: Props) {
  return (
    <>
      <ConfirmModal
        open={bulkDeleteOpen}
        busy={model.bulkDeleteBusy}
        title="일괄삭제 확인"
        message={
          selectedVisibleCount > 0
            ? <>선택된 이너 오더 <b>{selectedVisibleCount}</b>개를 삭제할까요?</>
            : '삭제할 이너 오더가 선택되지 않았습니다.'
        }
        confirmText="일괄삭제"
        confirmingText="삭제 중…"
        dialogTitleId="bulk-item-delete-dialog-title"
        keepOpenAttr
        onCancel={onCloseBulkDelete}
        onConfirm={async () => {
          await model.confirmDeleteItems(selectedVisibleItemUuids)
          onBulkDeleteDone()
        }}
      />

      <ConfirmModal
        open={Boolean(model.itemDeleteTarget)}
        busy={model.itemDeleteBusy}
        title="상품 삭제"
        message={
          model.itemDeleteTarget
            ? <><b>{model.itemDeleteTarget.productName}</b>을(를) 이너 후보에서 제거할까요?</>
            : null
        }
        confirmText="삭제"
        confirmingText="삭제 중…"
        dialogTitleId="item-delete-dialog-title"
        keepOpenAttr
        onCancel={() => model.setItemDeleteTarget(null)}
        onConfirm={async () => {
          await model.confirmDeleteItem()
        }}
      />
    </>
  )
}
