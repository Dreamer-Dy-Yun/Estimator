import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { deleteCandidateStash, duplicateCandidateStash, getCandidateStashExcelTemplateDownload, getCandidateStashes, getCompanyUuidForOptionalScope, isAllCompanyUuid, updateCandidateStash, uploadCandidateStashExcel, type CandidateStashExcelUploadResult, type CandidateStashSummary } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { useAppToast } from '../../components/AppToastContext'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { CandidateStashDetailModal } from '../components/candidate-stash/CandidateStashDetailModal'
import { ConfirmModal } from '../components/ConfirmModal'
import { FilterBar } from '../components/FilterBar'
import styles from '../components/common.module.css'
import { useScopedCandidateStashAction } from '../hooks/useScopedCandidateStashAction'
import { CandidateStashEditDialog } from './snapshot-confirm/CandidateStashEditDialog'
import { CandidateStashList } from './snapshot-confirm/CandidateStashList'
import { CandidateStashUploadCard } from './snapshot-confirm/CandidateStashUploadCard'
import pageStyles from './SnapshotConfirmPage.module.css'

type StashSortKey = 'createdDesc' | 'createdAsc' | 'updatedDesc' | 'updatedAsc'
type EditState = { target: CandidateStashSummary | null; name: string; note: string; busy: boolean }
type UploadState = { file: File | null; busy: boolean; error: string | null; result: CandidateStashExcelUploadResult | null; dragActive: boolean }
type StashListState = { scopeKey: string; rows: CandidateStashSummary[] }

const SORT_LABEL_BY_KEY: Record<StashSortKey, string> = {
  createdDesc: '생성일 최신순',
  createdAsc: '생성일 오래된순',
  updatedDesc: '변경일 최신순',
  updatedAsc: '변경일 오래된순',
}
const SORT_OPTIONS = Object.values(SORT_LABEL_BY_KEY)
const EMPTY_EDIT: EditState = { target: null, name: '', note: '', busy: false }
const EMPTY_UPLOAD: UploadState = { file: null, busy: false, error: null, result: null, dragActive: false }
const EMPTY_STASHES: CandidateStashSummary[] = []
const candidateStashTemplateDownload = getCandidateStashExcelTemplateDownload()
const toTime = (iso: string) => {
  const ts = new Date(iso).getTime()
  return Number.isNaN(ts) ? 0 : ts
}
const getCandidateStashScopeKey = (companyUuid: string | undefined, isAllCompanySelected: boolean) => (
  isAllCompanySelected ? 'all-companies' : `company:${companyUuid ?? 'none'}`
)
const sortKeyFromLabel = (label: string): StashSortKey => (
  (Object.entries(SORT_LABEL_BY_KEY).find(([, nextLabel]) => nextLabel === label)?.[0] as StashSortKey | undefined) ?? 'createdDesc'
)

