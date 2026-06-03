import type { CandidateItemDetail, CandidateStashSummary } from '../../../../../api'
import { useEffect, useMemo, useRef, useState } from 'react'
import { dashboardApi } from '../../../../../api'
import type { ToastContextValue } from '../../../../../components/AppToastContext'
import type { OrderSnapshotDocumentV2 } from '../../../../../snapshot/orderSnapshotTypes'
import type { CandidateStashPickerOption } from '../CandidateStashPickerModal'
import type { CandidateItemPanelContext } from '../secondaryDrawerTypes'

export type CandidateActionGuardSnapshot = {
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

export type CandidateCreateResult = {
  createdUuid: string
  options: CandidateStashPickerOption[] | null
  listReqSeq: number
  refreshError: unknown | null
}

export type CandidateActionScope = Pick<
  CandidateActionGuardSnapshot,
  'companyUuid' | 'skuGroupKey' | 'periodStart' | 'periodEnd' | 'forecastMonths'
>

export type Params = {
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

const COMPANY_SCOPE_REQUIRED_MESSAGE = '회사를 선택한 상태에서만 후보군 작업을 할 수 있습니다.' as const
const CANDIDATE_CREATE_SYNC_MISS_MESSAGE = '후보군은 생성됐지만 목록에서 생성 항목을 확인하지 못했습니다. 목록을 다시 불러와 주세요.' as const
const CANDIDATE_CREATE_REFRESH_MISS_MESSAGE = '후보군은 생성됐지만 목록 새로고침에 실패했습니다. 목록을 다시 불러와 주세요.' as const
const SNAPSHOT_BLOCK_FALLBACK_MESSAGE = '재고/발주 계산이 완료된 뒤 저장 또는 AI 요청을 진행할 수 있습니다.' as const

const getFailureMessage: (actionLabel: string, error: unknown) => string = (actionLabel: string, error: unknown) : string => {
  if (error instanceof Error && error.message.trim()) return `${actionLabel} 실패: ${error.message}`
  return `${actionLabel}에 실패했습니다. 다시 시도해 주세요.`
}

const snapshotMutationInputKey: (snapshot: OrderSnapshotDocumentV2 | null) => string = (snapshot: OrderSnapshotDocumentV2 | null) : string => {
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
}: Params) : { loading: boolean; listOpen: boolean; stashes: CandidateStashPickerOption[]; selectedCandidate: CandidateStashPickerOption | null; companyScopeBlocked: boolean; companyScopeBlockReason: string; nameInput: string; noteInput: string; setNameInput: React.Dispatch<React.SetStateAction<string>>; setNoteInput: React.Dispatch<React.SetStateAction<string>>; setListOpen: React.Dispatch<React.SetStateAction<boolean>>; createCandidate: () => Promise<boolean>; confirmOrder: () => Promise<boolean>; refresh: () => Promise<CandidateStashSummary[] | null>; openPicker: () => Promise<void>; confirmCandidateItem: () => Promise<boolean>; unconfirmCandidateItem: () => Promise<boolean>; selectCandidate: (row: CandidateStashPickerOption) => void; } {
  const currentScope: { companyUuid: string; skuGroupKey: string; periodStart: string; periodEnd: string; forecastMonths: number; } = useMemo(() : { companyUuid: string; skuGroupKey: string; periodStart: string; periodEnd: string; forecastMonths: number; } => ({
    companyUuid: companyUuid ?? '',
    skuGroupKey,
    periodStart,
    periodEnd,
    forecastMonths,
  }), [companyUuid, forecastMonths, periodEnd, periodStart, skuGroupKey])
  const mountedRef: React.RefObject<boolean> = useRef(false)
  const candidateListReqSeqRef: React.RefObject<number> = useRef(0)
  const actionReqSeqRef: React.RefObject<number> = useRef(0)
  const currentScopeRef: React.RefObject<CandidateActionScope> = useRef<CandidateActionScope>(currentScope)
  const resetScopeRef: React.RefObject<CandidateActionScope> = useRef<CandidateActionScope>(currentScope)
  const [loading, setLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [listOpen, setListOpen]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [stashes, setStashes]: [CandidateStashPickerOption[], React.Dispatch<React.SetStateAction<CandidateStashPickerOption[]>>] = useState<CandidateStashPickerOption[]>([])
  const [selectedCandidate, setSelectedCandidate]: [CandidateStashPickerOption | null, React.Dispatch<React.SetStateAction<CandidateStashPickerOption | null>>] = useState<CandidateStashPickerOption | null>(null)
  const [nameInput, setNameInput]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [noteInput, setNoteInput]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const currentMutationRef: React.RefObject<{ appendTarget: string; createTarget: string; itemTarget: string; canBuildSnapshot: boolean; buildSnapshot: () => OrderSnapshotDocumentV2; }> = useRef({
    appendTarget: '',
    createTarget: '',
    itemTarget: '',
    canBuildSnapshot,
    buildSnapshot,
  })

  useEffect(() : () => void => {
    mountedRef.current = true
    return () : void => {
      mountedRef.current = false
      candidateListReqSeqRef.current += 1
      actionReqSeqRef.current += 1
    }
  }, [])

  useEffect(() : void => {
    currentScopeRef.current = currentScope
  }, [currentScope])

  useEffect(() : void => {
    currentMutationRef.current = {
      appendTarget: selectedCandidate?.uuid ?? '',
      createTarget: `${nameInput.trim()}\n${noteInput.trim()}`,
      itemTarget: candidateItemContext?.itemUuid ?? '',
      canBuildSnapshot,
      buildSnapshot,
    }
  }, [buildSnapshot, canBuildSnapshot, candidateItemContext?.itemUuid, nameInput, noteInput, selectedCandidate?.uuid])

  useEffect(() : void => {
    const nextScope: { companyUuid: string; skuGroupKey: string; periodStart: string; periodEnd: string; forecastMonths: number; } = currentScope
    const current: CandidateActionScope = resetScopeRef.current
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
  }, [currentScope])

  const isActiveActionScope: (snapshot: CandidateActionGuardSnapshot) => boolean = (snapshot: CandidateActionGuardSnapshot) : boolean => {
    const current: CandidateActionScope = currentScopeRef.current
    return mountedRef.current
      && current.companyUuid === snapshot.companyUuid
      && current.skuGroupKey === snapshot.skuGroupKey
      && current.periodStart === snapshot.periodStart
      && current.periodEnd === snapshot.periodEnd
      && current.forecastMonths === snapshot.forecastMonths
      && actionReqSeqRef.current === snapshot.actionSeq
  }

  const currentTargetIdentity: (targetKind: CandidateActionGuardSnapshot['targetKind']) => string = (targetKind: CandidateActionGuardSnapshot['targetKind']) : string => {
    const current: { appendTarget: string; createTarget: string; itemTarget: string; canBuildSnapshot: boolean; buildSnapshot: () => OrderSnapshotDocumentV2; } = currentMutationRef.current
    if (targetKind === 'append') return current.appendTarget
    if (targetKind === 'create') return current.createTarget
    if (targetKind === 'item') return current.itemTarget
    return ''
  }
  const currentSnapshotMutationInputKey: () => string | null = () : string | null => {
    if (!currentMutationRef.current.canBuildSnapshot) return null
    try {
      return snapshotMutationInputKey(currentMutationRef.current.buildSnapshot())
    } catch {
      return null
    }
  }

  const isActiveAction: (snapshot: CandidateActionGuardSnapshot) => boolean = (snapshot: CandidateActionGuardSnapshot) : boolean => (
    isActiveActionScope(snapshot)
    && currentTargetIdentity(snapshot.targetKind) === snapshot.targetIdentity
    && (snapshot.mutationInputKey === '' || currentSnapshotMutationInputKey() === snapshot.mutationInputKey)
  )

  const beginAction: (targetKind: CandidateActionGuardSnapshot['targetKind'], mutationInputKey?: string, actionCompanyUuid?: string) => CandidateActionGuardSnapshot = (
    targetKind: CandidateActionGuardSnapshot['targetKind'],
    mutationInputKey: string = '',
    actionCompanyUuid: string = companyUuid ?? '',
  ): CandidateActionGuardSnapshot => {
    const actionSeq: number = actionReqSeqRef.current + 1
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

  const guardSnapshotMutation: () => boolean = () : boolean => {
    if (!canBuildSnapshot) {
      showToast(snapshotBlockReason, { variant: 'error' })
      return false
    }
    return true
  }

  const runMutation: <T>(actionLabel: string, targetKind: CandidateActionGuardSnapshot['targetKind'], mutationInputKey: string, mutate: (mutationCompanyUuid: string) => Promise<T>, reflect: (result: T) => boolean | void) => Promise<boolean> = async <T,>(
    actionLabel: string,
    targetKind: CandidateActionGuardSnapshot['targetKind'],
    mutationInputKey: string,
    mutate: (mutationCompanyUuid: string) => Promise<T>,
    reflect: (result: T) => boolean | void,
  ) : Promise<boolean> => {
    if (!companyUuid) {
      showToast(COMPANY_SCOPE_REQUIRED_MESSAGE, { variant: 'error' })
      return false
    }
    const snapshot: CandidateActionGuardSnapshot = beginAction(targetKind, mutationInputKey, companyUuid)
    try {
      const result: Awaited<T> = await mutate(companyUuid)
      if (!isActiveAction(snapshot)) return false
      return reflect(result) !== false
    } catch (error) {
      if (isActiveAction(snapshot)) showToast(getFailureMessage(actionLabel, error), { variant: 'error' })
      return false
    } finally {
      if (isActiveActionScope(snapshot)) setLoading(false)
    }
  }

  const refresh: () => Promise<CandidateStashSummary[] | null> = async () : Promise<CandidateStashSummary[] | null> => {
    const reqSeq: number = candidateListReqSeqRef.current + 1
    const scope: CandidateActionScope = currentScopeRef.current
    candidateListReqSeqRef.current = reqSeq
    const rows: CandidateStashSummary[] = await dashboardApi.getCandidateStashes({ companyUuid })
    const current: CandidateActionScope = currentScopeRef.current
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

  const openPicker: () => Promise<void> = async () : Promise<void> => {
    if (listOpen) {
      setListOpen(false)
      return
    }
    if (!companyUuid) {
      showToast(COMPANY_SCOPE_REQUIRED_MESSAGE, { variant: 'error' })
      return
    }
    setListOpen(true)
    const snapshot: CandidateActionGuardSnapshot = beginAction('list', '', companyUuid)
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

  const confirmOrder: () => Promise<boolean> = () : Promise<boolean> => {
    if (selectedCandidate == null) return Promise.resolve(false)
    if (!guardSnapshotMutation()) return Promise.resolve(false)
    const details: OrderSnapshotDocumentV2 = buildSnapshot()
    return runMutation(
      '후보군 아이템 저장',
      'append',
      snapshotMutationInputKey(details),
      (companyUuid: string) : Promise<void> => dashboardApi.appendCandidateItem({
        stashUuid: selectedCandidate.uuid,
        skuGroupKey,
        companyUuid,
        details,
        isLatestLlmComment: false,
      }),
      () : void => showToast('후보군에 아이템을 저장했습니다.'),
    )
  }

  const saveCandidateItemDetails: (details: OrderSnapshotDocumentV2 | null, actionLabel: string, onSaved: (updatedItem: Awaited<ReturnType<typeof dashboardApi.updateCandidateItem>>) => void) => Promise<boolean> = (
    details: OrderSnapshotDocumentV2 | null,
    actionLabel: string,
    onSaved: (updatedItem: Awaited<ReturnType<typeof dashboardApi.updateCandidateItem>>) => void,
  ) : Promise<boolean> => {
    if (candidateItemContext == null) return Promise.resolve(false)
    return runMutation(
      actionLabel,
      'item',
      details == null ? '' : snapshotMutationInputKey(details),
      (companyUuid: string) : Promise<CandidateItemDetail> => dashboardApi.updateCandidateItem({
        itemUuid: candidateItemContext.itemUuid,
        companyUuid,
        details,
        isLatestLlmComment: false,
      }),
      onSaved,
    )
  }

  const confirmCandidateItem: () => Promise<boolean> = () : Promise<boolean> => {
    if (candidateItemContext == null) return Promise.resolve(false)
    if (!guardSnapshotMutation()) return Promise.resolve(false)
    const snapshot: OrderSnapshotDocumentV2 = buildSnapshot()
    return saveCandidateItemDetails(snapshot, hasSavedSnapshot ? '상세확정 갱신' : '상세확정', (updatedItem: CandidateItemDetail) : void => {
      candidateItemContext?.onConfirmed?.(snapshot, updatedItem)
      candidateItemContext?.onSaved?.()
      showToast(hasSavedSnapshot ? '상세확정 내용을 갱신했습니다.' : '상세확정했습니다.')
    })
  }

  const unconfirmCandidateItem: () => Promise<boolean> = () : Promise<boolean> => saveCandidateItemDetails(null, '상세확정 해제', (updatedItem: CandidateItemDetail) : void => {
    candidateItemContext?.onUnconfirmed?.(updatedItem)
    candidateItemContext?.onSaved?.()
    showToast('상세확정을 해제했습니다.')
  })

  const createCandidate: () => Promise<boolean> = () : Promise<boolean> => runMutation<CandidateCreateResult>(
    '후보군 생성',
    'create',
    '',
    async (mutationCompanyUuid: string) : Promise<{ createdUuid: string; options: CandidateStashSummary[]; listReqSeq: number; refreshError: null; } | { createdUuid: string; options: null; listReqSeq: number; refreshError: unknown; }> => {
      const created: CandidateStashSummary = await dashboardApi.createCandidateStash({
        name: nameInput.trim(),
        note: noteInput.trim(),
        companyUuid: mutationCompanyUuid,
        periodStart,
        periodEnd,
        forecastMonths,
      })
      const listReqSeq: number = candidateListReqSeqRef.current + 1
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
    ({ createdUuid, options, listReqSeq, refreshError }: CandidateCreateResult) : boolean => {
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
      const synced: CandidateStashPickerOption | undefined = options.find((row: CandidateStashPickerOption) : boolean => row.uuid === createdUuid)
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
    selectCandidate: (row: CandidateStashPickerOption) : void => {
      setSelectedCandidate(row)
      setListOpen(false)
    },
  }
}
