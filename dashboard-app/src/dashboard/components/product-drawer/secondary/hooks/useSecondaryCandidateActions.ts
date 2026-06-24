import type { CandidateItemDetail, CandidateStashSummary } from '../../../../../api'
import { useEffect, useMemo, useRef, useState } from 'react'
import { dashboardApi } from '../../../../../api'
import type { OrderSnapshotDocument } from '../../../../../snapshot/orderSnapshotTypes'
import type { CandidateStashPickerOption } from '../CandidateStashPickerModal'
import {
  buildCandidateCreateInput,
  findCandidateOptionByUuid,
  snapshotMutationInputKey,
} from './secondaryCandidateActionModel'
import type {
  CandidateActionGuardSnapshot,
  CandidateActionScope,
  CandidateCreateInput,
  CandidateCreateResult,
  CandidateMutationState,
  Params,
  SecondaryCandidateActionsResult,
} from './secondaryCandidateActionTypes'
import { useSecondaryCandidateActionGuard } from './useSecondaryCandidateActionGuard'

const COMPANY_SCOPE_REQUIRED_MESSAGE = '회사를 선택한 상태에서만 후보군 작업을 할 수 있습니다.' as const
const CANDIDATE_CREATE_SYNC_MISS_MESSAGE = '후보군은 생성됐지만 목록에서 생성 항목을 확인하지 못했습니다. 목록을 다시 불러와 주세요.' as const
const CANDIDATE_CREATE_REFRESH_MISS_MESSAGE = '후보군은 생성됐지만 목록 새로고침에 실패했습니다. 목록을 다시 불러와 주세요.' as const
const SNAPSHOT_BLOCK_FALLBACK_MESSAGE = '재고/발주 계산이 완료된 뒤 저장 또는 AI 요청을 진행할 수 있습니다.' as const

