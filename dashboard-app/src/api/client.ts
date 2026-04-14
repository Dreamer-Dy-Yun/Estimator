import type { CompetitorSalesRow, OrderPlanRow, SelfSalesRow } from '../types'
import { mockDashboardApi } from './mock'
import type {
  DashboardApi,
  ProductSummaryBundle,
  SelfSalesFilterMeta,
  SelfSalesParams,
} from './types'

export async function getSelfSales(params?: SelfSalesParams): Promise<SelfSalesRow[]> {
  return mockDashboardApi.getSelfSales(params)
}

export async function getCompetitorSales(): Promise<CompetitorSalesRow[]> {
  return mockDashboardApi.getCompetitorSales()
}

export async function getOrderPlan(): Promise<OrderPlanRow[]> {
  return mockDashboardApi.getOrderPlan()
}

export async function getSelfSalesFilterMeta(): Promise<SelfSalesFilterMeta> {
  return mockDashboardApi.getSelfSalesFilterMeta()
}

export async function getProductSummaryBundle(id: string): Promise<ProductSummaryBundle> {
  return mockDashboardApi.getProductSummaryBundle(id)
}

/** 화면·훅에서 한 객체로 주입하거나 테스트 목으로 교체할 때 사용 */
export const dashboardApi: DashboardApi = {
  getSelfSales,
  getCompetitorSales,
  getOrderPlan,
  getSelfSalesFilterMeta,
  getProductSummaryBundle,
}
