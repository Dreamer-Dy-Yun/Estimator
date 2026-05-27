import { useEffect, useRef, useState } from 'react'
import { dashboardApi, getCompanyUuidForOptionalScope } from '../../../../../api'
import { useAuth } from '../../../../../auth/AuthContext'
import type { ToastContextValue } from '../../../../../components/AppToastContext'
import type { OrderSnapshotDocumentV2 } from '../../../../../snapshot/orderSnapshotTypes'
import type { CandidateItemPanelContext } from '../secondaryDrawerTypes'
import type { CandidateStashPickerOption } from '../CandidateStashPickerModal'

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
  buildSnapshot: () => OrderSnapshotDocumentV2
  showToast: ToastContextValue['showToast']
}

const COMPANY_SCOPE_REQUIRED_MESSAGE = '회사를 선택한 상태에서만 후보군 작업을 할 수 있습니다.'
const CANDIDATE_CREATE_SYNC_MISS_MESSAGE = '후보군은 생성됐지만 목록에서 생성 항목을 확인하지 못했습니다. 목록을 다시 불러와 주세요.'

const getFailureMessage = (actionLabel: string, error: unknown) => {
  if (error instanceof Error && error.message.trim()) return `${actionLabel} 실패: ${error.message}`
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
  const mountedRef = useRef(false)
  const candidateListReqSeqRef = useRef(0)
  const actionReqSeqRef = useRef(0)
  const currentScopeRef = useRef({ companyUuid: companyUuid ?? '', skuGroupKey })
  const [loading, setLoading] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [stashes, setStashes] = useState<CandidateStashPickerOption[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateStashPickerOption | null>(null)
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
    const nextScope = { companyUuid: companyUuid ?? '', skuGroupKey }
    const current = currentScopeRef.current
    if (current.companyUuid === nextScope.companyUuid && current.skuGroupKey === nextScope.skuGroupKey) return
    currentScopeRef.current = nextScope
    candidateListReqSeqRef.current += 1
    actionReqSeqRef.current += 1
    setLoading(false)
    setListOpen(false)
    setStashes([])
    setSelectedCandidate(null)
  }, [companyUuid, skuGroupKey])

  const isActiveAction = (snapshot: CandidateActionGuardSnapshot) => {
    const current = currentScopeRef.current
    return mountedRef.current
      && current.companyUuid === snapshot.companyUuid
      && current.skuGroupKey === snapshot.skuGroupKey
      && actionReqSeqRef.current === snapshot.actionSeq
  }

  const beginAction = (actionCompanyUuid = companyUuid ?? ''): CandidateActionGuardSnapshot => {
    const actionSeq = actionReqSeqRef.current + 1
    actionReqSeqRef.current = actionSeq
    setLoading(true)
    return { companyUuid: actionCompanyUuid, skuGroupKey, actionSeq }
  }

  const runMutation = async <T,>(
    actionLabel: string,
    mutate: (mutationCompanyUuid: string) => Promise<T>,
    reflect: (result: T) => boolean | void,
  ) => {
    if (!companyUuid) {
      showToast(COMPANY_SCOPE_REQUIRED_MESSAGE, { variant: 'error' })
      return false
    }
    const snapshot = beginAction(companyUuid)
    try {
      const result = await mutate(companyUuid)
      if (!isActiveAction(snapshot)) return false
      return reflect(result) !== false
    } catch (error) {
      if (isActiveAction(snapshot)) showToast(getFailureMessage(actionLabel, error), { variant: 'error' })
      return false
    } finally {
      if (isActiveAction(snapshot)) setLoading(false)
    }
  }

  const refresh = async () => {
    const reqSeq = candidateListReqSeqRef.current + 1
    candidateListReqSeqRef.current = reqSeq
    const rows = await dashboardApi.getCandidateStashes({ companyUuid })
    if (!mountedRef.current || candidateListReqSeqRef.current !== reqSeq) return null
    setStashes(rows)
    return rows
  }

  const openPicker = async () => {
    if (listOpen) {
      setListOpen(false)
      return
    }
    if (!companyUuid) {
      showToast(COMPANY_SCOPE_REQUIRED_MESSAGE, { variant: 'error' })
      return
    }
    setListOpen(true)
    const snapshot = beginAction(companyUuid)
    try {
      await refresh()
    } catch (error) {
      if (isActiveAction(snapshot)) {
        setListOpen(false)
        showToast(getFailureMessage('후보군 목록 불러오기', error), { variant: 'error' })
      }
    } finally {
      if (isActiveAction(snapshot)) setLoading(false)
    }
  }

  const confirmOrder = () => {
    if (selectedCandidate == null) return Promise.resolve(false)
    return runMutation(
      '후보군 아이템 저장',
      (companyUuid) => dashboardApi.appendCandidateItem({
        stashUuid: selectedCandidate.uuid, skuGroupKey, companyUuid, details: buildSnapshot(), isLatestLlmComment: false,
      }),
      () => showToast('후보군에 아이템을 저장했습니다.'),
    )
  }

  const saveCandidateItemDetails = (
    details: OrderSnapshotDocumentV2 | null,
    actionLabel: string,
    onSaved: (updatedItem: Awaited<ReturnType<typeof dashboardApi.updateCandidateItem>>) => void,
  ) => {
    if (candidateItemContext == null) return Promise.resolve(false)
    return runMutation(
      actionLabel,
      (companyUuid) => dashboardApi.updateCandidateItem({
        itemUuid: candidateItemContext.itemUuid, companyUuid, details, isLatestLlmComment: false,
      }),
      onSaved,
    )
  }

  const confirmCandidateItem = () => {
    if (candidateItemContext == null) return Promise.resolve(false)
    const snapshot = buildSnapshot()
    return saveCandidateItemDetails(snapshot, hasSavedSnapshot ? '상세확정 갱신' : '상세확정', (updatedItem) => {
      candidateItemContext?.onConfirmed?.(snapshot, updatedItem)
      candidateItemContext?.onSaved?.()
      showToast(hasSavedSnapshot ? '상세확정 내용을 갱신했습니다.' : '상세확정했습니다.')
    })
  }

  const unconfirmCandidateItem = () => saveCandidateItemDetails(null, '상세확정 해제', (updatedItem) => {
    candidateItemContext?.onUnconfirmed?.(updatedItem)
    candidateItemContext?.onSaved?.()
    showToast('상세확정을 해제했습니다.')
  })

  const createCandidate = () => runMutation(
    '후보군 생성',
    async (mutationCompanyUuid) => {
      const listReqSeq = candidateListReqSeqRef.current
      const created = await dashboardApi.createCandidateStash({
        name: nameInput.trim(), note: noteInput.trim(), companyUuid: mutationCompanyUuid, periodStart, periodEnd, forecastMonths,
      })
      try {
        return {
          createdUuid: created.uuid,
          options: await dashboardApi.getCandidateStashes({ companyUuid: mutationCompanyUuid }),
          listReqSeq,
        }
      } catch {
        throw new Error('후보군은 생성됐지만 목록을 새로고침하지 못했습니다.')
      }
    },
    ({ createdUuid, options, listReqSeq }) => {
      if (candidateListReqSeqRef.current !== listReqSeq) return false
      setStashes(options)
      const synced = options.find((row) => row.uuid === createdUuid)
      if (!synced) {
        showToast(CANDIDATE_CREATE_SYNC_MISS_MESSAGE, { variant: 'error' })
        return false
      }
      setSelectedCandidate(synced)
      setNameInput('')
      setNoteInput('')
      setListOpen(false)
      showToast('후보군을 생성했습니다.')
    },
  )

  return {
    loading,
    listOpen,
    stashes,
    selectedCandidate,
    companyScopeBlocked: companyUuid == null,
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
    selectCandidate: (row: CandidateStashPickerOption) => {
      setSelectedCandidate(row)
      setListOpen(false)
    },
  }
}
