import type { CompetitorSalesRow, OrderPlanRow, SelfSalesRow } from '../types'
import { mockDashboardApi } from './mock'
import type {
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

export async function getOrderPlan(): Promise<OrderPlanRow[]> {
  return mockDashboardApi.getOrderPlan()
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

export async function getSecondaryStockOrderCalc(
  params: SecondaryStockOrderCalcParams,
): Promise<SecondaryStockOrderCalcResult> {
  return mockDashboardApi.getSecondaryStockOrderCalc(params)
}

/** 화면·훅에서 한 객체로 주입하거나 테스트 목으로 교체할 때 사용 */
export const dashboardApi: DashboardApi = {
  getSelfSales,
  getCompetitorSales,
  getOrderPlan,
  getSelfSalesFilterMeta,
  getProductDrawerBundle,
  getProductSecondaryDetail,
  getSecondaryDailyTrend,
  getSecondaryCompetitorChannels,
  getSecondaryLlmAnswer,
  saveSecondaryOrderSnapshot,
  getSecondaryOrderSnapshots,
  getSecondaryStockOrderCalc,
}
