import { ConfirmModal } from '../ConfirmModal'
import type { CandidateStashDetailModalModel } from './useCandidateStashDetailModal'

type Props = {
  model: CandidateStashDetailModalModel
  bulkDeleteOpen: boolean
  bulkUnconfirmOpen: boolean
  selectedVisibleCount: number
  selectedVisibleItemUuids: string[]
  selectedConfirmedCount: number
  selectedConfirmedItemUuids: string[]
  onCloseBulkDelete: () => void
  onCloseBulkUnconfirm: () => void
  onBulkDeleteDone: () => void
  onBulkUnconfirmDone: () => void
}

export function CandidateStashDeleteDialogs({
  model,
  bulkDeleteOpen,
  bulkUnconfirmOpen,
  selectedVisibleCount,
  selectedVisibleItemUuids,
  selectedConfirmedCount,
  selectedConfirmedItemUuids,
  onCloseBulkDelete,
  onCloseBulkUnconfirm,
  onBulkDeleteDone,
  onBulkUnconfirmDone,
}: Props) {
  return (
    <>
      <ConfirmModal
        open={bulkUnconfirmOpen}
        busy={model.bulkUnconfirmBusy}
        title="상세확정 일괄해제"
        message={
          selectedConfirmedCount > 0
            ? <>상세 확정을 해제하면 확정 내용을 복구할 수 없습니다.</>
            : '상세확정 해제할 이너 오더가 선택되지 않았습니다.'
        }
        confirmText="계속"
        confirmingText="해제 중…"
        dialogTitleId="bulk-item-unconfirm-dialog-title"
        keepOpenAttr
        onCancel={onCloseBulkUnconfirm}
        onConfirm={async () => {
          await model.confirmUnconfirmItems(selectedConfirmedItemUuids)
          onBulkUnconfirmDone()
        }}
      />

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
