import { useEffect, useRef, useState } from 'react'
import { dashboardApi } from '../../../../../api'
import type { ToastContextValue } from '../../../../../components/AppToastContext'
import type { OrderSnapshotDocumentV2 } from '../../../../../snapshot/orderSnapshotTypes'
import type { CandidateStashPickerOption } from '../CandidateStashPickerModal'
import type { CandidateItemPanelContext } from '../secondaryDrawerTypes'

type CandidateActionGuardSnapshot = {
  companyUuid: string
  skuGroupKey: string
  periodStart: string
  periodEnd: string
  forecastMonths: number
  targetKind: 'append' | 'create' | 'item' | 'list'
  targetIdentity: string
  mutationInputKey: string
  actionSeq: number
}

type CandidateCreateResult = {
  createdUuid: string
  options: CandidateStashPickerOption[] | null
  listReqSeq: number
  refreshError: unknown | null
}

type CandidateActionScope = Pick<
  CandidateActionGuardSnapshot,
  'companyUuid' | 'skuGroupKey' | 'periodStart' | 'periodEnd' | 'forecastMonths'
>

type Params = {
  skuGroupKey: string
  companyUuid?: string
  periodStart: string
  periodEnd: string
  forecastMonths: number
  hasSavedSnapshot: boolean
  candidateItemContext: CandidateItemPanelContext | null
  canBuildSnapshot?: boolean
  snapshotBlockReason?: string
  buildSnapshot: () => OrderSnapshotDocumentV2
  showToast: ToastContextValue['showToast']
}

const COMPANY_SCOPE_REQUIRED_MESSAGE = '회사를 선택한 상태에서만 후보군 작업을 할 수 있습니다.'
const CANDIDATE_CREATE_SYNC_MISS_MESSAGE = '후보군은 생성됐지만 목록에서 생성 항목을 확인하지 못했습니다. 목록을 다시 불러와 주세요.'
const CANDIDATE_CREATE_REFRESH_MISS_MESSAGE = '후보군은 생성됐지만 목록 새로고침에 실패했습니다. 목록을 다시 불러와 주세요.'
const SNAPSHOT_BLOCK_FALLBACK_MESSAGE = '재고/발주 계산이 완료된 뒤 저장 또는 AI 요청을 진행할 수 있습니다.'

const getFailureMessage = (actionLabel: string, error: unknown) => {
  if (error instanceof Error && error.message.trim()) return `${actionLabel} 실패: ${error.message}`
  return `${actionLabel}에 실패했습니다. 다시 시도해 주세요.`
}

const snapshotMutationInputKey = (snapshot: OrderSnapshotDocumentV2 | null) => {
  if (snapshot == null) return 'null'
  return JSON.stringify({
    skuGroupKey: snapshot.skuGroupKey,
    companyUuid: snapshot.companyUuid ?? '',
    context: snapshot.context,
    competitorChannelId: snapshot.drawer2.competitorChannelId,
    stockOrderRequest: snapshot.drawer2.stockOrderRequest,
    stockOrderResult: snapshot.drawer2.stockOrderResult ?? null,
    unitEconomics: snapshot.drawer2.unitEconomics,
    selfWeightPct: snapshot.drawer2.selfWeightPct,
    bufferStock: snapshot.drawer2.bufferStock,
    aiComment: snapshot.drawer2.aiComment,
    confirmedTotals: snapshot.drawer2.confirmedTotals,
    sizeOrders: snapshot.drawer2.sizeOrders,
  })
}