export const SnapshotConfirmPage = () => {
  const { showToast } = useAppToast()
  const { session, selectedCompanyUuid } = useAuth()
  const companyUuid = useMemo(() => getCompanyUuidForOptionalScope(selectedCompanyUuid), [selectedCompanyUuid])
  const isAllCompanySelected = isAllCompanyUuid(selectedCompanyUuid)
  const companyScopeKey = useMemo(() => getCandidateStashScopeKey(companyUuid, isAllCompanySelected), [companyUuid, isAllCompanySelected])
  const downloadUserName = session?.user.name ?? session?.user.loginId ?? '사용자'
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const mountedRef = useRef(false)
  const loadStashesSeqRef = useRef(0)
  const companyScopeKeyRef = useRef(companyScopeKey)

  const [stashList, setStashList] = useState<StashListState>({ scopeKey: companyScopeKey, rows: [] })
  const [stashesLoading, setStashesLoading] = useState(true)
  const [stashesLoadError, setStashesLoadError] = useState<string | null>(null)
  const [openDetailStashUuid, setOpenDetailStashUuid] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CandidateStashSummary | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [duplicateBusyUuid, setDuplicateBusyUuid] = useState<string | null>(null)
  const [edit, setEdit] = useState<EditState>(EMPTY_EDIT)
  const [stashNameQuery, setStashNameQuery] = useState('')
  const [stashNoteQuery, setStashNoteQuery] = useState('')
  const [stashSortKey, setStashSortKey] = useState<StashSortKey>('createdDesc')
  const [upload, setUpload] = useState<UploadState>(EMPTY_UPLOAD)

  const isCurrentScope = useCallback((scopeKey: string) => mountedRef.current && companyScopeKeyRef.current === scopeKey, [])
  const requireCompanyUuid = useCallback(() => {
    if (companyUuid) return companyUuid
    throw new Error('오더 후보군은 회사 선택이 필요합니다.')
  }, [companyUuid])
  const clearUploadInput = () => { if (uploadInputRef.current) uploadInputRef.current.value = '' }
  const patchEdit = (patch: Partial<EditState>) => setEdit((current) => ({ ...current, ...patch }))
  const patchUpload = (patch: Partial<UploadState>) => setUpload((current) => ({ ...current, ...patch }))

  const resetTransientState = useCallback(() => {
    setStashList({ scopeKey: companyScopeKey, rows: [] })
    setStashesLoadError(null)
    setStashesLoading(!isAllCompanySelected)
    setOpenDetailStashUuid(null)
    setDeleteTarget(null)
    setDeleteBusy(false)
    setDuplicateBusyUuid(null)
    setEdit(EMPTY_EDIT)
    setUpload(EMPTY_UPLOAD)
    clearUploadInput()
  }, [companyScopeKey, isAllCompanySelected])
  const showCandidateToast = useCallback((
    message: string,
    options?: { variant?: 'error' | 'success' | 'warning' },
  ) => {
    if (options?.variant === 'warning') {
      showToast(message, { variant: 'info' })
      return
    }
    showToast(message, options?.variant ? { variant: options.variant } : undefined)
  }, [showToast])

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
      if (!mountedRef.current || loadStashesSeqRef.current !== seq || companyScopeKeyRef.current !== requestScopeKey) return
      setStashList({ scopeKey: requestScopeKey, rows: list })
      setStashesLoadError(null)
    } catch (err) {
      if (mountedRef.current && loadStashesSeqRef.current === seq && companyScopeKeyRef.current === requestScopeKey) {
        setStashesLoadError(err instanceof Error ? err.message : '오더 후보군 목록을 불러오지 못했습니다.')
      }
    } finally {
      if (mountedRef.current && loadStashesSeqRef.current === seq && companyScopeKeyRef.current === requestScopeKey) setStashesLoading(false)
    }
  }, [companyScopeKey, companyUuid, isAllCompanySelected])

  const runScopedAction = useScopedCandidateStashAction({ scopeKey: companyScopeKey, isCurrentScope, requireCompanyUuid, loadStashes, showToast: showCandidateToast })

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      loadStashesSeqRef.current += 1
    }
  }, [])
  useEffect(() => {
    companyScopeKeyRef.current = companyScopeKey
    loadStashesSeqRef.current += 1
    queueMicrotask(() => {
      if (companyScopeKeyRef.current === companyScopeKey) resetTransientState()
    })
  }, [companyScopeKey, resetTransientState])
  useEffect(() => {
    queueMicrotask(() => { void loadStashes() })
  }, [loadStashes])

  const selectUploadFile = (file: File | null) => patchUpload({ file, error: null, result: null })
  const uploadStashFile = () => {
    const file = upload.file
    if (!file) return Promise.resolve()
    patchUpload({ error: null, result: null })
    return runScopedAction<CandidateStashExcelUploadResult>({
      actionLabel: '목록 업로드',
      successMessage: '목록 업로드 요청이 완료되었습니다.',
      setBusy: (busy) => patchUpload({ busy }),
      mutate: (mutationCompanyUuid) => uploadCandidateStashExcel(file, { companyUuid: mutationCompanyUuid }),
      afterSuccess: (result) => {
        setUpload({ ...EMPTY_UPLOAD, result })
        clearUploadInput()
      },
      onError: (message) => patchUpload({ error: message }),
    })
  }
  const openEditDialog = (stash: CandidateStashSummary) => setEdit({ target: stash, name: stash.name, note: stash.note ?? '', busy: false })
  const duplicateStash = (stash: CandidateStashSummary) => runScopedAction({
    actionLabel: '후보군 복제',
    successMessage: '후보군이 복제되었습니다.',
    setBusy: (busy) => setDuplicateBusyUuid(busy ? stash.uuid : null),
    mutate: (mutationCompanyUuid) => duplicateCandidateStash(stash.uuid, { companyUuid: mutationCompanyUuid }),
  })
  const saveEditDialog = () => {
    const target = edit.target
    if (!target) return Promise.resolve()
    return runScopedAction({
      actionLabel: '후보군 이름/비고 변경',
      successMessage: '후보군 이름/비고를 변경했습니다.',
      setBusy: (busy) => patchEdit({ busy }),
      mutate: (mutationCompanyUuid) => updateCandidateStash({ stashUuid: target.uuid, companyUuid: mutationCompanyUuid, name: edit.name.trim(), note: edit.note.trim() || null }),
      afterSuccess: () => setEdit(EMPTY_EDIT),
    })
  }
  const deleteStash = () => {
    if (!deleteTarget) return Promise.resolve()
    const targetUuid = deleteTarget.uuid
    return runScopedAction({
      actionLabel: '후보군 삭제',
      successMessage: '후보군을 삭제했습니다.',
      setBusy: setDeleteBusy,
      mutate: (mutationCompanyUuid) => deleteCandidateStash(targetUuid, { companyUuid: mutationCompanyUuid }),
      afterSuccess: () => setDeleteTarget(null),
    })
  }

  const stashes = stashList.scopeKey === companyScopeKey ? stashList.rows : EMPTY_STASHES
  const filteredStashes = useMemo(() => {
    const nameQuery = stashNameQuery.trim().toLowerCase()
    const noteQuery = stashNoteQuery.trim().toLowerCase()
    return stashes
      .filter((stash) => (!nameQuery || stash.name.toLowerCase().includes(nameQuery)) && (!noteQuery || (stash.note ?? '').toLowerCase().includes(noteQuery)))
      .sort((a, b) => {
        if (stashSortKey === 'createdDesc') return toTime(b.dbCreatedAt) - toTime(a.dbCreatedAt)
        if (stashSortKey === 'createdAsc') return toTime(a.dbCreatedAt) - toTime(b.dbCreatedAt)
        if (stashSortKey === 'updatedDesc') return toTime(b.dbUpdatedAt) - toTime(a.dbUpdatedAt)
        return toTime(a.dbUpdatedAt) - toTime(b.dbUpdatedAt)
      })
  }, [stashes, stashNameQuery, stashNoteQuery, stashSortKey])
  const filterFields = useMemo(() => [
    { label: '이름 검색', kind: 'input' as const, inputType: 'text' as const, value: stashNameQuery, onChange: setStashNameQuery },
    { label: '비고 검색', kind: 'input' as const, inputType: 'text' as const, value: stashNoteQuery, onChange: setStashNoteQuery },
    { label: '정렬', kind: 'select' as const, value: SORT_LABEL_BY_KEY[stashSortKey], onChange: (label: string) => setStashSortKey(sortKeyFromLabel(label)), options: SORT_OPTIONS },
  ], [stashNameQuery, stashNoteQuery, stashSortKey])
  const selectedDetailStash = stashes.find((stash) => stash.uuid === openDetailStashUuid)

  if (isAllCompanySelected) return (
    <section className={`${styles.page} ${pageStyles.snapshotPage}`}>
      <div className={pageStyles.scopeGuard} role="status" aria-live="polite">
        <div>
          <strong className={pageStyles.scopeGuardTitle}>전체 선택 상태에서는 오더 후보군을 사용할 수 없습니다.</strong>
          <p className={pageStyles.scopeGuardText}>오더 후보군은 회사 단위 확정 데이터로 관리됩니다. 오더 후보군을 사용하려면 회사를 선택하세요.</p>
        </div>
      </div>
    </section>
  )

  return (
    <section className={`${styles.page} ${pageStyles.snapshotPage}`}>
      <FilterBar title="" filterClassName={styles.filterAnalysisGrid} fields={filterFields} />
      <CandidateStashUploadCard templateDownload={candidateStashTemplateDownload} uploadInputRef={uploadInputRef} uploadFile={upload.file} uploadBusy={upload.busy} uploadDragActive={upload.dragActive} uploadError={upload.error} uploadResult={upload.result} onSelectFile={selectUploadFile} onUpload={uploadStashFile} onDragActiveChange={(dragActive) => patchUpload({ dragActive })} />
      {stashesLoadError && (
        <div className={`${styles.card} ${pageStyles.loadErrorCard}`} role="alert" aria-live="assertive">
          <div>
            <strong className={pageStyles.loadErrorTitle}>오더 후보군 목록을 불러오지 못했습니다.</strong>
            <p className={pageStyles.loadErrorText}>{stashesLoadError}</p>
            {stashes.length > 0 && <p className={pageStyles.loadErrorSubText}>아래 목록은 마지막으로 불러온 데이터입니다. 최신 목록이 아닐 수 있습니다.</p>}
          </div>
          <button type="button" className={pageStyles.loadRetryButton} onClick={() => void loadStashes()} disabled={stashesLoading}>{stashesLoading ? '시도 중' : '다시 불러오기'}</button>
        </div>
      )}
      {stashesLoading && !stashes.length && !stashesLoadError ? (
        <div className={`${styles.card} ${pageStyles.emptyStateCard}`}><LoadingSpinner label="오더 후보군 목록을 불러오는 중" /></div>
      ) : stashesLoadError && !stashes.length ? (
        <div className={`${styles.card} ${pageStyles.emptyStateCard}`}><p className={pageStyles.loadErrorEmptyText}>목록을 표시할 수 없습니다. 다시 불러오기를 시도하세요.</p></div>
      ) : (
        <CandidateStashList allStashesEmpty={!stashes.length} stashes={filteredStashes} duplicateBusyUuid={duplicateBusyUuid} onOpenDetail={setOpenDetailStashUuid} onOpenEdit={openEditDialog} onDuplicate={(stash) => void duplicateStash(stash)} onDelete={setDeleteTarget} />
      )}
      <CandidateStashEditDialog editTarget={edit.target} editName={edit.name} editNote={edit.note} editBusy={edit.busy} onNameChange={(name) => patchEdit({ name })} onNoteChange={(note) => patchEdit({ note })} onClose={() => setEdit(EMPTY_EDIT)} onSave={saveEditDialog} />
      {openDetailStashUuid && <CandidateStashDetailModal stashUuid={openDetailStashUuid} companyUuid={companyUuid} downloadUserName={downloadUserName} stashSummary={selectedDetailStash} onClose={() => setOpenDetailStashUuid(null)} onStashesInvalidate={loadStashes} />}
      <ConfirmModal open={Boolean(deleteTarget)} busy={deleteBusy} title="삭제 확인" message={deleteTarget ? <><b>{deleteTarget.name}</b> 후보군을 삭제할까요?</> : null} confirmText="삭제" confirmingText="삭제 중" dialogTitleId="stash-list-delete-dialog-title" onCancel={() => setDeleteTarget(null)} onConfirm={deleteStash} />
    </section>
  )
}
