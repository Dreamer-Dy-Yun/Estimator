import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  deleteCandidateStash,
  duplicateCandidateStash,
  getCandidateStashExcelTemplateDownload,
  getCandidateStashes,
  uploadCandidateStashExcel,
  updateCandidateStash,
  type CandidateStashExcelUploadResult,
  type CandidateStashSummary,
} from '../../api'
import { useAppToast } from '../../components/AppToastContext'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import styles from '../components/common.module.css'
import { CandidateStashDetailModal } from '../components/candidate-stash/CandidateStashDetailModal'
import { ConfirmModal } from '../components/ConfirmModal'
import { FilterBar } from '../components/FilterBar'
import { CandidateStashEditDialog } from './snapshot-confirm/CandidateStashEditDialog'
import { CandidateStashList } from './snapshot-confirm/CandidateStashList'
import { CandidateStashUploadCard } from './snapshot-confirm/CandidateStashUploadCard'
import pageStyles from './SnapshotConfirmPage.module.css'

type StashSortKey = 'createdDesc' | 'createdAsc' | 'updatedDesc' | 'updatedAsc'

const SORT_LABEL_BY_KEY: Record<StashSortKey, string> = {
  createdDesc: '생성일 최신순',
  createdAsc: '생성일 오래된순',
  updatedDesc: '변경일 최신순',
  updatedAsc: '변경일 오래된순',
}
const SORT_OPTIONS = Object.values(SORT_LABEL_BY_KEY)

const toTime = (iso: string) => {
  const ts = new Date(iso).getTime()
  return Number.isNaN(ts) ? 0 : ts
}

const candidateStashTemplateDownload = getCandidateStashExcelTemplateDownload()

