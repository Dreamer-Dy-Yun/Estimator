import type { OrderSnapshotDocument } from '../../../../../snapshot/orderSnapshotTypes'
import type { CandidateStashPickerOption } from '../CandidateStashPickerModal'
import type { CandidateCreateInput } from './secondaryCandidateActionTypes'

export type BuildCandidateCreateInputParams = {
  nameInput: string
  noteInput: string
  mutationCompanyUuid: string
  periodStart: string
  periodEnd: string
  forecastMonths: number
}

export const snapshotMutationInputKey: (snapshot: OrderSnapshotDocument | null) => string = (
  snapshot: OrderSnapshotDocument | null,
) : string => {
  if (snapshot == null) return 'null'
  return JSON.stringify({
    skuGroupKey: snapshot.skuGroupKey,
    context: snapshot.context,
    baseSubject: snapshot.drawer2.baseSubject,
    comparisonSubject: snapshot.drawer2.comparisonSubject,
    comparisonBasis: snapshot.drawer2.comparisonBasis,
    stockOrderRequest: snapshot.drawer2.stockOrderRequest,
    stockOrderResult: snapshot.drawer2.stockOrderResult ?? null,
    unitEconomics: snapshot.drawer2.unitEconomics,
    selfWeightPct: snapshot.drawer2.selfWeightPct,
    bufferStock: snapshot.drawer2.bufferStock,
    aiComment: snapshot.drawer2.aiComment,
    confirmed: snapshot.drawer2.confirmed,
    sizeOrders: snapshot.drawer2.sizeOrders,
  })
}

export const buildCandidateCreateInput: (
  params: BuildCandidateCreateInputParams,
) => CandidateCreateInput = ({
  nameInput,
  noteInput,
  mutationCompanyUuid,
  periodStart,
  periodEnd,
  forecastMonths,
}: BuildCandidateCreateInputParams) : CandidateCreateInput => ({
  name: nameInput.trim(),
  note: noteInput.trim(),
  companyUuid: mutationCompanyUuid,
  periodStart,
  periodEnd,
  forecastMonths,
})

export const findCandidateOptionByUuid: (
  options: CandidateStashPickerOption[],
  createdUuid: string,
) => CandidateStashPickerOption | undefined = (
  options: CandidateStashPickerOption[],
  createdUuid: string,
) : CandidateStashPickerOption | undefined => options.find(
  (row: CandidateStashPickerOption) : boolean => row.uuid === createdUuid,
)
