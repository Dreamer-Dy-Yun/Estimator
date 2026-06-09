import type { ProductSecondarySizeRow } from '../../types'
import type {
  CompetitorSalesRow,
  MonthlySalesPoint,
  ProductPrimarySummary,
  ProductSecondaryDetail,
  SelfSalesRow,
} from '../../types'
import {
  ALL_COMPANY_UUID,
  getCompanyUuidForOptionalScope,
  type CompanyScopeParams,
  type CompanySummary,
} from '../types'

export const MOCK_HANA_COMPANY_UUID = '00000000-0000-4000-8000-000000000101' as const
export const MOCK_T1_COMPANY_UUID = '00000000-0000-4000-8000-000000000102' as const

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
  'Mock mutation requires an explicit single companyUuid.' as const

function resolveCompanyUuid(input?: CompanyScopeInput): string | undefined {
  return getCompanyUuidForOptionalScope(typeof input === 'string' || input == null ? input : input.companyUuid)
}

function getRawCompanyUuid(input?: CompanyScopeInput): string | null | undefined {
  return typeof input === 'string' || input == null ? input : input.companyUuid
}

function skuSeed(skuGroupKey: string): number {
  return [...skuGroupKey].reduce((sum: number, ch: string) : number => sum + ch.charCodeAt(0), 0)
}

function hanaShare(skuGroupKey: string): number {
  if (skuGroupKey.startsWith('TEST-TOP__')) return 0.5
  return 0.55 + (skuSeed(skuGroupKey) % 9) * 0.025
}

export function getMockCompanyScale(input: CompanyScopeInput, skuGroupKey: string): number {
  const companyUuid: string | undefined = resolveCompanyUuid(input)
  if (!companyUuid) return 1
  const hana: number = hanaShare(skuGroupKey)
  if (companyUuid === MOCK_HANA_COMPANY_UUID) return hana
  if (companyUuid === MOCK_T1_COMPANY_UUID) return 1 - hana
  return 0
}

export function getMockMutationCompanyUuid(input: CompanyScopeInput): string {
  const rawCompanyUuid: string | null | undefined = getRawCompanyUuid(input)
  const companyUuid: string | undefined = getCompanyUuidForOptionalScope(rawCompanyUuid)
  if (!companyUuid) {
    throw new Error(MOCK_SINGLE_COMPANY_SCOPE_REQUIRED_MESSAGE)
  }
  return companyUuid
}

export function isMockRecordInCompanyScope(recordCompanyUuid: string, input?: CompanyScopeInput): boolean {
  const companyUuid: string | undefined = resolveCompanyUuid(input)
  return !companyUuid || recordCompanyUuid === companyUuid
}

function scaleCount(value: number, scale: number): number {
  return Math.max(0, Math.round(value * scale))
}

function scaleNullableCount(value: number | null, scale: number): number | null {
  return value == null ? null : scaleCount(value, scale)
}

function scopeMonthlySalesTrend(
  points: MonthlySalesPoint[] | undefined,
  scale: number,
): MonthlySalesPoint[] | undefined {
  return points?.map((point: MonthlySalesPoint) : { sales: number; date: string; isForecast: boolean; } => ({
    ...point,
    sales: scaleCount(point.sales, scale),
  }))
}

export function scopeMockSelfSalesRow(row: SelfSalesRow, input?: CompanyScopeInput): SelfSalesRow | null {
  const scale: number = getMockCompanyScale(input, row.skuGroupKey)
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
  const scale: number = getMockCompanyScale(input, row.skuGroupKey)
  if (scale <= 0) return null
  return {
    ...row,
    competitorQty: scaleCount(row.competitorQty, scale),
    competitorAmount: scaleCount(row.competitorAmount, scale),
    selfQty: scaleNullableCount(row.selfQty, scale),
    selfAmount: scaleNullableCount(row.selfAmount, scale),
  }
}


export function scopeMockProductPrimary(
  primary: ProductPrimarySummary,
  input?: CompanyScopeInput,
): ProductPrimarySummary {
  const scale: number = getMockCompanyScale(input, primary.skuGroupKey)
  if (scale <= 0) throw new Error(`Mock product is outside selected company scope: ${primary.skuGroupKey}`)
  return {
    ...primary,
    qty: scaleCount(primary.qty, scale),
    availableStock: scaleCount(primary.availableStock, scale),
    monthlySalesTrend: scopeMonthlySalesTrend(primary.monthlySalesTrend, scale),
  }
}

export function scopeMockProductSecondary(
  secondary: ProductSecondaryDetail,
  input?: CompanyScopeInput,
): ProductSecondaryDetail {
  const scale: number = getMockCompanyScale(input, secondary.skuGroupKey)
  if (scale <= 0) throw new Error(`Mock secondary product is outside selected company scope: ${secondary.skuGroupKey}`)
  return {
    ...secondary,
    comparisonQty: scaleCount(secondary.comparisonQty, scale),
    sizeRows: secondary.sizeRows.map((row: ProductSecondarySizeRow) : { confirmedQty: number; qty: number; availableStock: number; size: string; selfRatio: number; avgPrice: number; } => ({
      ...row,
      confirmedQty: scaleCount(row.confirmedQty, scale),
      qty: scaleCount(row.qty, scale),
      availableStock: scaleCount(row.availableStock, scale),
    })),
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
  const scale: number = getMockCompanyScale(input, skuGroupKey)
  if (scale <= 0) throw new Error(`Mock stock trend is outside selected company scope: ${skuGroupKey}`)
  return trend.map((point: T) : T & { stock: number; inboundExpected: number; inboundQty: number; } => ({
    ...point,
    stock: scaleCount(point.stock, scale),
    inboundExpected: scaleCount(point.inboundExpected, scale),
    inboundQty: scaleCount(point.inboundQty, scale),
  }))
}
