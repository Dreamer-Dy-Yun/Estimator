import { useCallback, useEffect, useRef, useState } from 'react'
import { dashboardApi, getCompanyUuidForOptionalScope } from '../../../../../api'
import { useAuth } from '../../../../../auth/AuthContext'
import type { ToastContextValue } from '../../../../../components/AppToastContext'
import type { OrderSnapshotDocumentV1 } from '../../../../../snapshot/orderSnapshotTypes'
import type { CandidateItemPanelContext } from '../candidateActionCards'
import type { CandidateStashPickerOption } from '../CandidateStashPickerModal'

type CandidateSelection = Pick<CandidateStashPickerOption, 'uuid' | 'name' | 'dbCreatedAt'>

type CandidateActionGuardSnapshot = {
  companyUuid: string
  skuGroupKey: string
  actionSeq: number
}

type Params = {
  skuGroupKey: string
  periodStart: string
  periodEnd: string
  forecastMonths: number
  hasSavedSnapshot: boolean
  candidateItemContext: CandidateItemPanelContext | null
  buildSnapshot: () => OrderSnapshotDocumentV1
  showToast: ToastContextValue['showToast']
}

const COMPANY_SCOPE_REQUIRED_MESSAGE = '회사를 선택한 상태에서만 후보군 작업을 할 수 있습니다.'
const CANDIDATE_CREATE_SYNC_MISS_MESSAGE =
  '후보군은 생성됐지만 새 목록에서 생성 항목을 확인하지 못했습니다. 목록을 다시 불러와 주세요.'

const getFailureMessage = (actionLabel: string, error: unknown) => {
  if (error instanceof Error && error.message.trim()) {
    return `${actionLabel} 실패: ${error.message}`
  }
  return `${actionLabel}에 실패했습니다. 다시 시도해 주세요.`
}

