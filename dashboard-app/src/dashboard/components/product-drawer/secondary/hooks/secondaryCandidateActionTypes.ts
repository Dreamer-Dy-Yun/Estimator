import type { Dispatch, SetStateAction } from 'react'
import type { CandidateStashSummary } from '../../../../../api'
import type { ToastContextValue } from '../../../../../components/AppToastContext'
import type { OrderSnapshotDocument } from '../../../../../snapshot/orderSnapshotTypes'
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

export type CandidateMutationState = {
  appendTarget: string
  createTarget: string
  itemTarget: string
  canBuildSnapshot: boolean
  buildSnapshot: () => OrderSnapshotDocument
}

export type CandidateCreateInput = {
  name: string
  note: string
  companyUuid: string
  periodStart: string
  periodEnd: string
  forecastMonths: number
}

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
  buildSnapshot: () => OrderSnapshotDocument
  showToast: ToastContextValue['showToast']
}

export type SecondaryCandidateActionsResult = {
  loading: boolean
  listOpen: boolean
  stashes: CandidateStashPickerOption[]
  selectedCandidate: CandidateStashPickerOption | null
  companyScopeBlocked: boolean
  companyScopeBlockReason: string
  nameInput: string
  noteInput: string
  setNameInput: Dispatch<SetStateAction<string>>
  setNoteInput: Dispatch<SetStateAction<string>>
  setListOpen: Dispatch<SetStateAction<boolean>>
  createCandidate: () => Promise<boolean>
  confirmOrder: () => Promise<boolean>
  refresh: () => Promise<CandidateStashSummary[] | null>
  openPicker: () => Promise<void>
  confirmCandidateItem: () => Promise<boolean>
  unconfirmCandidateItem: () => Promise<boolean>
  selectCandidate: (row: CandidateStashPickerOption) => void
}
