import type { CompetitorSalesRow, ProductSecondaryDetail, SelfSalesRow } from '../types'
import type { AdminGoogleSheetConfigSummary, CreateAdminGoogleSheetConfigPayload, UpdateAdminGoogleSheetConfigPayload } from './types/admin-google-sheet'
import type { AdminGptKeySummary, AdminGptKeyTestResult, CreateAdminGptKeyPayload, RotateAdminGptKeyPayload, UpdateAdminGptKeyPayload } from './types/admin-gpt-key'
import type { AdminUserSummary, AuthSession, ChangePasswordPayload, CreateAdminUserPayload, LoginRequest, LoginResult, ResetAdminUserPasswordResult, UpdateAdminUserPayload, UpdateAuthUserPayload } from './types/auth'
import type { AppendCandidateItemPayload, AppendCandidateItemsPayload, AppendCandidateItemsResponse, CandidateDetailBulkConfirmProgressEvent, CandidateDetailBulkConfirmStartPayload, CandidateDetailBulkConfirmStartResult, CandidateDetailBulkConfirmSubscription, CandidateItemDetail, CandidateItemListParams, CandidateItemListResult, CandidateRecommendationParams, CandidateRecommendationResult, CandidateStashExcelTemplateDownload, CandidateStashExcelUploadResult, CandidateStashListParams, CandidateStashLlmCommentJobParams, CandidateStashLlmCommentJobProgressEvent, CandidateStashLlmCommentJobStartResult, CandidateStashLlmCommentJobSubscription, CandidateStashSummary, CreateCandidateStashPayload, UpdateCandidateItemPayload, UpdateCandidateItemResponse, UpdateCandidateStashPayload } from './types/candidate'
import type { CandidateOrderMetricEvent, CandidateOrderMetricStreamParams, CandidateOrderMetricSubscription } from './types/candidate-order-metrics'
import type { CompanyMutationScopeParams, CompanyScopeParams, CompanySummary } from './types/company'
import type { DashboardApi, DashboardEventStreamErrorListener } from './types/dashboard-api'
import type { ProductComparisonTarget, ProductComparisonTargetParams, ProductDrawerBundle, ProductDrawerBundleParams, ProductMonthlyTrend, ProductMonthlyTrendParams, ProductSalesInsight, ProductSalesInsightParams } from './types/drawer'
import type { InventoryArrivalCollectionParams, InventoryArrivalCollectionResult } from './types/inventory-arrival'
import type { CompetitorSalesGridParams, CompetitorSalesParams, SalesFilterMeta, SalesFilterMetaParams, ScatterSalesGridResponse, SelfSalesGridParams, SelfSalesParams } from './types/sales'
import type { ProductSecondaryDetailParams, SecondaryAiCommentParams, SecondaryAiCommentResult, SecondaryCompetitorChannel, SecondaryDailyTrendParams, SecondaryDailyTrendSource, SecondaryInboundSplitSource, SecondaryInboundSplitSourceParams, SecondaryStockOrderCalcParams, SecondaryStockOrderCalcResult } from './types/secondary'
import {
  adminGoogleSheetRequests,
  adminGptKeyRequests,
  authRequests,
  companyRequests,
  dashboardRequests,
  inventoryArrivalRequests,
} from './requests'

export const getCurrentAuthSession: () => Promise<AuthSession | null> = authRequests.getCurrentSession
export const login: (payload: LoginRequest) => Promise<LoginResult> = authRequests.login
export const updateCurrentUser: (payload: UpdateAuthUserPayload) => Promise<AuthSession> = authRequests.updateCurrentUser
export const changeCurrentUserPassword: (payload: ChangePasswordPayload) => Promise<void> = authRequests.changeCurrentUserPassword
export const getAdminUsers: () => Promise<AdminUserSummary[]> = authRequests.getAdminUsers
export const createAdminUser: (payload: CreateAdminUserPayload) => Promise<AdminUserSummary> = authRequests.createAdminUser
export const updateAdminUser: (payload: UpdateAdminUserPayload) => Promise<AdminUserSummary> = authRequests.updateAdminUser
export const resetAdminUserPassword: (userUuid: string) => Promise<ResetAdminUserPasswordResult> = authRequests.resetAdminUserPassword
export const deleteAdminUser: (userUuid: string) => Promise<void> = authRequests.deleteAdminUser
export const logout: () => Promise<void> = authRequests.logout

