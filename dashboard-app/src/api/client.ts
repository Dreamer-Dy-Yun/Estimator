import type { CompetitorSalesRow, SelfSalesRow } from '../types'
import { mockDashboardApi } from './mock'
import type {
  AppendCandidateItemPayload,
  UpdateCandidateItemPayload,
  CandidateItemDetail,
  CandidateItemSummary,
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
  SelfSalesFilterMeta,
  SelfSalesParams,
} from './types'

/** 자사 판매 원천 행. 화면에서 임의 재계산하지 말고 필터/정렬만 담당한다. */
export async function getSelfSales(params?: SelfSalesParams): Promise<SelfSalesRow[]> {
  return mockDashboardApi.getSelfSales(params)
}

/** 경쟁사 판매 원천 행. competitorChannelId가 들어오면 채널별 가격/수량 차이가 반영된다. */
export async function getCompetitorSales(params?: CompetitorSalesParams): Promise<CompetitorSalesRow[]> {
  return mockDashboardApi.getCompetitorSales(params)
}

/** 자사 판매 필터 옵션. 목록 화면의 필터 메타 전용이며 상품 상세/스냅샷 데이터와 섞지 않는다. */
export async function getSelfSalesFilterMeta(): Promise<SelfSalesFilterMeta> {
  return mockDashboardApi.getSelfSalesFilterMeta()
}

/**
 * 상품 1차 드로어 묶음 데이터.
 * 월별 요약/기본 드로어 표시용이므로 기간·채널 민감한 판매 인사이트를 여기로 끌어오지 않는다.
 */
export async function getProductDrawerBundle(
  id: string,
  params?: ProductDrawerBundleParams,
): Promise<ProductDrawerBundle> {
  return mockDashboardApi.getProductDrawerBundle(id, params)
}

/**
 * 상품 판매 인사이트.
 * 기간과 경쟁 채널에 따라 판매량·판매액·순위가 달라지는 무거운 계약이라 drawer bundle과 분리한다.
 */
async function getProductSalesInsight(
  id: string,
  params: ProductSalesInsightParams,
): Promise<ProductSalesInsight> {
  return mockDashboardApi.getProductSalesInsight(id, params)
}

/** 2차 드로어 기본 상세. 저장된 스냅샷이 있으면 화면은 스냅샷 값을 우선 존중한다. */
async function getProductSecondaryDetail(
  id: string,
  params?: ProductSecondaryDetailParams,
): Promise<ProductSecondaryDetail> {
  return mockDashboardApi.getProductSecondaryDetail(id, params)
}

/** 2차 판매 추이 차트 데이터. 기간/예측 개월 조건에 민감하므로 호출부에서 stale 응답을 방지해야 한다. */
async function getSecondaryDailyTrend(
  params: SecondaryDailyTrendParams,
): Promise<SecondaryDailyTrendPoint[]> {
  return mockDashboardApi.getSecondaryDailyTrend(params)
}

/** 2차 드로어 경쟁 채널 옵션. 현재 mock은 크림/무신사/네이버 채널 차이를 만들어 반환한다. */
export async function getSecondaryCompetitorChannels(): Promise<SecondaryCompetitorChannel[]> {
  return mockDashboardApi.getSecondaryCompetitorChannels()
}

/** 후보군 목록. productId 필터가 있으면 해당 상품 기준 후보군만 반환한다. */
export async function getCandidateStashes(productId?: string): Promise<CandidateStashSummary[]> {
  return mockDashboardApi.getCandidateStashes(productId)
}

/**
 * 후보군의 이너 오더 목록.
 * 반환 행은 저장된 스냅샷 기반이며 자사/경쟁사 기간 총 판매량과 추천 배지는 백엔드 계약 값으로 본다.
 */
export async function getCandidateItemsByStash(stashUuid: string): Promise<CandidateItemSummary[]> {
  return mockDashboardApi.getCandidateItemsByStash(stashUuid)
}

/** 단일 후보 아이템 상세. 2차 드로어 재오픈 시 저장된 스냅샷을 복원하는 진입점이다. */
export async function getCandidateItemByUuid(itemUuid: string): Promise<CandidateItemDetail | null> {
  return mockDashboardApi.getCandidateItemByUuid(itemUuid)
}

