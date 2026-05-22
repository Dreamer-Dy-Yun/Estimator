import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  deleteCandidateStash,
  duplicateCandidateStash,
  getCandidateStashExcelTemplateDownload,
  getCandidateStashes,
  getCompanyUuidForOptionalScope,
  uploadCandidateStashExcel,
  updateCandidateStash,
  type CandidateStashExcelUploadResult,
  type CandidateStashSummary,
  isAllCompanyUuid,
} from '../../api'
import { useAuth } from '../../auth/AuthContext'
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

const getCandidateStashScopeKey = (
  companyUuid: string | undefined,
  isAllCompanySelected: boolean,
) => (isAllCompanySelected ? 'all-companies' : `company:${companyUuid ?? 'none'}`)

const getCandidateActionFailureMessage = (actionLabel: string, err: unknown) => {
  if (err instanceof Error && err.message.trim()) {
    return `${actionLabel} 실패: ${err.message}`
  }
  return `${actionLabel}에 실패했습니다. 다시 시도해 주세요.`
}

export const SnapshotConfirmPage = () => {
  const { showToast } = useAppToast()
  const { session, selectedCompanyUuid } = useAuth()
  const companyUuid = useMemo(() => getCompanyUuidForOptionalScope(selectedCompanyUuid), [selectedCompanyUuid])
  const isAllCompanySelected = isAllCompanyUuid(selectedCompanyUuid)
  const companyScopeKey = useMemo(
    () => getCandidateStashScopeKey(companyUuid, isAllCompanySelected),
    [companyUuid, isAllCompanySelected],
  )
  const downloadUserName = session?.user.name ?? session?.user.loginId ?? '사용자'
  const [stashes, setStashes] = useState<CandidateStashSummary[]>([])
  const [stashesScopeKey, setStashesScopeKey] = useState(companyScopeKey)
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
  const companyScopeKeyRef = useRef(companyScopeKey)
  const [stashesLoading, setStashesLoading] = useState(true)
  const [stashesLoadError, setStashesLoadError] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<CandidateStashExcelUploadResult | null>(null)
  const [uploadDragActive, setUploadDragActive] = useState(false)

  useEffect(() => {
    companyScopeKeyRef.current = companyScopeKey
    loadStashesSeqRef.current += 1
    let alive = true
    queueMicrotask(() => {
      if (!alive) return
      setStashes([])
      setStashesScopeKey(companyScopeKey)
      setStashesLoadError(null)
      setStashesLoading(!isAllCompanySelected)
      setOpenDetailStashUuid(null)
      setDeleteTarget(null)
      setDeleteBusy(false)
      setDuplicateBusyUuid(null)
      setEditTarget(null)
      setEditName('')
      setEditNote('')
      setEditBusy(false)
      setUploadFile(null)
      setUploadBusy(false)
      setUploadError(null)
      setUploadResult(null)
      setUploadDragActive(false)
      if (uploadInputRef.current) uploadInputRef.current.value = ''
    })
    return () => {
      alive = false
    }
  }, [companyScopeKey, isAllCompanySelected])

  const requireCompanyUuid = useCallback(() => {
    if (companyUuid) return companyUuid
    const message = '오더 후보군은 회사 선택이 필요합니다.'
    throw new Error(message)
  }, [companyUuid])

  const loadStashes = useCallback(async () => {
    const requestScopeKey = companyScopeKey
    if (isAllCompanySelected) {
      setStashesLoading(false)
      setStashesLoadError(null)
      return
    }

    const seq = loadStashesSeqRef.current + 1
    loadStashesSeqRef.current = seq
    setStashesLoading(true)
    try {
      const list = await getCandidateStashes({ companyUuid })
      if (
        !mountedRef.current ||
        loadStashesSeqRef.current !== seq ||
        companyScopeKeyRef.current !== requestScopeKey
      ) return
      setStashesScopeKey(requestScopeKey)
      setStashes(list)
      setStashesLoadError(null)
    } catch (err) {
      if (
        !mountedRef.current ||
        loadStashesSeqRef.current !== seq ||
        companyScopeKeyRef.current !== requestScopeKey
      ) return
      setStashesLoadError(err instanceof Error ? err.message : '오더 후보군 목록을 불러오지 못했습니다.')
    } finally {
      if (
        mountedRef.current &&
        loadStashesSeqRef.current === seq &&
        companyScopeKeyRef.current === requestScopeKey
      ) setStashesLoading(false)
    }
  }, [companyScopeKey, companyUuid, isAllCompanySelected])

  useEffect(() => {
    mountedRef.current = true
    queueMicrotask(() => {
      if (mountedRef.current) void loadStashes()
    })
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
    const actionScopeKey = companyScopeKey
    setUploadBusy(true)
    setUploadError(null)
    setUploadResult(null)
    try {
      const mutationCompanyUuid = requireCompanyUuid()
      const result = await uploadCandidateStashExcel(uploadFile, { companyUuid: mutationCompanyUuid })
      if (!mountedRef.current || companyScopeKeyRef.current !== actionScopeKey) return
      setUploadResult(result)
      setUploadFile(null)
      if (uploadInputRef.current) uploadInputRef.current.value = ''
      await loadStashes()
      if (!mountedRef.current || companyScopeKeyRef.current !== actionScopeKey) return
      showToast('목록 업로드 요청이 완료되었습니다.')
    } catch (err) {
      if (!mountedRef.current || companyScopeKeyRef.current !== actionScopeKey) return
      setUploadError(err instanceof Error ? err.message : '목록 업로드에 실패했습니다.')
    } finally {
      if (mountedRef.current && companyScopeKeyRef.current === actionScopeKey) setUploadBusy(false)
    }
  }

  const filteredStashes = useMemo(() => {
    const nameQuery = stashNameQuery.trim().toLowerCase()
    const noteQuery = stashNoteQuery.trim().toLowerCase()
    const scopedStashes = stashesScopeKey === companyScopeKey ? stashes : []
    const filtered = scopedStashes.filter((stash) => {
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
  }, [companyScopeKey, stashNameQuery, stashNoteQuery, stashSortKey, stashes, stashesScopeKey])

  const openEditDialog = (stash: CandidateStashSummary) => {
    setEditTarget(stash)
    setEditName(stash.name)
    setEditNote(stash.note ?? '')
  }

  const duplicateStash = async (stash: CandidateStashSummary) => {
    const actionScopeKey = companyScopeKey
    setDuplicateBusyUuid(stash.uuid)
    try {
      const mutationCompanyUuid = requireCompanyUuid()
      await duplicateCandidateStash(stash.uuid, { companyUuid: mutationCompanyUuid })
      if (!mountedRef.current || companyScopeKeyRef.current !== actionScopeKey) return
      await loadStashes()
      if (!mountedRef.current || companyScopeKeyRef.current !== actionScopeKey) return
      showToast('후보군이 복제되었습니다.')
    } catch (err) {
      if (!mountedRef.current || companyScopeKeyRef.current !== actionScopeKey) return
      showToast(getCandidateActionFailureMessage('후보군 복제', err), { variant: 'error' })
    } finally {
      if (mountedRef.current && companyScopeKeyRef.current === actionScopeKey) setDuplicateBusyUuid(null)
    }
  }

  const saveEditDialog = async () => {
    if (!editTarget) return
    const actionScopeKey = companyScopeKey
    setEditBusy(true)
    try {
      const mutationCompanyUuid = requireCompanyUuid()
      await updateCandidateStash({
        stashUuid: editTarget.uuid,
        companyUuid: mutationCompanyUuid,
        name: editName.trim(),
        note: editNote.trim() || null,
      })
      if (!mountedRef.current || companyScopeKeyRef.current !== actionScopeKey) return
      await loadStashes()
      if (!mountedRef.current || companyScopeKeyRef.current !== actionScopeKey) return
      setEditTarget(null)
      showToast('후보군 이름·비고를 변경했습니다.')
    } catch (err) {
      if (!mountedRef.current || companyScopeKeyRef.current !== actionScopeKey) return
      showToast(getCandidateActionFailureMessage('후보군 이름·비고 변경', err), { variant: 'error' })
    } finally {
      if (mountedRef.current && companyScopeKeyRef.current === actionScopeKey) setEditBusy(false)
    }
  }

  const isStashesScopeCurrent = stashesScopeKey === companyScopeKey
  const isPendingScopeSwitch = !isStashesScopeCurrent
  const scopedStashes = isStashesScopeCurrent ? stashes : []
  const scopedStashesLoadError = isStashesScopeCurrent ? stashesLoadError : null
  const selectedDetailStash = scopedStashes.find((stash) => stash.uuid === openDetailStashUuid)

  if (isAllCompanySelected) {
    return (
      <section className={`${styles.page} ${pageStyles.snapshotPage}`}>
        <div className={pageStyles.scopeGuard} role="status" aria-live="polite">
          <div>
            <strong className={pageStyles.scopeGuardTitle}>
              전체 선택 상태에서는 오더 후보군을 사용할 수 없습니다.
            </strong>
            <p className={pageStyles.scopeGuardText}>
              오더 후보군은 회사 단위 확정 데이터로 관리됩니다. 오더 후보군을 사용하려면 회사를 선택하세요.
            </p>
          </div>
        </div>
      </section>
    )
  }

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

      {scopedStashesLoadError && (
        <div className={`${styles.card} ${pageStyles.loadErrorCard}`} role="alert" aria-live="assertive">
          <div>
            <strong className={pageStyles.loadErrorTitle}>
              오더 후보군 목록을 불러오지 못했습니다.
            </strong>
            <p className={pageStyles.loadErrorText}>{scopedStashesLoadError}</p>
            {scopedStashes.length > 0 && (
              <p className={pageStyles.loadErrorSubText}>
                아래 목록은 마지막으로 불러온 데이터입니다. 최신 목록이 아닐 수 있습니다.
              </p>
            )}
          </div>
          <button
            type="button"
            className={pageStyles.loadRetryButton}
            onClick={() => void loadStashes()}
            disabled={stashesLoading}
          >
            {stashesLoading ? '재시도 중' : '다시 불러오기'}
          </button>
        </div>
      )}

      {(stashesLoading || isPendingScopeSwitch) && !scopedStashes.length && !scopedStashesLoadError ? (
        <div className={`${styles.card} ${pageStyles.emptyStateCard}`}>
          <LoadingSpinner label="오더 후보군 목록을 불러오는 중" />
        </div>
      ) : scopedStashesLoadError && !scopedStashes.length ? (
        <div className={`${styles.card} ${pageStyles.emptyStateCard}`}>
          <p className={pageStyles.loadErrorEmptyText}>
            목록을 표시할 수 없습니다. 다시 불러오기를 시도하세요.
          </p>
        </div>
      ) : (
        <CandidateStashList
          allStashesEmpty={!scopedStashes.length}
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
          companyUuid={companyUuid}
          downloadUserName={downloadUserName}
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
          const actionScopeKey = companyScopeKey
          setDeleteBusy(true)
          try {
            const mutationCompanyUuid = requireCompanyUuid()
            await deleteCandidateStash(deleteTarget.uuid, { companyUuid: mutationCompanyUuid })
            if (!mountedRef.current || companyScopeKeyRef.current !== actionScopeKey) return
            await loadStashes()
            if (!mountedRef.current || companyScopeKeyRef.current !== actionScopeKey) return
            setDeleteTarget(null)
            showToast('후보군을 삭제했습니다.')
          } catch (err) {
            if (!mountedRef.current || companyScopeKeyRef.current !== actionScopeKey) return
            showToast(getCandidateActionFailureMessage('후보군 삭제', err), { variant: 'error' })
          } finally {
            if (mountedRef.current && companyScopeKeyRef.current === actionScopeKey) setDeleteBusy(false)
          }
        }}
      />
    </section>
  )
}
