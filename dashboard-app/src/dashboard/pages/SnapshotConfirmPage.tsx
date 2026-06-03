import type { CandidateStashExcelTemplateDownload } from '../../api'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { deleteCandidateStash, duplicateCandidateStash, getCandidateStashExcelTemplateDownload, getCandidateStashes, getCompanyUuidForOptionalScope, isAllCompanyUuid, updateCandidateStash, uploadCandidateStashExcel, type CandidateStashExcelUploadResult, type CandidateStashSummary } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { useAppToast } from '../../components/AppToastContext'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { CandidateStashDetailModal } from '../components/candidate-stash/CandidateStashDetailModal'
import { ConfirmModal } from '../components/ConfirmModal'
import { FilterBar } from '../components/FilterBar'
import styles from '../components/common.module.css'
import { useScopedCandidateStashAction, type ScopedActionOptions } from '../hooks/useScopedCandidateStashAction'
import { CandidateStashEditDialog } from './snapshot-confirm/CandidateStashEditDialog'
import { CandidateStashList } from './snapshot-confirm/CandidateStashList'
import { CandidateStashUploadCard } from './snapshot-confirm/CandidateStashUploadCard'
import pageStyles from './SnapshotConfirmPage.module.css'

export type StashSortKey = 'createdDesc' | 'createdAsc' | 'updatedDesc' | 'updatedAsc'
export type EditState = { target: CandidateStashSummary | null; name: string; note: string; busy: boolean }
export type UploadState = { file: File | null; busy: boolean; error: string | null; result: CandidateStashExcelUploadResult | null; dragActive: boolean }
export type StashListState = { scopeKey: string; rows: CandidateStashSummary[] }

const SORT_LABEL_BY_KEY: Record<StashSortKey, string> = {
  createdDesc: '생성일 최신순',
  createdAsc: '생성일 오래된순',
  updatedDesc: '변경일 최신순',
  updatedAsc: '변경일 오래된순',
}
const SORT_OPTIONS: string[] = Object.values(SORT_LABEL_BY_KEY)
const EMPTY_EDIT: EditState = { target: null, name: '', note: '', busy: false }
const EMPTY_UPLOAD: UploadState = { file: null, busy: false, error: null, result: null, dragActive: false }
const EMPTY_STASHES: CandidateStashSummary[] = []
const candidateStashTemplateDownload: CandidateStashExcelTemplateDownload = getCandidateStashExcelTemplateDownload()
const toTime: (iso: string) => number = (iso: string) : number => {
  const ts: number = new Date(iso).getTime()
  return Number.isNaN(ts) ? 0 : ts
}
const getCandidateStashScopeKey: (companyUuid: string | undefined, isAllCompanySelected: boolean) => string = (companyUuid: string | undefined, isAllCompanySelected: boolean) : string => (
  isAllCompanySelected ? 'all-companies' : `company:${companyUuid ?? 'none'}`
)
const sortKeyFromLabel: (label: string) => StashSortKey = (label: string): StashSortKey => (
  (Object.entries(SORT_LABEL_BY_KEY).find(([, nextLabel]: [string, string]) : boolean => nextLabel === label)?.[0] as StashSortKey | undefined) ?? 'createdDesc'
)