/** 후보 아이템 삭제. 상세 모달은 삭제 후 목록과 후보군 요약을 다시 불러와 동기화한다. */
export async function deleteCandidateItem(itemUuid: string): Promise<void> {
  return mockDashboardApi.deleteCandidateItem(itemUuid)
}

/** 후보군 삭제. 내부 후보 아이템까지 함께 제거되는 백엔드 트랜잭션 성격의 API다. */
export async function deleteCandidateStash(stashUuid: string): Promise<void> {
  return mockDashboardApi.deleteCandidateStash(stashUuid)
}

/** 후보군 생성. 생성 후 화면은 응답을 낙관 삽입하지 않고 목록을 다시 조회하는 흐름을 우선한다. */
async function createCandidateStash(
  payload: CreateCandidateStashPayload,
): Promise<CandidateStashSummary> {
  return mockDashboardApi.createCandidateStash(payload)
}

/** 후보군 복제. 스냅샷 기반 이너 아이템까지 복제되므로 이후 목록 재조회가 필요하다. */
export async function duplicateCandidateStash(stashUuid: string): Promise<void> {
  return mockDashboardApi.duplicateCandidateStash(stashUuid)
}

/** 후보군 메타 수정. 이름/비고만 바꾸며 이너 오더 스냅샷은 건드리지 않는다. */
export async function updateCandidateStash(
  payload: UpdateCandidateStashPayload,
): Promise<CandidateStashSummary> {
  return mockDashboardApi.updateCandidateStash(payload)
}

/**
 * 후보군에 이너 오더 스냅샷 추가.
 * 새 스냅샷은 아직 LLM 코멘트가 최신이 아니므로 호출부가 isLatestLlmComment=false를 반드시 명시한다.
 */
async function appendCandidateItem(
  payload: AppendCandidateItemPayload,
): Promise<void> {
  return mockDashboardApi.appendCandidateItem(payload)
}

/**
 * 후보 아이템 스냅샷 갱신.
 * 수치 저장으로 스냅샷이 바뀌면 기존 LLM 코멘트는 낡으므로 isLatestLlmComment=false를 함께 보낸다.
 */
async function updateCandidateItem(payload: UpdateCandidateItemPayload): Promise<void> {
  return mockDashboardApi.updateCandidateItem(payload)
}

/**
 * Backend integration note:
 * - Send the Excel file as multipart/form-data using the field name `file`.
 * - The frontend must not parse the Excel file or create candidate objects locally.
 * - The backend validates required columns and optional helper columns, then creates the
 *   candidate stash and items in a DB transaction.
 * - On success, the UI reloads `getCandidateStashes()` instead of inserting the response
 *   into local state, so the displayed list stays DB-synchronized.
 * - Recommended validation:
 *   required: productCode or skuUuid, orderQty or size-level confirmed quantity columns.
 *   optional: brand, productName, memo, expectedInboundDate, channel, unitPrice, unitCost,
 *   feeRate, size columns.
 * - Validation failure should return a clear API error without partially saving stash/items.
 */
export async function uploadCandidateStashExcel(file: File): Promise<CandidateStashExcelUploadResult> {
  return mockDashboardApi.uploadCandidateStashExcel(file)
}

/**
 * 후보군 LLM 스냅샷 분석 시작.
 * 상세 모달이 열릴 때 호출하며, 실제 LLM 호출/DB 저장은 백엔드가 맡는다.
 */
export async function startCandidateStashAnalysis(stashUuid: string): Promise<CandidateStashAnalysisStartResult> {
  return mockDashboardApi.startCandidateStashAnalysis(stashUuid)
}

/**
 * 후보군 LLM 분석 SSE 구독.
 * 이너 오더 창이 열려 있는 동안만 연결하고 completed/failed 또는 언마운트 시 구독을 닫는다.
 */
export function subscribeCandidateStashAnalysis(
  jobId: string,
  handlers: CandidateStashAnalysisHandlers,
): CandidateStashAnalysisSubscription {
  return mockDashboardApi.subscribeCandidateStashAnalysis(jobId, handlers)
}

/** 2차 오더 계산. UI 입력값을 기반으로 한 파생 수치이며 저장된 스냅샷 값을 몰래 덮어쓰지 않는다. */
async function getSecondaryStockOrderCalc(
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