export const getCompanies: () => Promise<CompanySummary[]> = companyRequests.getCompanies

export const getAdminGptKeys: () => Promise<AdminGptKeySummary[]> = adminGptKeyRequests.getAdminGptKeys
export const createAdminGptKey: (payload: CreateAdminGptKeyPayload) => Promise<AdminGptKeySummary> = adminGptKeyRequests.createAdminGptKey
export const updateAdminGptKey: (payload: UpdateAdminGptKeyPayload) => Promise<AdminGptKeySummary> = adminGptKeyRequests.updateAdminGptKey
export const rotateAdminGptKey: (payload: RotateAdminGptKeyPayload) => Promise<AdminGptKeySummary> = adminGptKeyRequests.rotateAdminGptKey
export const testAdminGptKey: (keyUuid: string) => Promise<AdminGptKeyTestResult> = adminGptKeyRequests.testAdminGptKey
export const deleteAdminGptKey: (keyUuid: string) => Promise<void> = adminGptKeyRequests.deleteAdminGptKey

export const getAdminGoogleSheetConfigs: (params?: CompanyScopeParams) => Promise<AdminGoogleSheetConfigSummary[]> = adminGoogleSheetRequests.getAdminGoogleSheetConfigs
export const createAdminGoogleSheetConfig: (payload: CreateAdminGoogleSheetConfigPayload) => Promise<AdminGoogleSheetConfigSummary> = adminGoogleSheetRequests.createAdminGoogleSheetConfig
export const updateAdminGoogleSheetConfig: (payload: UpdateAdminGoogleSheetConfigPayload) => Promise<AdminGoogleSheetConfigSummary> = adminGoogleSheetRequests.updateAdminGoogleSheetConfig
export const deleteAdminGoogleSheetConfig: (configUuid: string, params: CompanyMutationScopeParams) => Promise<void> = adminGoogleSheetRequests.deleteAdminGoogleSheetConfig

export const collectInventoryArrivalDates: (params: InventoryArrivalCollectionParams) => Promise<InventoryArrivalCollectionResult> = inventoryArrivalRequests.collectInventoryArrivalDates

