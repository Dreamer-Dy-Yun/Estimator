import { useEffect, useMemo, useRef, useState } from 'react'
import {
  deleteCandidateStash,
  duplicateCandidateStash,
  getCandidateStashes,
  uploadCandidateStashExcel,
  updateCandidateStash,
  type CandidateStashExcelUploadResult,
  type CandidateStashSummary,
} from '../../api'
import { formatDateTimeMinute } from '../../utils/date'
import styles from '../components/common.module.css'
import { ConfirmModal } from '../components/ConfirmModal'
import pageStyles from './SnapshotConfirmPage.module.css'
import { CandidateStashDetailModal } from '../components/candidate-stash/CandidateStashDetailModal'
import { DeleteButton } from '../components/DeleteButton'
import { FilterBar } from '../components/FilterBar'

const toTime = (iso: string) => {
  const ts = new Date(iso).getTime()
  return Number.isNaN(ts) ? 0 : ts
}

export const SnapshotConfirmPage = () => {
  const [stashes, setStashes] = useState<CandidateStashSummary[]>([])
  const [openDetailStashUuid, setOpenDetailStashUuid] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CandidateStashSummary | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [duplicateBusyUuid, setDuplicateBusyUuid] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<CandidateStashSummary | null>(null)
  const [editName, setEditName] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editBusy, setEditBusy] = useState(false)
  const [stashNameQuery, setStashNameQuery] = useState('')
  const [stashNoteQuery, setStashNoteQuery] = useState('')
  const [stashSortKey, setStashSortKey] = useState<'createdDesc' | 'createdAsc' | 'updatedDesc' | 'updatedAsc'>('createdDesc')
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<CandidateStashExcelUploadResult | null>(null)
  const [uploadDragActive, setUploadDragActive] = useState(false)

  const loadStashes = async () => {
    const list = await getCandidateStashes()
    setStashes(list)
  }

  useEffect(() => {
    void loadStashes()
  }, [])

  const selectUploadFile = (file: File | null) => {
    setUploadFile(file)
    setUploadError(null)
    setUploadResult(null)
  }

  const handleExcelUpload = async () => {
    if (!uploadFile) return
    setUploadBusy(true)
    setUploadError(null)
    setUploadResult(null)
    try {
      const result = await uploadCandidateStashExcel(uploadFile)
      setUploadResult(result)
      setUploadFile(null)
      if (uploadInputRef.current) uploadInputRef.current.value = ''
      await loadStashes()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '엑셀 업로드에 실패했습니다.')
    } finally {
      setUploadBusy(false)
    }
  }

  const filteredStashes = useMemo(() => {
    const nq = stashNameQuery.trim().toLowerCase()
    const noteQ = stashNoteQuery.trim().toLowerCase()
    const filtered = stashes.filter((stash) => {
      if (nq && !stash.name.toLowerCase().includes(nq)) return false
      if (noteQ && !(stash.note ?? '').toLowerCase().includes(noteQ)) return false
      return true
    })
    return [...filtered].sort((a, b) => {
      if (stashSortKey === 'createdDesc') return toTime(b.dbCreatedAt) - toTime(a.dbCreatedAt)
      if (stashSortKey === 'createdAsc') return toTime(a.dbCreatedAt) - toTime(b.dbCreatedAt)
      if (stashSortKey === 'updatedDesc') return toTime(b.dbUpdatedAt) - toTime(a.dbUpdatedAt)
      return toTime(a.dbUpdatedAt) - toTime(b.dbUpdatedAt)
    })
  }, [stashNameQuery, stashNoteQuery, stashSortKey, stashes])

  return (
    <section className={`${styles.page} ${pageStyles.snapshotPage}`}>
      <FilterBar
        title=""
        filterClassName={styles.filterAnalysisGrid}
        fields={[
          {
            label: '이름 검색',
            kind: 'input',
            inputType: 'text',
            value: stashNameQuery,
            onChange: setStashNameQuery,
          },
          {
            label: '비고 검색',
            kind: 'input',
            inputType: 'text',
            value: stashNoteQuery,
            onChange: setStashNoteQuery,
          },
          {
            label: '정렬',
            kind: 'select',
            value:
              stashSortKey === 'createdDesc'
                ? '생성일 최신순'
                : stashSortKey === 'createdAsc'
                  ? '생성일 오래된순'
                  : stashSortKey === 'updatedDesc'
                    ? '변경일 최신순'
                    : '변경일 오래된순',
            onChange: (v) => {
              if (v === '생성일 최신순') setStashSortKey('createdDesc')
              else if (v === '생성일 오래된순') setStashSortKey('createdAsc')
              else if (v === '변경일 최신순') setStashSortKey('updatedDesc')
              else setStashSortKey('updatedAsc')
            },
            options: ['생성일 최신순', '생성일 오래된순', '변경일 최신순', '변경일 오래된순'],
          },
        ]}
      />

      <div className={`${styles.card} ${pageStyles.uploadCard}`}>
        <div className={pageStyles.uploadCopy}>
          <div className={pageStyles.uploadTitleRow}>
            <strong className={pageStyles.uploadTitle}>엑셀 업로드</strong>
            <span className={pageStyles.uploadBadge}>후보군 추가</span>
          </div>
          <p className={pageStyles.uploadDescription}>
            엑셀 파일을 끌어오거나 클릭해서 오더 후보군을 추가합니다.
          </p>
        </div>
        <div className={pageStyles.uploadControls}>
          <input
            id="candidate-stash-excel-upload"
            ref={uploadInputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className={pageStyles.uploadInput}
            disabled={uploadBusy}
            onChange={(e) => {
              selectUploadFile(e.target.files?.[0] ?? null)
            }}
          />
          <button
            type="button"
            className={`${pageStyles.uploadDropzone} ${uploadDragActive ? pageStyles.uploadDropzoneActive : ''}`}
            disabled={uploadBusy}
            onClick={() => uploadInputRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (!uploadBusy) setUploadDragActive(true)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (!uploadBusy) setUploadDragActive(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setUploadDragActive(false)
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setUploadDragActive(false)
              if (uploadBusy) return
              selectUploadFile(e.dataTransfer.files?.[0] ?? null)
              if (uploadInputRef.current) uploadInputRef.current.value = ''
            }}
          >
            <span className={pageStyles.uploadDropzoneTitle}>
              {uploadFile ? uploadFile.name : '엑셀 파일을 끌어오거나 클릭'}
            </span>
            <span className={pageStyles.uploadDropzoneSub}>.xlsx, .xls 파일만 업로드</span>
          </button>
          <button
            type="button"
            className={`${pageStyles.actionBtn} ${pageStyles.btnPrimary}`}
            disabled={!uploadFile || uploadBusy}
            onClick={handleExcelUpload}
          >
            {uploadBusy ? '업로드 중...' : '업로드'}
          </button>
        </div>
        {(uploadError || uploadResult) && (
          <div className={uploadError ? pageStyles.uploadError : pageStyles.uploadResult}>
            {uploadError
              ? uploadError
              : `${uploadResult?.stashName ?? '후보군'} 생성 완료 · 등록 상품 ${uploadResult?.itemCount ?? 0}건`}
          </div>
        )}
      </div>

      {!stashes.length ? (
        <div className={styles.card}>저장된 오더 후보군이 없습니다.</div>
      ) : !filteredStashes.length ? (
        <div className={styles.card}>검색 조건에 맞는 후보군이 없습니다.</div>
      ) : (
        <div className={pageStyles.stashList}>
          {filteredStashes.map((stash) => {
            return (
              <div key={stash.uuid} className={`${styles.card} ${pageStyles.stashCard}`}>
                <div className={pageStyles.stashCardRow}>
                  <button
                    type="button"
                    onClick={() => setOpenDetailStashUuid(stash.uuid)}
                    style={{
                      width: '100%',
                      border: 0,
                      background: 'transparent',
                      textAlign: 'left',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'grid',
                      gap: 6,
                    }}
                  >
                    <div className={pageStyles.stashInfoGrid}>
                      <div className={pageStyles.stashLeftTop}>
                        <strong className={pageStyles.stashName}>{stash.name}</strong>
                        <span className={pageStyles.stashMetaDot}>·</span>
                        <span className={pageStyles.stashMeta}>등록 상품 {stash.itemCount}건</span>
                      </div>
                      <span className={pageStyles.stashMetaRight}>생성일: {formatDateTimeMinute(stash.dbCreatedAt)}</span>
                      <span className={pageStyles.stashNote}>{stash.note?.trim() ? stash.note : '-'}</span>
                      <span className={pageStyles.stashMetaRight}>변경일: {formatDateTimeMinute(stash.dbUpdatedAt)}</span>
                    </div>
                  </button>
                  <div className={pageStyles.stashCardActions}>
                    <button
                      type="button"
                      className={`${pageStyles.actionBtn} ${pageStyles.btnNeutral}`}
                      aria-label={`${stash.name} 이름·비고 편집`}
                      title="이름·비고 편집"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditTarget(stash)
                        setEditName(stash.name)
                        setEditNote(stash.note ?? '')
                      }}
                    >
                      이름·비고 편집
                    </button>
                    <button
                      type="button"
                      className={`${pageStyles.actionBtn} ${pageStyles.btnNeutral}`}
                      disabled={duplicateBusyUuid === stash.uuid}
                      aria-label={`${stash.name} 복제`}
                      title="복제"
                      onClick={(e) => {
                        e.stopPropagation()
                        void (async () => {
                          setDuplicateBusyUuid(stash.uuid)
                          try {
                            await duplicateCandidateStash(stash.uuid)
                          } finally {
                            setDuplicateBusyUuid(null)
                          }
                        })()
                      }}
                    >
                      {duplicateBusyUuid === stash.uuid ? '복제 중…' : '복제'}
                    </button>
                    <DeleteButton aria-label={`${stash.name} 삭제`} title="삭제" onClick={() => setDeleteTarget(stash)} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editTarget && (
        <div
          className={pageStyles.confirmModalBackdrop}
          onClick={() => !editBusy && setEditTarget(null)}
        >
          <div
            className={pageStyles.confirmModalPanel}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="stash-edit-dialog-title"
          >
            <h3 id="stash-edit-dialog-title" className={pageStyles.confirmModalTitle}>
              이름·비고 편집
            </h3>
            <p className={pageStyles.confirmModalText}>
              후보군 표시용 이름과 비고만 바꿉니다. 등록 상품·스냅샷 데이터는 그대로입니다.
            </p>
            <div className={pageStyles.confirmModalForm}>
              <div className={pageStyles.confirmModalField}>
                <span className={pageStyles.confirmModalLabel}>후보군 UUID</span>
                <p className={pageStyles.confirmModalUuid}>{editTarget.uuid}</p>
              </div>
              <div className={pageStyles.confirmModalField}>
                <label className={pageStyles.confirmModalLabel} htmlFor="stash-edit-name">
                  이름
                </label>
                <input
                  id="stash-edit-name"
                  type="text"
                  className={pageStyles.confirmModalInput}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={editBusy}
                  autoComplete="off"
                />
              </div>
              <div className={pageStyles.confirmModalField}>
                <label className={pageStyles.confirmModalLabel} htmlFor="stash-edit-note">
                  비고
                </label>
                <textarea
                  id="stash-edit-note"
                  className={`${pageStyles.confirmModalInput} ${pageStyles.confirmModalTextarea}`}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  disabled={editBusy}
                  rows={3}
                />
              </div>
            </div>
            <div className={pageStyles.confirmModalActions}>
              <button
                type="button"
                className={`${pageStyles.confirmModalBtn} ${pageStyles.confirmModalBtnCancel}`}
                onClick={() => setEditTarget(null)}
                disabled={editBusy}
              >
                취소
              </button>
              <button
                type="button"
                className={`${pageStyles.confirmModalBtn} ${pageStyles.confirmModalBtnPrimary}`}
                disabled={editBusy || !editName.trim()}
                onClick={async () => {
                  setEditBusy(true)
                  try {
                    await updateCandidateStash({
                      stashUuid: editTarget.uuid,
                      name: editName.trim(),
                      note: editNote.trim() || null,
                    })
                    setEditTarget(null)
                  } finally {
                    setEditBusy(false)
                  }
                }}
              >
                {editBusy ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {openDetailStashUuid && (
        <CandidateStashDetailModal
          stashUuid={openDetailStashUuid}
          stashSummary={stashes.find((s) => s.uuid === openDetailStashUuid)}
          onClose={() => setOpenDetailStashUuid(null)}
          onStashesInvalidate={loadStashes}
        />
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        busy={deleteBusy}
        title="삭제 확인"
        message={deleteTarget ? <><b>{deleteTarget.name}</b> 후보군을 삭제할까요?</> : null}
        confirmText="삭제"
        confirmingText="삭제 중…"
        dialogTitleId="stash-list-delete-dialog-title"
        classNames={{
          backdrop: pageStyles.confirmModalBackdrop,
          panel: pageStyles.confirmModalPanel,
          title: pageStyles.confirmModalTitle,
          text: pageStyles.confirmModalText,
          actions: pageStyles.confirmModalActions,
          button: pageStyles.confirmModalBtn,
          cancelButton: pageStyles.confirmModalBtnCancel,
          confirmButton: pageStyles.confirmModalBtnDanger,
        }}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          setDeleteBusy(true)
          try {
            await deleteCandidateStash(deleteTarget.uuid)
            setDeleteTarget(null)
          } finally {
            setDeleteBusy(false)
          }
        }}
      />
    </section>
  )
}