export const SnapshotConfirmPage: () => React.JSX.Element = () : React.JSX.Element => {
  const { showToast }: ReturnType<typeof useAppToast> = useAppToast()
  const { session, selectedCompanyUuid }: ReturnType<typeof useAuth> = useAuth()
  const companyUuid: string | undefined = useMemo(() : string | undefined => getCompanyUuidForOptionalScope(selectedCompanyUuid), [selectedCompanyUuid])
  const isAllCompanySelected: boolean = isAllCompanyUuid(selectedCompanyUuid)
  const companyScopeKey: string = useMemo(() : string => getCandidateStashScopeKey(companyUuid, isAllCompanySelected), [companyUuid, isAllCompanySelected])
  const downloadUserName: string = session?.user.name ?? session?.user.loginId ?? '사용자'
  const uploadInputRef: React.RefObject<HTMLInputElement | null> = useRef<HTMLInputElement | null>(null)
  const mountedRef: React.RefObject<boolean> = useRef(false)
  const loadStashesSeqRef: React.RefObject<number> = useRef(0)
  const companyScopeKeyRef: React.RefObject<string> = useRef(companyScopeKey)

  const [stashList, setStashList]: [StashListState, React.Dispatch<React.SetStateAction<StashListState>>] = useState<StashListState>({ scopeKey: companyScopeKey, rows: [] })
  const [stashesLoading, setStashesLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(true)
  const [stashesLoadError, setStashesLoadError]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [openDetailStashUuid, setOpenDetailStashUuid]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget]: [CandidateStashSummary | null, React.Dispatch<React.SetStateAction<CandidateStashSummary | null>>] = useState<CandidateStashSummary | null>(null)
  const [deleteBusy, setDeleteBusy]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [duplicateBusyUuid, setDuplicateBusyUuid]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] = useState<string | null>(null)
  const [edit, setEdit]: [EditState, React.Dispatch<React.SetStateAction<EditState>>] = useState<EditState>(EMPTY_EDIT)
  const [stashNameQuery, setStashNameQuery]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [stashNoteQuery, setStashNoteQuery]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [stashSortKey, setStashSortKey]: [StashSortKey, React.Dispatch<React.SetStateAction<StashSortKey>>] = useState<StashSortKey>('createdDesc')
  const [upload, setUpload]: [UploadState, React.Dispatch<React.SetStateAction<UploadState>>] = useState<UploadState>(EMPTY_UPLOAD)

  const isCurrentScope: (scopeKey: string) => boolean = useCallback((scopeKey: string) : boolean => mountedRef.current && companyScopeKeyRef.current === scopeKey, [])
  const requireCompanyUuid: () => string = useCallback(() : string => {
    if (companyUuid) return companyUuid
    throw new Error('오더 후보군은 회사 선택이 필요합니다.')
  }, [companyUuid])
  const clearUploadInput: () => void = () : void => { if (uploadInputRef.current) uploadInputRef.current.value = '' }
  const patchEdit: (patch: Partial<EditState>) => void = (patch: Partial<EditState>) : void => setEdit((current: EditState) : { target: CandidateStashSummary | null; name: string; note: string; busy: boolean; } => ({ ...current, ...patch }))
  const patchUpload: (patch: Partial<UploadState>) => void = (patch: Partial<UploadState>) : void => setUpload((current: UploadState) : { file: File | null; busy: boolean; error: string | null; result: CandidateStashExcelUploadResult | null; dragActive: boolean; } => ({ ...current, ...patch }))

  const resetTransientState: () => void = useCallback(() : void => {
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
  const showCandidateToast: (message: string, options?: { variant?: 'error' | 'success' | 'warning'; }) => void = useCallback((
    message: string,
    options?: { variant?: 'error' | 'success' | 'warning' },
  ) : void => {
    showToast(message, options?.variant ? { variant: options.variant } : undefined)
  }, [showToast])
  const showRefreshFailureWarning: (message: string) => void = useCallback((message: string) : void => {
    showCandidateToast(message, { variant: 'warning' })
  }, [showCandidateToast])

  const loadStashes: () => Promise<{ ok: false; error: unknown; } | undefined> = useCallback(async () : Promise<{ ok: false; error: unknown; } | undefined> => {
    const requestScopeKey: string = companyScopeKey
    if (isAllCompanySelected) {
      setStashesLoading(false)
      setStashesLoadError(null)
      return
    }
    const seq: number = loadStashesSeqRef.current + 1
    loadStashesSeqRef.current = seq
    setStashesLoading(true)
    try {
      const list: CandidateStashSummary[] = await getCandidateStashes({ companyUuid })
      if (!mountedRef.current || loadStashesSeqRef.current !== seq || companyScopeKeyRef.current !== requestScopeKey) return
      setStashList({ scopeKey: requestScopeKey, rows: list })
      setStashesLoadError(null)
    } catch (err) {
      if (mountedRef.current && loadStashesSeqRef.current === seq && companyScopeKeyRef.current === requestScopeKey) {
        setStashesLoadError(err instanceof Error ? err.message : '오더 후보군 목록을 불러오지 못했습니다.')
        return { ok: false as const, error: err }
      }
    } finally {
      if (mountedRef.current && loadStashesSeqRef.current === seq && companyScopeKeyRef.current === requestScopeKey) setStashesLoading(false)
    }
  }, [companyScopeKey, companyUuid, isAllCompanySelected])

  const runScopedAction: <Result = void>({ actionLabel, successMessage, setBusy, mutate, afterSuccess, onRefreshError, onError }: ScopedActionOptions<Result>) => Promise<void> = useScopedCandidateStashAction({ scopeKey: companyScopeKey, isCurrentScope, requireCompanyUuid, loadStashes, showToast: showCandidateToast })

  useEffect(() : () => void => {
    mountedRef.current = true
    return () : void => {
      mountedRef.current = false
      loadStashesSeqRef.current += 1
    }
  }, [])
  useEffect(() : void => {
    companyScopeKeyRef.current = companyScopeKey
    loadStashesSeqRef.current += 1
    queueMicrotask(() : void => {
      if (companyScopeKeyRef.current === companyScopeKey) resetTransientState()
    })
  }, [companyScopeKey, resetTransientState])
  useEffect(() : void => {
    queueMicrotask(() : void => { void loadStashes() })
  }, [loadStashes])

  const selectUploadFile: (file: File | null) => void = (file: File | null) : void => patchUpload({ file, error: null, result: null })
  const uploadStashFile: () => Promise<void> = () : Promise<void> => {
    const file: File | null = upload.file
    if (!file) return Promise.resolve()
    patchUpload({ error: null, result: null })
    return runScopedAction<CandidateStashExcelUploadResult>({
      actionLabel: '목록 업로드',
      successMessage: '목록 업로드 요청이 완료되었습니다.',
      onRefreshError: showRefreshFailureWarning,
      setBusy: (busy: boolean) : void => patchUpload({ busy }),
      mutate: (mutationCompanyUuid: string) : Promise<CandidateStashExcelUploadResult> => uploadCandidateStashExcel(file, { companyUuid: mutationCompanyUuid }),
      afterSuccess: (result: CandidateStashExcelUploadResult) : void => {
        setUpload({ ...EMPTY_UPLOAD, result })
        clearUploadInput()
      },
      onError: (message: string) : void => patchUpload({ error: message }),
    })
  }
  const openEditDialog: (stash: CandidateStashSummary) => void = (stash: CandidateStashSummary) : void => setEdit({ target: stash, name: stash.name, note: stash.note ?? '', busy: false })
  const duplicateStash: (stash: CandidateStashSummary) => Promise<void> = (stash: CandidateStashSummary) : Promise<void> => runScopedAction({
    actionLabel: '후보군 복제',
    successMessage: '후보군이 복제되었습니다.',
    onRefreshError: showRefreshFailureWarning,
    setBusy: (busy: boolean) : void => setDuplicateBusyUuid(busy ? stash.uuid : null),
    mutate: (mutationCompanyUuid: string) : Promise<void> => duplicateCandidateStash(stash.uuid, { companyUuid: mutationCompanyUuid }),
  })
  const saveEditDialog: () => Promise<void> = () : Promise<void> => {
    const target: CandidateStashSummary | null = edit.target
    if (!target) return Promise.resolve()
    return runScopedAction({
      actionLabel: '후보군 이름/비고 변경',
      successMessage: '후보군 이름/비고를 변경했습니다.',
      onRefreshError: showRefreshFailureWarning,
      setBusy: (busy: boolean) : void => patchEdit({ busy }),
      mutate: (mutationCompanyUuid: string) : Promise<CandidateStashSummary> => updateCandidateStash({ stashUuid: target.uuid, companyUuid: mutationCompanyUuid, name: edit.name.trim(), note: edit.note.trim() || null }),
      afterSuccess: () : void => setEdit(EMPTY_EDIT),
    })
  }
  const deleteStash: () => Promise<void> = () : Promise<void> => {
    if (!deleteTarget) return Promise.resolve()
    const targetUuid: string = deleteTarget.uuid
    return runScopedAction({
      actionLabel: '후보군 삭제',
      successMessage: '후보군을 삭제했습니다.',
      onRefreshError: showRefreshFailureWarning,
      setBusy: setDeleteBusy,
      mutate: (mutationCompanyUuid: string) : Promise<void> => deleteCandidateStash(targetUuid, { companyUuid: mutationCompanyUuid }),
      afterSuccess: () : void => setDeleteTarget(null),
    })
  }

  const stashes: CandidateStashSummary[] = stashList.scopeKey === companyScopeKey ? stashList.rows : EMPTY_STASHES
  const filteredStashes: CandidateStashSummary[] = useMemo(() : CandidateStashSummary[] => {
    const nameQuery: string = stashNameQuery.trim().toLowerCase()
    const noteQuery: string = stashNoteQuery.trim().toLowerCase()
    return stashes
      .filter((stash: CandidateStashSummary) : boolean => (!nameQuery || stash.name.toLowerCase().includes(nameQuery)) && (!noteQuery || (stash.note ?? '').toLowerCase().includes(noteQuery)))
      .sort((a: CandidateStashSummary, b: CandidateStashSummary) : number => {
        if (stashSortKey === 'createdDesc') return toTime(b.dbCreatedAt) - toTime(a.dbCreatedAt)
        if (stashSortKey === 'createdAsc') return toTime(a.dbCreatedAt) - toTime(b.dbCreatedAt)
        if (stashSortKey === 'updatedDesc') return toTime(b.dbUpdatedAt) - toTime(a.dbUpdatedAt)
        return toTime(a.dbUpdatedAt) - toTime(b.dbUpdatedAt)
      })
  }, [stashes, stashNameQuery, stashNoteQuery, stashSortKey])
  const filterFields: ({ label: string; kind: 'input'; inputType: 'text'; value: string; onChange: React.Dispatch<React.SetStateAction<string>>; options?: undefined; } | { label: string; kind: 'select'; value: string; onChange: (label: string) => void; options: string[]; inputType?: undefined; })[] = useMemo(() : ({ label: string; kind: 'input'; inputType: 'text'; value: string; onChange: React.Dispatch<React.SetStateAction<string>>; options?: undefined; } | { label: string; kind: 'select'; value: string; onChange: (label: string) => void; options: string[]; inputType?: undefined; })[] => [
    { label: '이름 검색', kind: 'input' as const, inputType: 'text' as const, value: stashNameQuery, onChange: setStashNameQuery },
    { label: '비고 검색', kind: 'input' as const, inputType: 'text' as const, value: stashNoteQuery, onChange: setStashNoteQuery },
    { label: '정렬', kind: 'select' as const, value: SORT_LABEL_BY_KEY[stashSortKey], onChange: (label: string) : void => setStashSortKey(sortKeyFromLabel(label)), options: SORT_OPTIONS },
  ], [stashNameQuery, stashNoteQuery, stashSortKey])
  const selectedDetailStash: CandidateStashSummary | undefined = stashes.find((stash: CandidateStashSummary) : boolean => stash.uuid === openDetailStashUuid)

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
      <CandidateStashUploadCard templateDownload={candidateStashTemplateDownload} uploadInputRef={uploadInputRef} uploadFile={upload.file} uploadBusy={upload.busy} uploadDragActive={upload.dragActive} uploadError={upload.error} uploadResult={upload.result} onSelectFile={selectUploadFile} onUpload={uploadStashFile} onDragActiveChange={(dragActive: boolean) : void => patchUpload({ dragActive })} />
      {stashesLoadError && (
        <div className={`${styles.card} ${pageStyles.loadErrorCard}`} role="alert" aria-live="assertive">
          <div>
            <strong className={pageStyles.loadErrorTitle}>오더 후보군 목록을 불러오지 못했습니다.</strong>
            <p className={pageStyles.loadErrorText}>{stashesLoadError}</p>
            {stashes.length > 0 && <p className={pageStyles.loadErrorSubText}>아래 목록은 마지막으로 불러온 데이터입니다. 최신 목록이 아닐 수 있습니다.</p>}
          </div>
          <button type="button" className={pageStyles.loadRetryButton} onClick={() : undefined => void loadStashes()} disabled={stashesLoading}>{stashesLoading ? '시도 중' : '다시 불러오기'}</button>
        </div>
      )}
      {stashesLoading && !stashes.length && !stashesLoadError ? (
        <div className={`${styles.card} ${pageStyles.emptyStateCard}`}><LoadingSpinner label="오더 후보군 목록을 불러오는 중" /></div>
      ) : stashesLoadError && !stashes.length ? (
        <div className={`${styles.card} ${pageStyles.emptyStateCard}`}><p className={pageStyles.loadErrorEmptyText}>목록을 표시할 수 없습니다. 다시 불러오기를 시도하세요.</p></div>
      ) : (
        <CandidateStashList allStashesEmpty={!stashes.length} stashes={filteredStashes} duplicateBusyUuid={duplicateBusyUuid} onOpenDetail={setOpenDetailStashUuid} onOpenEdit={openEditDialog} onDuplicate={(stash: CandidateStashSummary) : undefined => void duplicateStash(stash)} onDelete={setDeleteTarget} />
      )}
      <CandidateStashEditDialog editTarget={edit.target} editName={edit.name} editNote={edit.note} editBusy={edit.busy} onNameChange={(name: string) : void => patchEdit({ name })} onNoteChange={(note: string) : void => patchEdit({ note })} onClose={() : void => setEdit(EMPTY_EDIT)} onSave={saveEditDialog} />
      {openDetailStashUuid && <CandidateStashDetailModal stashUuid={openDetailStashUuid} companyUuid={companyUuid} downloadUserName={downloadUserName} stashSummary={selectedDetailStash} onClose={() : void => setOpenDetailStashUuid(null)} onStashesInvalidate={loadStashes} />}
      <ConfirmModal open={Boolean(deleteTarget)} busy={deleteBusy} title="삭제 확인" message={deleteTarget ? <><b>{deleteTarget.name}</b> 후보군을 삭제할까요?</> : null} confirmText="삭제" confirmingText="삭제 중" dialogTitleId="stash-list-delete-dialog-title" onCancel={() : void => setDeleteTarget(null)} onConfirm={deleteStash} />
    </section>
  )
}