export const getSelfSales: (params?: SelfSalesParams) => Promise<SelfSalesRow[]> = dashboardRequests.getSelfSales
export const getCompetitorSales: (params?: CompetitorSalesParams) => Promise<CompetitorSalesRow[]> = dashboardRequests.getCompetitorSales
export const getSelfSalesScatterGrid: (params?: SelfSalesGridParams) => Promise<ScatterSalesGridResponse> = dashboardRequests.getSelfSalesScatterGrid
export const getCompetitorSalesScatterGrid: (params?: CompetitorSalesGridParams) => Promise<ScatterSalesGridResponse> = dashboardRequests.getCompetitorSalesScatterGrid
export const getSalesFilterMeta: (params?: SalesFilterMetaParams) => Promise<SalesFilterMeta> = dashboardRequests.getSalesFilterMeta
export const getProductDrawerBundle: (skuGroupKey: string, params: ProductDrawerBundleParams) => Promise<ProductDrawerBundle> = dashboardRequests.getProductDrawerBundle
export const getProductComparisonTargets: (params: ProductComparisonTargetParams) => Promise<ProductComparisonTarget[]> = dashboardRequests.getProductComparisonTargets
export const getProductMonthlyTrend: (skuGroupKey: string, params: ProductMonthlyTrendParams) => Promise<ProductMonthlyTrend> = dashboardRequests.getProductMonthlyTrend
export const getProductSalesInsight: (skuGroupKey: string, params: ProductSalesInsightParams) => Promise<ProductSalesInsight> = dashboardRequests.getProductSalesInsight
export const getProductSecondaryDetail: (skuGroupKey: string, params: ProductSecondaryDetailParams) => Promise<ProductSecondaryDetail> = dashboardRequests.getProductSecondaryDetail
export const getSecondaryCompetitorChannels: () => Promise<SecondaryCompetitorChannel[]> = dashboardRequests.getSecondaryCompetitorChannels
export const getSecondaryDailyTrend: (params: SecondaryDailyTrendParams) => Promise<SecondaryDailyTrendSource> = dashboardRequests.getSecondaryDailyTrend
export const getSecondaryInboundSplitSource: (params: SecondaryInboundSplitSourceParams) => Promise<SecondaryInboundSplitSource> = dashboardRequests.getSecondaryInboundSplitSource
export const getSecondaryAiComment: (params: SecondaryAiCommentParams) => Promise<SecondaryAiCommentResult> = dashboardRequests.getSecondaryAiComment
export const getSecondaryStockOrderCalc: (params: SecondaryStockOrderCalcParams) => Promise<SecondaryStockOrderCalcResult> = dashboardRequests.getSecondaryStockOrderCalc
export const getCandidateStashes: (params?: CandidateStashListParams) => Promise<CandidateStashSummary[]> = dashboardRequests.getCandidateStashes
export const getCandidateItemsByStash: (params: CandidateItemListParams) => Promise<CandidateItemListResult> = dashboardRequests.getCandidateItemsByStash
export const subscribeCandidateOrderMetrics: (params: CandidateOrderMetricStreamParams, listener: (event: CandidateOrderMetricEvent) => void, onError?: DashboardEventStreamErrorListener) => CandidateOrderMetricSubscription = dashboardRequests.subscribeCandidateOrderMetrics
export const startCandidateStashLlmCommentJob: (stashUuid: string, params: CandidateStashLlmCommentJobParams) => Promise<CandidateStashLlmCommentJobStartResult> = dashboardRequests.startCandidateStashLlmCommentJob
export const subscribeCandidateStashLlmCommentJob: (jobId: string, listener: (event: CandidateStashLlmCommentJobProgressEvent) => void, onError: DashboardEventStreamErrorListener | undefined, params: CandidateStashLlmCommentJobParams) => CandidateStashLlmCommentJobSubscription = dashboardRequests.subscribeCandidateStashLlmCommentJob
export const startCandidateDetailBulkConfirm: (payload: CandidateDetailBulkConfirmStartPayload) => Promise<CandidateDetailBulkConfirmStartResult> = dashboardRequests.startCandidateDetailBulkConfirm
export const subscribeCandidateDetailBulkConfirm: (jobId: string, listener: (event: CandidateDetailBulkConfirmProgressEvent) => void, onError: DashboardEventStreamErrorListener | undefined, params: CompanyMutationScopeParams) => CandidateDetailBulkConfirmSubscription = dashboardRequests.subscribeCandidateDetailBulkConfirm
export const getCandidateRecommendations: (params: CandidateRecommendationParams) => Promise<CandidateRecommendationResult> = dashboardRequests.getCandidateRecommendations
export const getCandidateItemByUuid: (itemUuid: string, params?: CompanyScopeParams) => Promise<CandidateItemDetail | null> = dashboardRequests.getCandidateItemByUuid
export const deleteCandidateItem: (itemUuid: string, params: CompanyMutationScopeParams) => Promise<void> = dashboardRequests.deleteCandidateItem
export const deleteCandidateItems: (stashUuid: string, itemUuids: string[], params: CompanyMutationScopeParams) => Promise<void> = dashboardRequests.deleteCandidateItems
export const deleteCandidateStash: (stashUuid: string, params: CompanyMutationScopeParams) => Promise<void> = dashboardRequests.deleteCandidateStash
export const createCandidateStash: (payload: CreateCandidateStashPayload) => Promise<CandidateStashSummary> = dashboardRequests.createCandidateStash
export const duplicateCandidateStash: (stashUuid: string, params: CompanyMutationScopeParams) => Promise<void> = dashboardRequests.duplicateCandidateStash
export const updateCandidateStash: (payload: UpdateCandidateStashPayload) => Promise<CandidateStashSummary> = dashboardRequests.updateCandidateStash
export const appendCandidateItem: (payload: AppendCandidateItemPayload) => Promise<void> = dashboardRequests.appendCandidateItem
export const appendCandidateItems: (payload: AppendCandidateItemsPayload) => Promise<AppendCandidateItemsResponse> = dashboardRequests.appendCandidateItems
export const updateCandidateItem: (payload: UpdateCandidateItemPayload) => Promise<UpdateCandidateItemResponse> = dashboardRequests.updateCandidateItem
export const getCandidateStashExcelTemplateDownload: () => CandidateStashExcelTemplateDownload = dashboardRequests.getCandidateStashExcelTemplateDownload
export const uploadCandidateStashExcel: (file: File, params: CompanyMutationScopeParams) => Promise<CandidateStashExcelUploadResult> = dashboardRequests.uploadCandidateStashExcel

export const dashboardApi: DashboardApi = dashboardRequests
