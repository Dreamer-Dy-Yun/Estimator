import type { CompetitorSalesRow, SelfSalesRow } from '../types'
import { mockDashboardApi } from './mock'
import type {
  AppendCandidateItemPayload,
  UpdateCandidateItemPayload,
  CandidateItemDetail,
  CandidateItemSummary,
  CandidateStashSummary,
  CreateCandidateStashPayload,
  UpdateCandidateStashPayload,
  DashboardApi,
  ProductDrawerBundle,
  ProductDrawerBundleParams,
  ProductSecondaryDetail,
  SecondaryCompetitorChannel,
  SecondaryStockOrderCalcParams,
  SecondaryStockOrderCalcResult,
  SecondaryDailyTrendParams,
  SecondaryDailyTrendPoint,
  SecondaryLlmAnswerParams,
  ProductSecondaryDetailParams,
  SecondaryOrderSnapshotPayload,
  CompetitorSalesParams,
  SelfSalesFilterMeta,
  SelfSalesParams,
} from './types'

export async function getSelfSales(params?: SelfSalesParams): Promise<SelfSalesRow[]> {
  return mockDashboardApi.getSelfSales(params)
}

export async function getCompetitorSales(params?: CompetitorSalesParams): Promise<CompetitorSalesRow[]> {
  return mockDashboardApi.getCompetitorSales(params)
}

export async function getSelfSalesFilterMeta(): Promise<SelfSalesFilterMeta> {
  return mockDashboardApi.getSelfSalesFilterMeta()
}

export async function getProductDrawerBundle(
  id: string,
  params?: ProductDrawerBundleParams,
): Promise<ProductDrawerBundle> {
  return mockDashboardApi.getProductDrawerBundle(id, params)
}

export async function getProductSecondaryDetail(
  id: string,
  params?: ProductSecondaryDetailParams,
): Promise<ProductSecondaryDetail> {
  return mockDashboardApi.getProductSecondaryDetail(id, params)
}

export async function getSecondaryDailyTrend(
  params: SecondaryDailyTrendParams,
): Promise<SecondaryDailyTrendPoint[]> {
  return mockDashboardApi.getSecondaryDailyTrend(params)
}

export async function getSecondaryCompetitorChannels(): Promise<SecondaryCompetitorChannel[]> {
  return mockDashboardApi.getSecondaryCompetitorChannels()
}

export async function getSecondaryLlmAnswer(params: SecondaryLlmAnswerParams): Promise<string> {
  return mockDashboardApi.getSecondaryLlmAnswer(params)
}

export async function saveSecondaryOrderSnapshot(
  snapshot: SecondaryOrderSnapshotPayload,
): Promise<void> {
  return mockDashboardApi.saveSecondaryOrderSnapshot(snapshot)
}

export async function getSecondaryOrderSnapshots(productId?: string): Promise<SecondaryOrderSnapshotPayload[]> {
  return mockDashboardApi.getSecondaryOrderSnapshots(productId)
}

export async function deleteSecondaryOrderSnapshot(productId: string, savedAt: string): Promise<void> {
  return mockDashboardApi.deleteSecondaryOrderSnapshot(productId, savedAt)
}

export async function getCandidateStashes(productId?: string): Promise<CandidateStashSummary[]> {
  return mockDashboardApi.getCandidateStashes(productId)
}

export async function getCandidateItemsByStash(stashUuid: string): Promise<CandidateItemSummary[]> {
  return mockDashboardApi.getCandidateItemsByStash(stashUuid)
}

export async function getCandidateItemByUuid(itemUuid: string): Promise<CandidateItemDetail | null> {
  return mockDashboardApi.getCandidateItemByUuid(itemUuid)
}

export async function deleteCandidateItem(itemUuid: string): Promise<void> {
  return mockDashboardApi.deleteCandidateItem(itemUuid)
}

export async function deleteCandidateStash(stashUuid: string): Promise<void> {
  return mockDashboardApi.deleteCandidateStash(stashUuid)
}

export async function createCandidateStash(
  payload: CreateCandidateStashPayload,
): Promise<CandidateStashSummary> {
  return mockDashboardApi.createCandidateStash(payload)
}

export async function duplicateCandidateStash(stashUuid: string): Promise<void> {
  return mockDashboardApi.duplicateCandidateStash(stashUuid)
}

export async function updateCandidateStash(
  payload: UpdateCandidateStashPayload,
): Promise<CandidateStashSummary> {
  return mockDashboardApi.updateCandidateStash(payload)
}

export async function appendCandidateItem(
  payload: AppendCandidateItemPayload,
): Promise<void> {
  return mockDashboardApi.appendCandidateItem(payload)
}

export async function updateCandidateItem(payload: UpdateCandidateItemPayload): Promise<void> {
  return mockDashboardApi.updateCandidateItem(payload)
}

export async function getSecondaryStockOrderCalc(
  params: SecondaryStockOrderCalcParams,
): Promise<SecondaryStockOrderCalcResult> {
  return mockDashboardApi.getSecondaryStockOrderCalc(params)
}

/** 화면·훅에서 한 객체로 주입하거나 테스트 목으로 교체할 때 사용 */
export const dashboardApi: DashboardApi = {
  getSelfSales,
  getCompetitorSales,
  getSelfSalesFilterMeta,
  getProductDrawerBundle,
  getProductSecondaryDetail,
  getSecondaryDailyTrend,
  getSecondaryCompetitorChannels,
  getSecondaryLlmAnswer,
  saveSecondaryOrderSnapshot,
  getSecondaryOrderSnapshots,
  deleteSecondaryOrderSnapshot,
  getCandidateStashes,
  getCandidateItemsByStash,
  getCandidateItemByUuid,
  deleteCandidateItem,
  deleteCandidateStash,
  createCandidateStash,
  updateCandidateStash,
  duplicateCandidateStash,
  appendCandidateItem,
  updateCandidateItem,
  getSecondaryStockOrderCalc,
}
