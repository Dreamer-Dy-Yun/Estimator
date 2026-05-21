import type {
  CompetitorSalesRow,
  MonthlySalesPoint,
  ProductPrimarySummary,
  ProductSecondaryDetail,
  ProductSizeMixRow,
  SelfSalesRow,
} from '../../types'
import {
  ALL_COMPANY_UUID,
  getCompanyUuidForOptionalScope,
  type CompanyScopeParams,
  type CompanySummary,
} from '../types'

export const MOCK_HANA_COMPANY_UUID = '00000000-0000-4000-8000-000000000101'
export const MOCK_T1_COMPANY_UUID = '00000000-0000-4000-8000-000000000102'

export const MOCK_COMPANIES: CompanySummary[] = [
  {
    uuid: ALL_COMPANY_UUID,
    name: '\uC804\uCCB4',
  },
  {
    uuid: MOCK_HANA_COMPANY_UUID,
    name: '\uD55C\uC544INT',
  },
  {
    uuid: MOCK_T1_COMPANY_UUID,
    name: 'T1\uAE00\uB85C\uBC8C',
  },
]

type CompanyScopeInput = CompanyScopeParams | string | null | undefined

export const MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE =
  'Mock mutation requires an explicit single companyUuid.'

function resolveCompanyUuid(input?: CompanyScopeInput): string | undefined {
  return getCompanyUuidForOptionalScope(typeof input === 'string' || input == null ? input : input.companyUuid)
}

function getRawCompanyUuid(input?: CompanyScopeInput): string | null | undefined {
  return typeof input === 'string' || input == null ? input : input.companyUuid
}

function skuSeed(skuGroupKey: string): number {
  return [...skuGroupKey].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
}

function hanaShare(skuGroupKey: string): number {
  return 0.55 + (skuSeed(skuGroupKey) % 9) * 0.025
}

export function getMockCompanyScale(input: CompanyScopeInput, skuGroupKey: string): number {
  const companyUuid = resolveCompanyUuid(input)
  if (!companyUuid) return 1
  const hana = hanaShare(skuGroupKey)
  if (companyUuid === MOCK_HANA_COMPANY_UUID) return hana
  if (companyUuid === MOCK_T1_COMPANY_UUID) return 1 - hana
  return 0
}

export function getMockMutationCompanyUuid(input: CompanyScopeInput): string {
  const rawCompanyUuid = getRawCompanyUuid(input)
  const companyUuid = getCompanyUuidForOptionalScope(rawCompanyUuid)
  if (!companyUuid) {
    throw new Error(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
  }
  return companyUuid
}

export function isMockRecordInCompanyScope(recordCompanyUuid: string, input?: CompanyScopeInput): boolean {
  const companyUuid = resolveCompanyUuid(input)
  return !companyUuid || recordCompanyUuid === companyUuid
}

function scaleCount(value: number, scale: number): number {
  return Math.max(0, Math.round(value * scale))
}

function scaleNullableCount(value: number | null, scale: number): number | null {
  return value == null ? null : scaleCount(value, scale)
}

export function scopeMockSelfSalesRow(row: SelfSalesRow, input?: CompanyScopeInput): SelfSalesRow | null {
  const scale = getMockCompanyScale(input, row.skuGroupKey)
  if (scale <= 0) return null
  return {
    ...row,
    qty: scaleCount(row.qty, scale),
    amount: scaleCount(row.amount, scale),
    opMarginAmount: scaleCount(row.opMarginAmount, scale),
  }
}

export function scopeMockCompetitorSalesRow(
  row: CompetitorSalesRow,
  input?: CompanyScopeInput,
): CompetitorSalesRow | null {
  const scale = getMockCompanyScale(input, row.skuGroupKey)
  if (scale <= 0) return null
  return {
    ...row,
    competitorQty: scaleCount(row.competitorQty, scale),
    competitorAmount: scaleCount(row.competitorAmount, scale),
    selfQty: scaleNullableCount(row.selfQty, scale),
    selfAmount: scaleNullableCount(row.selfAmount, scale),
  }
}

function scopeMonthlySalesTrend(
  points: MonthlySalesPoint[] | undefined,
  scale: number,
): MonthlySalesPoint[] | undefined {
  return points?.map((point) => ({
    ...point,
    sales: scaleCount(point.sales, scale),
  }))
}

function scopeSizeMix(rows: ProductSizeMixRow[], scale: number): ProductSizeMixRow[] {
  return rows.map((row) => ({
    ...row,
    confirmedQty: scaleCount(row.confirmedQty, scale),
    qty: scaleCount(row.qty, scale),
    availableStock: scaleCount(row.availableStock, scale),
  }))
}

export function scopeMockProductPrimary(
  primary: ProductPrimarySummary,
  input?: CompanyScopeInput,
): ProductPrimarySummary {
  const scale = getMockCompanyScale(input, primary.skuGroupKey)
  if (scale <= 0) throw new Error(`Mock product is outside selected company scope: ${primary.skuGroupKey}`)
  return {
    ...primary,
    qty: scaleCount(primary.qty, scale),
    availableStock: scaleCount(primary.availableStock, scale),
    recommendedOrderQty: scaleCount(primary.recommendedOrderQty, scale),
    monthlySalesTrend: scopeMonthlySalesTrend(primary.monthlySalesTrend, scale),
    sizeMix: scopeSizeMix(primary.sizeMix, scale),
  }
}

export function scopeMockProductSecondary(
  secondary: ProductSecondaryDetail,
  input?: CompanyScopeInput,
): ProductSecondaryDetail {
  const scale = getMockCompanyScale(input, secondary.skuGroupKey)
  if (scale <= 0) throw new Error(`Mock secondary product is outside selected company scope: ${secondary.skuGroupKey}`)
  return {
    ...secondary,
    competitorQty: scaleCount(secondary.competitorQty, scale),
  }
}

export function scopeMockStockTrend<T extends {
  date: string
  stock: number
  inboundExpected: number
  inboundQty: number
}>(
  skuGroupKey: string,
  trend: T[],
  input?: CompanyScopeInput,
): T[] {
  const scale = getMockCompanyScale(input, skuGroupKey)
  if (scale <= 0) throw new Error(`Mock stock trend is outside selected company scope: ${skuGroupKey}`)
  return trend.map((point) => ({
    ...point,
    stock: scaleCount(point.stock, scale),
    inboundExpected: scaleCount(point.inboundExpected, scale),
    inboundQty: scaleCount(point.inboundQty, scale),
  }))
}