export function useSecondaryCandidateActions({
  skuGroupKey,
  companyUuid,
  periodStart,
  periodEnd,
  forecastMonths,
  hasSavedSnapshot,
  candidateItemContext,
  canBuildSnapshot = true,
  snapshotBlockReason = SNAPSHOT_BLOCK_FALLBACK_MESSAGE,
  buildSnapshot,
  showToast,
}: Params) {
  const currentScope = {
    companyUuid: companyUuid ?? '',
    skuGroupKey,
    periodStart,
    periodEnd,
    forecastMonths,
  }
  const mountedRef = useRef(false)
  const candidateListReqSeqRef = useRef(0)
  const actionReqSeqRef = useRef(0)
  const currentScopeRef = useRef<CandidateActionScope>(currentScope)
  const resetScopeRef = useRef<CandidateActionScope>(currentScope)
  currentScopeRef.current = currentScope
  const [loading, setLoading] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [stashes, setStashes] = useState<CandidateStashPickerOption[]>([])
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateStashPickerOption | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const currentMutationRef = useRef({
    appendTarget: '',
    createTarget: '',
    itemTarget: '',
    canBuildSnapshot,
    buildSnapshot,
  })
  currentMutationRef.current = {
    appendTarget: selectedCandidate?.uuid ?? '',
    createTarget: `${nameInput.trim()}\n${noteInput.trim()}`,
    itemTarget: candidateItemContext?.itemUuid ?? '',
    canBuildSnapshot,
    buildSnapshot,
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      candidateListReqSeqRef.current += 1
      actionReqSeqRef.current += 1
    }
  }, [])

  useEffect(() => {
    const nextScope = currentScopeRef.current
    const current = resetScopeRef.current
    if (
      current.companyUuid === nextScope.companyUuid
      && current.skuGroupKey === nextScope.skuGroupKey
      && current.periodStart === nextScope.periodStart
      && current.periodEnd === nextScope.periodEnd
      && current.forecastMonths === nextScope.forecastMonths
    ) return
    resetScopeRef.current = nextScope
    candidateListReqSeqRef.current += 1
    actionReqSeqRef.current += 1
    setLoading(false)
    setListOpen(false)
    setStashes([])
    setSelectedCandidate(null)
  }, [companyUuid, forecastMonths, periodEnd, periodStart, skuGroupKey])

  const isActiveActionScope = (snapshot: CandidateActionGuardSnapshot) => {
    const current = currentScopeRef.current
    return mountedRef.current
      && current.companyUuid === snapshot.companyUuid
      && current.skuGroupKey === snapshot.skuGroupKey
      && current.periodStart === snapshot.periodStart
      && current.periodEnd === snapshot.periodEnd
      && current.forecastMonths === snapshot.forecastMonths
      && actionReqSeqRef.current === snapshot.actionSeq
  }

  const currentTargetIdentity = (targetKind: CandidateActionGuardSnapshot['targetKind']) => {
    const current = currentMutationRef.current
    if (targetKind === 'append') return current.appendTarget
    if (targetKind === 'create') return current.createTarget
    if (targetKind === 'item') return current.itemTarget
    return ''
  }
  const currentSnapshotMutationInputKey = () => {
    if (!currentMutationRef.current.canBuildSnapshot) return null
    try {
      return snapshotMutationInputKey(currentMutationRef.current.buildSnapshot())
    } catch {
      return null
    }
  }

  const isActiveAction = (snapshot: CandidateActionGuardSnapshot) => (
    isActiveActionScope(snapshot)
    && currentTargetIdentity(snapshot.targetKind) === snapshot.targetIdentity
    && (snapshot.mutationInputKey === '' || currentSnapshotMutationInputKey() === snapshot.mutationInputKey)
  )

  const beginAction = (
    targetKind: CandidateActionGuardSnapshot['targetKind'],
    mutationInputKey = '',
    actionCompanyUuid = companyUuid ?? '',
  ): CandidateActionGuardSnapshot => {
    const actionSeq = actionReqSeqRef.current + 1
    actionReqSeqRef.current = actionSeq
    setLoading(true)
    return {
      companyUuid: actionCompanyUuid,
      skuGroupKey,
      periodStart,
      periodEnd,
      forecastMonths,
      targetKind,
      targetIdentity: currentTargetIdentity(targetKind),
      mutationInputKey,
      actionSeq,
    }
  }

  const guardSnapshotMutation = () => {
    if (!canBuildSnapshot) {
      showToast(snapshotBlockReason, { variant: 'error' })
      return false
    }
    return true
  }

  const runMutation = async <T,>(
    actionLabel: string,
    targetKind: CandidateActionGuardSnapshot['targetKind'],
    mutationInputKey: string,
    mutate: (mutationCompanyUuid: string) => Promise<T>,
    reflect: (result: T) => boolean | void,
  ) => {
    if (!companyUuid) {
      showToast(COMPANY_SCOPE_REQUIRED_MESSAGE, { variant: 'error' })
      return false
    }
    const snapshot = beginAction(targetKind, mutationInputKey, companyUuid)
    try {
      const result = await mutate(companyUuid)
      if (!isActiveAction(snapshot)) return false
      return reflect(result) !== false
    } catch (error) {
      if (isActiveAction(snapshot)) showToast(getFailureMessage(actionLabel, error), { variant: 'error' })
      return false
    } finally {
      if (isActiveActionScope(snapshot)) setLoading(false)
    }
  }

  const refresh = async () => {
    const reqSeq = candidateListReqSeqRef.current + 1
    const scope = currentScopeRef.current
    candidateListReqSeqRef.current = reqSeq
    const rows = await dashboardApi.getCandidateStashes({ companyUuid })
    const current = currentScopeRef.current
    if (
      !mountedRef.current
      || candidateListReqSeqRef.current !== reqSeq
      || current.companyUuid !== scope.companyUuid
      || current.skuGroupKey !== scope.skuGroupKey
      || current.periodStart !== scope.periodStart
      || current.periodEnd !== scope.periodEnd
      || current.forecastMonths !== scope.forecastMonths
    ) return null
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
    const snapshot = beginAction('list', '', companyUuid)
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
    if (!guardSnapshotMutation()) return Promise.resolve(false)
    const details = buildSnapshot()
    return runMutation(
      '후보군 아이템 저장',
      'append',
      snapshotMutationInputKey(details),
      (companyUuid) => dashboardApi.appendCandidateItem({
        stashUuid: selectedCandidate.uuid,
        skuGroupKey,
        companyUuid,
        details,
        isLatestLlmComment: false,
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
      'item',
      snapshotMutationInputKey(details),
      (companyUuid) => dashboardApi.updateCandidateItem({
        itemUuid: candidateItemContext.itemUuid,
        companyUuid,
        details,
        isLatestLlmComment: false,
      }),
      onSaved,
    )
  }

  const confirmCandidateItem = () => {
    if (candidateItemContext == null) return Promise.resolve(false)
    if (!guardSnapshotMutation()) return Promise.resolve(false)
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

  const createCandidate = () => runMutation<CandidateCreateResult>(
    '후보군 생성',
    'create',
    '',
    async (mutationCompanyUuid) => {
      const created = await dashboardApi.createCandidateStash({
        name: nameInput.trim(),
        note: noteInput.trim(),
        companyUuid: mutationCompanyUuid,
        periodStart,
        periodEnd,
        forecastMonths,
      })
      const listReqSeq = candidateListReqSeqRef.current + 1
      candidateListReqSeqRef.current = listReqSeq
      try {
        return {
          createdUuid: created.uuid,
          options: await dashboardApi.getCandidateStashes({ companyUuid: mutationCompanyUuid }),
          listReqSeq,
          refreshError: null,
        }
      } catch (refreshError) {
        return {
          createdUuid: created.uuid,
          options: null,
          listReqSeq,
          refreshError,
        }
      }
    },
    ({ createdUuid, options, listReqSeq, refreshError }) => {
      showToast('후보군을 생성했습니다.')
      setNameInput('')
      setNoteInput('')
      if (refreshError != null || options == null) {
        showToast(CANDIDATE_CREATE_REFRESH_MISS_MESSAGE, { variant: 'warning' })
        setListOpen(false)
        return true
      }
      if (candidateListReqSeqRef.current !== listReqSeq) return false
      setStashes(options)
      const synced = options.find((row) => row.uuid === createdUuid)
      if (!synced) {
        showToast(CANDIDATE_CREATE_SYNC_MISS_MESSAGE, { variant: 'warning' })
        return false
      }
      setSelectedCandidate(synced)
      setListOpen(false)
      return true
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
