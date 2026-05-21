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

const toPickerOption = (row: CandidateStashPickerOption): CandidateStashPickerOption => ({
  uuid: row.uuid,
  name: row.name,
  note: row.note,
  dbCreatedAt: row.dbCreatedAt,
})

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

  const refresh = useCallback(async () => {
    const reqSeq = candidateListReqSeqRef.current + 1
    candidateListReqSeqRef.current = reqSeq
    const rows = await dashboardApi.getCandidateStashes({ companyUuid })
    if (!mountedRef.current || candidateListReqSeqRef.current !== reqSeq) return rows
    setStashes(rows.map(toPickerOption))
    return rows
  }, [companyUuid])

  const openPicker = useCallback(async () => {
    if (listOpen) {
      setListOpen(false)
      return
    }
    setListOpen(true)
    setLoading(true)
    try {
      await refresh()
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [listOpen, refresh])

  const selectCandidate = useCallback((row: CandidateStashPickerOption) => {
    setSelectedCandidate({ uuid: row.uuid, name: row.name, dbCreatedAt: row.dbCreatedAt })
    setListOpen(false)
  }, [])

  const confirmOrder = useCallback(async () => {
    if (selectedCandidate == null) return
    setLoading(true)
    try {
      await dashboardApi.appendCandidateItem({
        stashUuid: selectedCandidate.uuid,
        skuGroupKey,
        companyUuid,
        details: buildSnapshot(),
        isLatestLlmComment: false,
      })
      showToast('후보군에 아이템을 저장했습니다.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [buildSnapshot, companyUuid, selectedCandidate, showToast, skuGroupKey])

  const confirmCandidateItem = useCallback(async () => {
    if (candidateItemContext == null) return
    const snapshot = buildSnapshot()
    setLoading(true)
    try {
      const updatedItem = await dashboardApi.updateCandidateItem({
        itemUuid: candidateItemContext.itemUuid,
        companyUuid,
        details: snapshot,
        isLatestLlmComment: false,
      })
      if (!mountedRef.current) return
      candidateItemContext.onConfirmed?.(snapshot, updatedItem)
      candidateItemContext.onSaved?.()
      showToast(hasSavedSnapshot ? '상세확정 내용을 갱신했습니다.' : '상세확정했습니다.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [buildSnapshot, candidateItemContext, companyUuid, hasSavedSnapshot, showToast])

  const unconfirmCandidateItem = useCallback(async () => {
    if (candidateItemContext == null) return
    setLoading(true)
    try {
      const updatedItem = await dashboardApi.updateCandidateItem({
        itemUuid: candidateItemContext.itemUuid,
        companyUuid,
        details: null,
        isLatestLlmComment: false,
      })
      if (!mountedRef.current) return
      candidateItemContext.onUnconfirmed?.(updatedItem)
      candidateItemContext.onSaved?.()
      showToast('상세확정을 해제했습니다.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [candidateItemContext, companyUuid, showToast])

  const createCandidate = useCallback(async () => {
    setLoading(true)
    try {
      const created = await dashboardApi.createCandidateStash({
        name: nameInput.trim(),
        note: noteInput.trim(),
        companyUuid,
        periodStart,
        periodEnd,
        forecastMonths,
      })
      const nextCandidates = await refresh()
      if (!mountedRef.current) return
      const synced = nextCandidates.find((row) => row.uuid === created.uuid)
      if (!synced) return
      setSelectedCandidate({ uuid: synced.uuid, name: synced.name, dbCreatedAt: synced.dbCreatedAt })
      setNameInput('')
      setNoteInput('')
      setListOpen(false)
      showToast('후보군을 생성했습니다.')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [companyUuid, forecastMonths, nameInput, noteInput, periodEnd, periodStart, refresh, showToast])

  return {
    loading,
    listOpen,
    stashes,
    selectedCandidate,
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
