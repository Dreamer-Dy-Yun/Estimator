import type { CompetitorSalesRow, SelfSalesRow } from '../types'
import { mockAuthApi, mockDashboardApi } from './mock'
import type {
  AdminUserSummary,
  AppendCandidateItemPayload,
  AuthSession,
  ChangePasswordPayload,
  CreateAdminUserPayload,
  UpdateCandidateItemPayload,
  CandidateItemDetail,
  CandidateItemListResult,
  CandidateStashAnalysisHandlers,
  CandidateStashAnalysisStartResult,
  CandidateStashAnalysisSubscription,
  CandidateStashExcelUploadResult,
  CandidateStashSummary,
  CreateCandidateStashPayload,
  UpdateCandidateStashPayload,
  DashboardApi,
  ProductDrawerBundle,
  ProductDrawerBundleParams,
  ProductMonthlyTrend,
  ProductMonthlyTrendParams,
  ProductSalesInsight,
  ProductSalesInsightParams,
  ProductSecondaryDetail,
  SecondaryCompetitorChannel,
  SecondaryStockOrderCalcParams,
  SecondaryStockOrderCalcResult,
  SecondaryDailyTrendParams,
  SecondaryDailyTrendPoint,
  ProductSecondaryDetailParams,
  CompetitorSalesParams,
  LoginRequest,
  LoginResult,
  ResetAdminUserPasswordResult,
  SelfSalesFilterMeta,
  SelfSalesParams,
  UpdateAdminUserPayload,
  UpdateAuthUserPayload,
} from './types'

export async function getCurrentAuthSession(): Promise<AuthSession | null> {
  return mockAuthApi.getCurrentSession()
}

export async function login(payload: LoginRequest): Promise<LoginResult> {
  return mockAuthApi.login(payload)
}

export async function updateCurrentUser(payload: UpdateAuthUserPayload): Promise<AuthSession> {
  return mockAuthApi.updateCurrentUser(payload)
}

export async function changeCurrentUserPassword(payload: ChangePasswordPayload): Promise<void> {
  return mockAuthApi.changeCurrentUserPassword(payload)
}

export async function getAdminUsers(): Promise<AdminUserSummary[]> {
  return mockAuthApi.getAdminUsers()
}

export async function createAdminUser(payload: CreateAdminUserPayload): Promise<AdminUserSummary> {
  return mockAuthApi.createAdminUser(payload)
}

export async function updateAdminUser(payload: UpdateAdminUserPayload): Promise<AdminUserSummary> {
  return mockAuthApi.updateAdminUser(payload)
}

export async function resetAdminUserPassword(userUuid: string): Promise<ResetAdminUserPasswordResult> {
  return mockAuthApi.resetAdminUserPassword(userUuid)
}

export async function deleteAdminUser(userUuid: string): Promise<void> {
  return mockAuthApi.deleteAdminUser(userUuid)
}

export async function logout(): Promise<void> {
  return mockAuthApi.logout()
}

async function requireCurrentUserUuid(): Promise<string> {
  const session = await mockAuthApi.getCurrentSession()
  if (!session) throw new Error('로그인이 필요합니다.')
  return session.user.uuid
}

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

export async function getProductMonthlyTrend(
  id: string,
  params: ProductMonthlyTrendParams,
): Promise<ProductMonthlyTrend> {
  return mockDashboardApi.getProductMonthlyTrend(id, params)
}

async function getProductSalesInsight(
  id: string,
  params: ProductSalesInsightParams,
): Promise<ProductSalesInsight> {
  return mockDashboardApi.getProductSalesInsight(id, params)
}

async function getProductSecondaryDetail(
  id: string,
  params?: ProductSecondaryDetailParams,
): Promise<ProductSecondaryDetail> {
  return mockDashboardApi.getProductSecondaryDetail(id, params)
}

async function getSecondaryDailyTrend(
  params: SecondaryDailyTrendParams,
): Promise<SecondaryDailyTrendPoint[]> {
  return mockDashboardApi.getSecondaryDailyTrend(params)
}

export async function getSecondaryCompetitorChannels(): Promise<SecondaryCompetitorChannel[]> {
  return mockDashboardApi.getSecondaryCompetitorChannels()
}

export async function getCandidateStashes(productId?: string): Promise<CandidateStashSummary[]> {
  return mockDashboardApi.getCandidateStashes(productId, await requireCurrentUserUuid())
}

export async function getCandidateItemsByStash(stashUuid: string): Promise<CandidateItemListResult> {
  return mockDashboardApi.getCandidateItemsByStash(stashUuid, await requireCurrentUserUuid())
}

export async function getCandidateItemByUuid(itemUuid: string): Promise<CandidateItemDetail | null> {
  return mockDashboardApi.getCandidateItemByUuid(itemUuid, await requireCurrentUserUuid())
}

export async function deleteCandidateItem(itemUuid: string): Promise<void> {
  return mockDashboardApi.deleteCandidateItem(itemUuid, await requireCurrentUserUuid())
}

export async function deleteCandidateStash(stashUuid: string): Promise<void> {
  return mockDashboardApi.deleteCandidateStash(stashUuid, await requireCurrentUserUuid())
}

async function createCandidateStash(
  payload: CreateCandidateStashPayload,
): Promise<CandidateStashSummary> {
  return mockDashboardApi.createCandidateStash(payload, await requireCurrentUserUuid())
}

export async function duplicateCandidateStash(stashUuid: string): Promise<void> {
  return mockDashboardApi.duplicateCandidateStash(stashUuid, await requireCurrentUserUuid())
}

export async function updateCandidateStash(
  payload: UpdateCandidateStashPayload,
): Promise<CandidateStashSummary> {
  return mockDashboardApi.updateCandidateStash(payload, await requireCurrentUserUuid())
}

async function appendCandidateItem(
  payload: AppendCandidateItemPayload,
): Promise<void> {
  return mockDashboardApi.appendCandidateItem(payload, await requireCurrentUserUuid())
}

async function updateCandidateItem(payload: UpdateCandidateItemPayload): Promise<void> {
  return mockDashboardApi.updateCandidateItem(payload, await requireCurrentUserUuid())
}

export async function uploadCandidateStashExcel(file: File): Promise<CandidateStashExcelUploadResult> {
  await requireCurrentUserUuid()
  return mockDashboardApi.uploadCandidateStashExcel(file)
}

export async function startCandidateStashAnalysis(stashUuid: string): Promise<CandidateStashAnalysisStartResult> {
  return mockDashboardApi.startCandidateStashAnalysis(stashUuid, await requireCurrentUserUuid())
}

export function subscribeCandidateStashAnalysis(
  jobId: string,
  handlers: CandidateStashAnalysisHandlers,
): CandidateStashAnalysisSubscription {
  return mockDashboardApi.subscribeCandidateStashAnalysis(jobId, handlers)
}

async function getSecondaryStockOrderCalc(
  params: SecondaryStockOrderCalcParams,
): Promise<SecondaryStockOrderCalcResult> {
  return mockDashboardApi.getSecondaryStockOrderCalc(params)
}

export const dashboardApi: DashboardApi = {
  getSelfSales,
  getCompetitorSales,
  getSelfSalesFilterMeta,
  getProductDrawerBundle,
  getProductMonthlyTrend,
  getProductSalesInsight,
  getProductSecondaryDetail,
  getSecondaryDailyTrend,
  getSecondaryCompetitorChannels,
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
  uploadCandidateStashExcel,
  startCandidateStashAnalysis,
  subscribeCandidateStashAnalysis,
  getSecondaryStockOrderCalc,
}