export const SnapshotConfirmPage = () => {
  const { showToast } = useAppToast()
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
  const [stashSortKey, setStashSortKey] = useState<StashSortKey>('createdDesc')
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const mountedRef = useRef(false)
  const loadStashesSeqRef = useRef(0)
  const [stashesLoading, setStashesLoading] = useState(true)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<CandidateStashExcelUploadResult | null>(null)
  const [uploadDragActive, setUploadDragActive] = useState(false)

  const loadStashes = useCallback(async () => {
    const seq = loadStashesSeqRef.current + 1
    loadStashesSeqRef.current = seq
    setStashesLoading(true)
    try {
      const list = await getCandidateStashes()
      if (!mountedRef.current || loadStashesSeqRef.current !== seq) return
      setStashes(list)
    } finally {
      if (mountedRef.current && loadStashesSeqRef.current === seq) setStashesLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void loadStashes()
    return () => {
      mountedRef.current = false
      loadStashesSeqRef.current += 1
    }
  }, [loadStashes])

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
      if (!mountedRef.current) return
      setUploadResult(result)
      setUploadFile(null)
      if (uploadInputRef.current) uploadInputRef.current.value = ''
      await loadStashes()
      showToast('엑셀 업로드 요청이 완료되었습니다.')
    } catch (err) {
      if (!mountedRef.current) return
      setUploadError(err instanceof Error ? err.message : '엑셀 업로드에 실패했습니다.')
    } finally {
      if (mountedRef.current) setUploadBusy(false)
    }
  }

  const filteredStashes = useMemo(() => {
    const nameQuery = stashNameQuery.trim().toLowerCase()
    const noteQuery = stashNoteQuery.trim().toLowerCase()
    const filtered = stashes.filter((stash) => {
      if (nameQuery && !stash.name.toLowerCase().includes(nameQuery)) return false
      if (noteQuery && !(stash.note ?? '').toLowerCase().includes(noteQuery)) return false
      return true
    })
    return [...filtered].sort((a, b) => {
      if (stashSortKey === 'createdDesc') return toTime(b.dbCreatedAt) - toTime(a.dbCreatedAt)
      if (stashSortKey === 'createdAsc') return toTime(a.dbCreatedAt) - toTime(b.dbCreatedAt)
      if (stashSortKey === 'updatedDesc') return toTime(b.dbUpdatedAt) - toTime(a.dbUpdatedAt)
      return toTime(a.dbUpdatedAt) - toTime(b.dbUpdatedAt)
    })
  }, [stashNameQuery, stashNoteQuery, stashSortKey, stashes])

  const openEditDialog = (stash: CandidateStashSummary) => {
    setEditTarget(stash)
    setEditName(stash.name)
    setEditNote(stash.note ?? '')
  }

  const duplicateStash = async (stash: CandidateStashSummary) => {
    setDuplicateBusyUuid(stash.uuid)
    try {
      await duplicateCandidateStash(stash.uuid)
      await loadStashes()
      showToast('후보군 복제 요청이 완료되었습니다.')
    } finally {
      if (mountedRef.current) setDuplicateBusyUuid(null)
    }
  }

  const saveEditDialog = async () => {
    if (!editTarget) return
    setEditBusy(true)
    try {
      await updateCandidateStash({
        stashUuid: editTarget.uuid,
        name: editName.trim(),
        note: editNote.trim() || null,
      })
      await loadStashes()
      if (!mountedRef.current) return
      setEditTarget(null)
      showToast('후보군 이름·비고를 변경했습니다.')
    } finally {
      if (mountedRef.current) setEditBusy(false)
    }
  }

  const selectedDetailStash = stashes.find((stash) => stash.uuid === openDetailStashUuid)

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
            value: SORT_LABEL_BY_KEY[stashSortKey],
            onChange: (label) => {
              const nextEntry = Object.entries(SORT_LABEL_BY_KEY).find(([, nextLabel]) => nextLabel === label)
              setStashSortKey((nextEntry?.[0] as StashSortKey | undefined) ?? 'createdDesc')
            },
            options: SORT_OPTIONS,
          },
        ]}
      />

      <CandidateStashUploadCard
        templateDownload={candidateStashTemplateDownload}
        uploadInputRef={uploadInputRef}
        uploadFile={uploadFile}
        uploadBusy={uploadBusy}
        uploadDragActive={uploadDragActive}
        uploadError={uploadError}
        uploadResult={uploadResult}
        onSelectFile={selectUploadFile}
        onUpload={handleExcelUpload}
        onDragActiveChange={setUploadDragActive}
      />

      {stashesLoading && !stashes.length ? (
        <div className={`${styles.card} ${pageStyles.emptyStateCard}`}>
          <LoadingSpinner label="오더 후보군 목록을 불러오는 중" />
        </div>
      ) : (
        <CandidateStashList
          allStashesEmpty={!stashes.length}
          stashes={filteredStashes}
          duplicateBusyUuid={duplicateBusyUuid}
          onOpenDetail={setOpenDetailStashUuid}
          onOpenEdit={openEditDialog}
          onDuplicate={(stash) => void duplicateStash(stash)}
          onDelete={setDeleteTarget}
        />
      )}

      <CandidateStashEditDialog
        editTarget={editTarget}
        editName={editName}
        editNote={editNote}
        editBusy={editBusy}
        onNameChange={setEditName}
        onNoteChange={setEditNote}
        onClose={() => setEditTarget(null)}
        onSave={saveEditDialog}
      />

      {openDetailStashUuid && (
        <CandidateStashDetailModal
          stashUuid={openDetailStashUuid}
          stashSummary={selectedDetailStash}
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
        confirmingText="삭제 중"
        dialogTitleId="stash-list-delete-dialog-title"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          setDeleteBusy(true)
          try {
            await deleteCandidateStash(deleteTarget.uuid)
            await loadStashes()
            if (!mountedRef.current) return
            setDeleteTarget(null)
            showToast('후보군을 삭제했습니다.')
          } finally {
            if (mountedRef.current) setDeleteBusy(false)
          }
        }}
      />
    </section>
  )
}