export function useSecondaryCandidateActions({
  skuGroupKey,
  periodStart,
  periodEnd,
  forecastMonths,
  hasSavedSnapshot,
  candidateItemContext,
  buildSnapshot,
  showToast,
}: Params) {
  const { selectedCompanyUuid } = useAuth()
  const companyUuid = getCompanyUuidForOptionalScope(selectedCompanyUuid)
  const companyScopeBlocked = companyUuid == null
  const mountedRef = useRef(false)
  const candidateListReqSeqRef = useRef(0)
  const actionReqSeqRef = useRef(0)
  const currentCandidateActionScopeRef = useRef<Pick<CandidateActionGuardSnapshot, 'companyUuid' | 'skuGroupKey'>>({
    companyUuid: companyUuid ?? '',
    skuGroupKey,
  })
  const [loading, setLoading] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [stashes, setStashes] = useState<CandidateStashPickerOption[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateSelection | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [noteInput, setNoteInput] = useState('')

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      candidateListReqSeqRef.current += 1
      actionReqSeqRef.current += 1
    }
  }, [])

  useEffect(() => {
    const nextCompanyUuid = companyUuid ?? ''
    const currentScope = currentCandidateActionScopeRef.current
    if (currentScope.companyUuid === nextCompanyUuid && currentScope.skuGroupKey === skuGroupKey) return

    currentCandidateActionScopeRef.current = {
      companyUuid: nextCompanyUuid,
      skuGroupKey,
    }
    candidateListReqSeqRef.current += 1
    actionReqSeqRef.current += 1
    setLoading(false)
    setListOpen(false)
    setStashes([])
    setSelectedCandidate(null)
  }, [companyUuid, skuGroupKey])

  const isActiveCandidateAction = useCallback((snapshot: CandidateActionGuardSnapshot) => {
    const currentScope = currentCandidateActionScopeRef.current
    return mountedRef.current
      && currentScope.companyUuid === snapshot.companyUuid
      && currentScope.skuGroupKey === snapshot.skuGroupKey
      && actionReqSeqRef.current === snapshot.actionSeq
  }, [])

  const beginCandidateAction = useCallback((): CandidateActionGuardSnapshot => {
    const actionSeq = actionReqSeqRef.current + 1
    actionReqSeqRef.current = actionSeq
    setLoading(true)
    return {
      companyUuid: companyUuid ?? '',
      skuGroupKey,
      actionSeq,
    }
  }, [companyUuid, skuGroupKey])

  const finishCandidateAction = useCallback((snapshot: CandidateActionGuardSnapshot) => {
    if (isActiveCandidateAction(snapshot)) setLoading(false)
  }, [isActiveCandidateAction])

  const requireCompanyUuid = useCallback(() => {
    if (companyUuid) return companyUuid
    throw new Error(COMPANY_SCOPE_REQUIRED_MESSAGE)
  }, [companyUuid])

  const refresh = useCallback(async () => {
    const reqSeq = candidateListReqSeqRef.current + 1
    candidateListReqSeqRef.current = reqSeq
    const rows = await dashboardApi.getCandidateStashes({ companyUuid })
    if (!mountedRef.current || candidateListReqSeqRef.current !== reqSeq) return null
    setStashes(rows)
    return rows
  }, [companyUuid])

  const openPicker = useCallback(async () => {
    if (listOpen) {
      setListOpen(false)
      return
    }
    if (companyScopeBlocked) {
      showToast(COMPANY_SCOPE_REQUIRED_MESSAGE, { variant: 'error' })
      return
    }
    setListOpen(true)
    const actionSnapshot = beginCandidateAction()
    try {
      await refresh()
    } catch (error) {
      if (isActiveCandidateAction(actionSnapshot)) {
        setListOpen(false)
        showToast(getFailureMessage('후보군 목록 불러오기', error), { variant: 'error' })
      }
    } finally {
      finishCandidateAction(actionSnapshot)
    }
  }, [beginCandidateAction, companyScopeBlocked, finishCandidateAction, isActiveCandidateAction, listOpen, refresh, showToast])

  const selectCandidate = useCallback((row: CandidateStashPickerOption) => {
    setSelectedCandidate({ uuid: row.uuid, name: row.name, dbCreatedAt: row.dbCreatedAt })
    setListOpen(false)
  }, [])

  const confirmOrder = useCallback(async () => {
    if (selectedCandidate == null) return false
    const actionSnapshot = beginCandidateAction()
    try {
      const mutationCompanyUuid = requireCompanyUuid()
      await dashboardApi.appendCandidateItem({
        stashUuid: selectedCandidate.uuid,
        skuGroupKey,
        companyUuid: mutationCompanyUuid,
        details: buildSnapshot(),
        isLatestLlmComment: false,
      })
      if (!isActiveCandidateAction(actionSnapshot)) return false
      showToast('후보군에 아이템을 저장했습니다.')
      return true
    } catch (error) {
      if (isActiveCandidateAction(actionSnapshot)) {
        showToast(getFailureMessage('후보군 아이템 저장', error), { variant: 'error' })
      }
      return false
    } finally {
      finishCandidateAction(actionSnapshot)
    }
  }, [beginCandidateAction, buildSnapshot, finishCandidateAction, isActiveCandidateAction, requireCompanyUuid, selectedCandidate, showToast, skuGroupKey])

  const confirmCandidateItem = useCallback(async () => {
    if (candidateItemContext == null) return false
    const snapshot = buildSnapshot()
    const actionSnapshot = beginCandidateAction()
    try {
      const mutationCompanyUuid = requireCompanyUuid()
      const updatedItem = await dashboardApi.updateCandidateItem({
        itemUuid: candidateItemContext.itemUuid,
        companyUuid: mutationCompanyUuid,
        details: snapshot,
        isLatestLlmComment: false,
      })
      if (!isActiveCandidateAction(actionSnapshot)) return false
      candidateItemContext.onConfirmed?.(snapshot, updatedItem)
      candidateItemContext.onSaved?.()
      showToast(hasSavedSnapshot ? '상세확정 내용을 갱신했습니다.' : '상세확정했습니다.')
      return true
    } catch (error) {
      if (isActiveCandidateAction(actionSnapshot)) {
        showToast(getFailureMessage(hasSavedSnapshot ? '상세확정 갱신' : '상세확정', error), { variant: 'error' })
      }
      return false
    } finally {
      finishCandidateAction(actionSnapshot)
    }
  }, [beginCandidateAction, buildSnapshot, candidateItemContext, finishCandidateAction, hasSavedSnapshot, isActiveCandidateAction, requireCompanyUuid, showToast])

  const unconfirmCandidateItem = useCallback(async () => {
    if (candidateItemContext == null) return false
    const actionSnapshot = beginCandidateAction()
    try {
      const mutationCompanyUuid = requireCompanyUuid()
      const updatedItem = await dashboardApi.updateCandidateItem({
        itemUuid: candidateItemContext.itemUuid,
        companyUuid: mutationCompanyUuid,
        details: null,
        isLatestLlmComment: false,
      })
      if (!isActiveCandidateAction(actionSnapshot)) return false
      candidateItemContext.onUnconfirmed?.(updatedItem)
      candidateItemContext.onSaved?.()
      showToast('상세확정을 해제했습니다.')
      return true
    } catch (error) {
      if (isActiveCandidateAction(actionSnapshot)) {
        showToast(getFailureMessage('상세확정 해제', error), { variant: 'error' })
      }
      return false
    } finally {
      finishCandidateAction(actionSnapshot)
    }
  }, [beginCandidateAction, candidateItemContext, finishCandidateAction, isActiveCandidateAction, requireCompanyUuid, showToast])

  const createCandidate = useCallback(async () => {
    const actionSnapshot = beginCandidateAction()
    const createListReqSeq = candidateListReqSeqRef.current
    try {
      const mutationCompanyUuid = requireCompanyUuid()
      const createActionSnapshot: CandidateActionGuardSnapshot = {
        ...actionSnapshot,
        companyUuid: mutationCompanyUuid,
      }
      const created = await dashboardApi.createCandidateStash({
        name: nameInput.trim(),
        note: noteInput.trim(),
        companyUuid: mutationCompanyUuid,
        periodStart,
        periodEnd,
        forecastMonths,
      })
      if (!isActiveCandidateAction(createActionSnapshot) || candidateListReqSeqRef.current !== createListReqSeq) return false
      let nextCandidates: CandidateStashPickerOption[]
      try {
        nextCandidates = await dashboardApi.getCandidateStashes({ companyUuid: mutationCompanyUuid })
      } catch {
        if (isActiveCandidateAction(createActionSnapshot) && candidateListReqSeqRef.current === createListReqSeq) {
          showToast('후보군은 생성됐지만 목록을 새로고침하지 못했습니다.', { variant: 'error' })
        }
        return false
      }
      if (!isActiveCandidateAction(createActionSnapshot) || candidateListReqSeqRef.current !== createListReqSeq) return false
      setStashes(nextCandidates)
      const synced = nextCandidates.find((row) => row.uuid === created.uuid)
      if (!synced) {
        showToast(CANDIDATE_CREATE_SYNC_MISS_MESSAGE, { variant: 'error' })
        return false
      }
      setSelectedCandidate({ uuid: synced.uuid, name: synced.name, dbCreatedAt: synced.dbCreatedAt })
      setNameInput('')
      setNoteInput('')
      setListOpen(false)
      showToast('후보군을 생성했습니다.')
      return true
    } catch (error) {
      if (isActiveCandidateAction(actionSnapshot)) {
        showToast(getFailureMessage('후보군 생성', error), { variant: 'error' })
      }
      return false
    } finally {
      finishCandidateAction(actionSnapshot)
    }
  }, [beginCandidateAction, finishCandidateAction, forecastMonths, isActiveCandidateAction, nameInput, noteInput, periodEnd, periodStart, requireCompanyUuid, showToast])

  return {
    loading,
    listOpen,
    stashes,
    selectedCandidate,
    companyScopeBlocked,
    companyScopeBlockReason: COMPANY_SCOPE_REQUIRED_MESSAGE,
    nameInput,
    noteInput,
    setNameInput,
    setNoteInput,
    setListOpen,
    createCandidate,
    confirmOrder,
    refresh,
    openPicker,
    confirmCandidateItem,
    unconfirmCandidateItem,
    selectCandidate,
  }
}
