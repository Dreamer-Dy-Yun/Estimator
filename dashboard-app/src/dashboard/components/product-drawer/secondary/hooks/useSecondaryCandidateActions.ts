import { useCallback, useEffect, useRef, useState } from 'react'
import { dashboardApi, getCompanyUuidForOptionalScope } from '../../../../../api'
import { useAuth } from '../../../../../auth/AuthContext'
import type { ToastContextValue } from '../../../../../components/AppToastContext'
import type { OrderSnapshotDocumentV1 } from '../../../../../snapshot/orderSnapshotTypes'
import type { CandidateItemPanelContext } from '../candidateActionCards'
import type { CandidateStashPickerOption } from '../CandidateStashPickerModal'

type CandidateSelection = Pick<CandidateStashPickerOption, 'uuid' | 'name' | 'dbCreatedAt'>

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

const toPickerOption = (row: CandidateStashPickerOption): CandidateStashPickerOption => ({
  uuid: row.uuid,
  name: row.name,
  note: row.note,
  dbCreatedAt: row.dbCreatedAt,
})

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
    }
  }, [])

  useEffect(() => {
    candidateListReqSeqRef.current += 1
    let alive = true
    queueMicrotask(() => {
      if (!alive) return
      setListOpen(false)
      setStashes([])
      setSelectedCandidate(null)
    })
    return () => {
      alive = false
    }
  }, [companyUuid, skuGroupKey])

  const requireCompanyUuid = useCallback(() => {
    if (companyUuid) return companyUuid
    throw new Error(COMPANY_SCOPE_REQUIRED_MESSAGE)
  }, [companyUuid])

  const refresh = useCallback(async () => {
    const reqSeq = candidateListReqSeqRef.current + 1
    candidateListReqSeqRef.current = reqSeq
    const rows = await dashboardApi.getCandidateStashes({ companyUuid })
    if (!mountedRef.current || candidateListReqSeqRef.current !== reqSeq) return null
    setStashes(rows.map(toPickerOption))
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
    setLoading(true)
    try {
      await refresh()
    } catch (error) {
      if (mountedRef.current) {
        setListOpen(false)
        showToast(getFailureMessage('후보군 목록 불러오기', error), { variant: 'error' })
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [companyScopeBlocked, listOpen, refresh, showToast])

  const selectCandidate = useCallback((row: CandidateStashPickerOption) => {
    setSelectedCandidate({ uuid: row.uuid, name: row.name, dbCreatedAt: row.dbCreatedAt })
    setListOpen(false)
  }, [])

  const confirmOrder = useCallback(async () => {
    if (selectedCandidate == null) return false
    setLoading(true)
    try {
      const mutationCompanyUuid = requireCompanyUuid()
      await dashboardApi.appendCandidateItem({
        stashUuid: selectedCandidate.uuid,
        skuGroupKey,
        companyUuid: mutationCompanyUuid,
        details: buildSnapshot(),
        isLatestLlmComment: false,
      })
      showToast('후보군에 아이템을 저장했습니다.')
      return true
    } catch (error) {
      showToast(getFailureMessage('후보군 아이템 저장', error), { variant: 'error' })
      return false
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [buildSnapshot, requireCompanyUuid, selectedCandidate, showToast, skuGroupKey])

  const confirmCandidateItem = useCallback(async () => {
    if (candidateItemContext == null) return false
    const snapshot = buildSnapshot()
    setLoading(true)
    try {
      const mutationCompanyUuid = requireCompanyUuid()
      const updatedItem = await dashboardApi.updateCandidateItem({
        itemUuid: candidateItemContext.itemUuid,
        companyUuid: mutationCompanyUuid,
        details: snapshot,
        isLatestLlmComment: false,
      })
      if (!mountedRef.current) return false
      candidateItemContext.onConfirmed?.(snapshot, updatedItem)
      candidateItemContext.onSaved?.()
      showToast(hasSavedSnapshot ? '상세확정 내용을 갱신했습니다.' : '상세확정했습니다.')
      return true
    } catch (error) {
      showToast(getFailureMessage(hasSavedSnapshot ? '상세확정 갱신' : '상세확정', error), { variant: 'error' })
      return false
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [buildSnapshot, candidateItemContext, hasSavedSnapshot, requireCompanyUuid, showToast])

  const unconfirmCandidateItem = useCallback(async () => {
    if (candidateItemContext == null) return false
    setLoading(true)
    try {
      const mutationCompanyUuid = requireCompanyUuid()
      const updatedItem = await dashboardApi.updateCandidateItem({
        itemUuid: candidateItemContext.itemUuid,
        companyUuid: mutationCompanyUuid,
        details: null,
        isLatestLlmComment: false,
      })
      if (!mountedRef.current) return false
      candidateItemContext.onUnconfirmed?.(updatedItem)
      candidateItemContext.onSaved?.()
      showToast('상세확정을 해제했습니다.')
      return true
    } catch (error) {
      showToast(getFailureMessage('상세확정 해제', error), { variant: 'error' })
      return false
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [candidateItemContext, requireCompanyUuid, showToast])

  const createCandidate = useCallback(async () => {
    setLoading(true)
    try {
      const mutationCompanyUuid = requireCompanyUuid()
      const created = await dashboardApi.createCandidateStash({
        name: nameInput.trim(),
        note: noteInput.trim(),
        companyUuid: mutationCompanyUuid,
        periodStart,
        periodEnd,
        forecastMonths,
      })
      const nextCandidates = await refresh()
      if (!mountedRef.current || nextCandidates == null) return false
      const synced = nextCandidates.find((row) => row.uuid === created.uuid)
      if (!synced) return false
      setSelectedCandidate({ uuid: synced.uuid, name: synced.name, dbCreatedAt: synced.dbCreatedAt })
      setNameInput('')
      setNoteInput('')
      setListOpen(false)
      showToast('후보군을 생성했습니다.')
      return true
    } catch (error) {
      showToast(getFailureMessage('후보군 생성', error), { variant: 'error' })
      return false
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [forecastMonths, nameInput, noteInput, periodEnd, periodStart, refresh, requireCompanyUuid, showToast])

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
