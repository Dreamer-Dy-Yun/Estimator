import type { CandidateDetailBulkConfirmProgressEvent, CandidateStashLlmCommentJobProgressEvent } from '../types'
import type { CandidateJobProgressEventBase, CandidateJobSubscription } from '../types/candidate'
import { mockDashboardApi } from './dashboardApi'
import { MOCK_HANA_COMPANY_UUID } from './mockCompanyScope'
import { DEFAULT_CANDIDATE_STASH_CONTEXT } from './records'

export const MOCK_COMPANY_UUID: '00000000-0000-4000-8000-000000000101' = MOCK_HANA_COMPANY_UUID

export const defaultCandidateItemListParams: (stashUuid: string) => { stashUuid: string; dataReferencePeriodStart: '2025-01-01'; dataReferencePeriodEnd: '2025-12-31'; companyUuid: string; } = (stashUuid: string) : { stashUuid: string; dataReferencePeriodStart: '2025-01-01'; dataReferencePeriodEnd: '2025-12-31'; companyUuid: string; } => ({
  stashUuid,
  dataReferencePeriodStart: DEFAULT_CANDIDATE_STASH_CONTEXT.periodStart,
  dataReferencePeriodEnd: DEFAULT_CANDIDATE_STASH_CONTEXT.periodEnd,
  companyUuid: MOCK_COMPANY_UUID,
})

export const waitForBulkConfirmEvent: (jobId: string, companyUuid?: string) => Promise<CandidateDetailBulkConfirmProgressEvent> = (
  jobId: string,
  companyUuid?: string,
): Promise<CandidateDetailBulkConfirmProgressEvent> => new Promise((resolve: (value: CandidateDetailBulkConfirmProgressEvent | PromiseLike<CandidateDetailBulkConfirmProgressEvent>) => void) : void => {
  const subscriptionRef: { current?: { close: () => void } } = {}
  subscriptionRef.current = mockDashboardApi.subscribeCandidateDetailBulkConfirm(
    jobId,
    (event: CandidateDetailBulkConfirmProgressEvent) : void => {
      subscriptionRef.current?.close()
      resolve(event)
    },
    companyUuid == null ? undefined : { companyUuid },
  )
})

export const waitForBulkConfirmCompletedEvent: (jobId: string, companyUuid: string) => Promise<CandidateDetailBulkConfirmProgressEvent> = (
  jobId: string,
  companyUuid: string,
): Promise<CandidateDetailBulkConfirmProgressEvent> => new Promise((resolve: (value: CandidateDetailBulkConfirmProgressEvent | PromiseLike<CandidateDetailBulkConfirmProgressEvent>) => void) : void => {
  const subscription: CandidateJobSubscription = mockDashboardApi.subscribeCandidateDetailBulkConfirm(
    jobId,
    (event: CandidateDetailBulkConfirmProgressEvent) : void => {
      if (event.status !== 'completed') return
      subscription.close()
      resolve(event)
    },
    { companyUuid },
  )
})

export const waitForLlmCommentJobEvent: (jobId: string, companyUuid?: string) => Promise<CandidateStashLlmCommentJobProgressEvent> = (
  jobId: string,
  companyUuid?: string,
): Promise<CandidateStashLlmCommentJobProgressEvent> => new Promise((resolve: (value: CandidateJobProgressEventBase | PromiseLike<CandidateJobProgressEventBase>) => void) : void => {
  const subscriptionRef: { current?: { close: () => void } } = {}
  subscriptionRef.current = mockDashboardApi.subscribeCandidateStashLlmCommentJob(
    jobId,
    (event: CandidateJobProgressEventBase) : void => {
      subscriptionRef.current?.close()
      resolve(event)
    },
    companyUuid == null ? undefined : { companyUuid },
  )
})

export const waitForLlmCommentJobCompletedEvent: (jobId: string, companyUuid: string) => Promise<CandidateStashLlmCommentJobProgressEvent> = (
  jobId: string,
  companyUuid: string,
): Promise<CandidateStashLlmCommentJobProgressEvent> => new Promise((resolve: (value: CandidateJobProgressEventBase | PromiseLike<CandidateJobProgressEventBase>) => void) : void => {
  const subscription: CandidateJobSubscription = mockDashboardApi.subscribeCandidateStashLlmCommentJob(
    jobId,
    (event: CandidateJobProgressEventBase) : void => {
      if (event.status !== 'completed') return
      subscription.close()
      resolve(event)
    },
    { companyUuid },
  )
})