const getFailureMessage: (actionLabel: string, error: unknown) => string = (actionLabel: string, error: unknown) : string => {
  if (error instanceof Error && error.message.trim()) return `${actionLabel} 실패: ${error.message}`
  return `${actionLabel}에 실패했습니다. 다시 시도해 주세요.`
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
}: Params) : SecondaryCandidateActionsResult {
  const currentScope: CandidateActionScope = useMemo(() : CandidateActionScope => ({
    companyUuid: companyUuid ?? '',
    skuGroupKey,
    periodStart,
    periodEnd,
    forecastMonths,
  }), [companyUuid, forecastMonths, periodEnd, periodStart, skuGroupKey])
  const [loading, setLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [listOpen, setListOpen]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const [stashes, setStashes]: [CandidateStashPickerOption[], React.Dispatch<React.SetStateAction<CandidateStashPickerOption[]>>] = useState<CandidateStashPickerOption[]>([])
  const [selectedCandidate, setSelectedCandidate]: [CandidateStashPickerOption | null, React.Dispatch<React.SetStateAction<CandidateStashPickerOption | null>>] = useState<CandidateStashPickerOption | null>(null)
  const [nameInput, setNameInput]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [noteInput, setNoteInput]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const currentMutationRef: React.RefObject<CandidateMutationState> = useRef<CandidateMutationState>({
    appendTarget: '',
    createTarget: '',
    itemTarget: '',
    canBuildSnapshot,
    buildSnapshot,
  })
  const actionGuard: ReturnType<typeof useSecondaryCandidateActionGuard> = useSecondaryCandidateActionGuard({
    currentScope,
    currentMutationRef,
    setLoading,
  })

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
    if (!actionGuard.consumeScopeChange()) return
    queueMicrotask(() : void => {
      setLoading(false)
      setListOpen(false)
      setStashes([])
      setSelectedCandidate(null)
    })
  }, [actionGuard, currentScope])

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
    const snapshot: CandidateActionGuardSnapshot = actionGuard.beginAction(targetKind, mutationInputKey, companyUuid)
    try {
      const result: Awaited<T> = await mutate(companyUuid)
      if (!actionGuard.isActiveAction(snapshot)) return false
      return reflect(result) !== false
    } catch (error) {
      if (actionGuard.isActiveAction(snapshot)) showToast(getFailureMessage(actionLabel, error), { variant: 'error' })
      return false
    } finally {
      if (actionGuard.isActiveActionScope(snapshot)) setLoading(false)
    }
  }

  const refresh: () => Promise<CandidateStashSummary[] | null> = async () : Promise<CandidateStashSummary[] | null> => {
    if (!companyUuid) {
      showToast(COMPANY_SCOPE_REQUIRED_MESSAGE, { variant: 'error' })
      return null
    }
    const reqSeq: number = actionGuard.beginCandidateListRequest()
    const scope: CandidateActionScope = actionGuard.readCurrentScope()
    const rows: CandidateStashSummary[] = await dashboardApi.getCandidateStashes({ companyUuid })
    if (!actionGuard.isActiveCandidateListRequest(reqSeq, scope)) return null
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
    const snapshot: CandidateActionGuardSnapshot = actionGuard.beginAction('list', '', companyUuid)
    try {
      await refresh()
    } catch (error) {
      if (actionGuard.isActiveAction(snapshot)) {
        setListOpen(false)
        showToast(getFailureMessage('후보군 목록 불러오기', error), { variant: 'error' })
      }
    } finally {
      if (actionGuard.isActiveAction(snapshot)) setLoading(false)
    }
  }

  const confirmOrder: () => Promise<boolean> = () : Promise<boolean> => {
    if (selectedCandidate == null) return Promise.resolve(false)
    if (!guardSnapshotMutation()) return Promise.resolve(false)
    const confirmedOrderSnapshot: OrderSnapshotDocument = buildSnapshot()
    return runMutation(
      '후보군 아이템 저장',
      'append',
      snapshotMutationInputKey(confirmedOrderSnapshot),
      (companyUuid: string) : Promise<void> => dashboardApi.appendCandidateItem({
        stashUuid: selectedCandidate.uuid,
        skuGroupKey,
        companyUuid,
        confirmedOrderSnapshot,
        isLatestLlmComment: false,
      }),
      () : void => showToast('후보군에 아이템을 저장했습니다.'),
    )
  }

  const saveCandidateItemDetails: (confirmedOrderSnapshot: OrderSnapshotDocument | null, actionLabel: string, onSaved: (updatedItem: Awaited<ReturnType<typeof dashboardApi.updateCandidateItem>>) => void) => Promise<boolean> = (
    confirmedOrderSnapshot: OrderSnapshotDocument | null,
    actionLabel: string,
    onSaved: (updatedItem: Awaited<ReturnType<typeof dashboardApi.updateCandidateItem>>) => void,
  ) : Promise<boolean> => {
    if (candidateItemContext == null) return Promise.resolve(false)
    return runMutation(
      actionLabel,
      'item',
      confirmedOrderSnapshot == null ? '' : snapshotMutationInputKey(confirmedOrderSnapshot),
      (companyUuid: string) : Promise<CandidateItemDetail> => dashboardApi.updateCandidateItem({
        itemUuid: candidateItemContext.itemUuid,
        companyUuid,
        confirmedOrderSnapshot,
        isLatestLlmComment: false,
      }),
      onSaved,
    )
  }

  const confirmCandidateItem: () => Promise<boolean> = () : Promise<boolean> => {
    if (candidateItemContext == null) return Promise.resolve(false)
    if (!guardSnapshotMutation()) return Promise.resolve(false)
    const snapshot: OrderSnapshotDocument = buildSnapshot()
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
    async (mutationCompanyUuid: string) : Promise<CandidateCreateResult> => {
      const createInput: CandidateCreateInput = buildCandidateCreateInput({
        nameInput,
        noteInput,
        mutationCompanyUuid,
        periodStart,
        periodEnd,
        forecastMonths,
      })
      const created: CandidateStashSummary = await dashboardApi.createCandidateStash(createInput)
      const listReqSeq: number = actionGuard.beginCandidateListRequest()
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
      if (!actionGuard.isCurrentCandidateListRequest(listReqSeq)) return false
      setStashes(options)
      const synced: CandidateStashPickerOption | undefined = findCandidateOptionByUuid(options, createdUuid)
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
