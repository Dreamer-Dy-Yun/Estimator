import type {
  ProductComparisonComparisonSubjectRef,
  ProductComparisonSubjectRef,
  ProductPrimarySummary,
  ProductSecondaryDetail,
  ProductSecondaryDetailParams,
} from '../types'
import { getCompanyUuidForOptionalScope, getComparisonSubjectKey } from '../types'
import {
  scopeMockProductPrimary,
  scopeMockProductSecondary,
} from './mockCompanyScope'
import { requireMockProductPrimary, requireMockProductSecondary } from './mockProductLookup'
import { getMockSecondaryCompetitorChannel, type MockSecondaryCompetitorChannel } from './salesTables'
import { sleep } from './utils'

type ProductSecondarySizeRow = ProductSecondaryDetail['sizeRows'][number]

function selfCompanySubjectScope(subject: ProductComparisonSubjectRef): { companyUuid?: string } {
  if (subject.kind !== 'self-company') throw new Error(`Unsupported mock base subject kind: ${subject.kind}`)
  return getCompanyUuidForOptionalScope(subject.sourceId) == null ? {} : { companyUuid: subject.sourceId }
}

function requireMockProductComparisonTarget(target: ProductComparisonComparisonSubjectRef | null | undefined): ProductComparisonComparisonSubjectRef {
  if (target == null) throw new Error('Product comparison target is required.')
  if (target.kind === 'competitor-channel' && !target.sourceId) {
    throw new Error('comparison.sourceId is required for competitor-channel.')
  }
  return target
}

function comparisonRatioBySizeFromRows(detail: ProductSecondaryDetail): ProductSecondaryDetail['comparisonRatioBySize'] {
  const total: number = detail.sizeRows.reduce((sum: number, row: ProductSecondarySizeRow) : number => sum + Math.max(0, row.selfRatio), 0)
  if (total <= 0) return Object.fromEntries(detail.sizeRows.map((row: ProductSecondarySizeRow) : [string, number] => [row.size, 0]))
  return Object.fromEntries(detail.sizeRows.map((row: ProductSecondarySizeRow) : [string, number] => [row.size, Math.max(0, row.selfRatio) / total]))
}

function comparisonSubjectSizeSeed(subject: ProductComparisonComparisonSubjectRef): number {
  return getComparisonSubjectKey(subject).split('').reduce((sum: number, ch: string, index: number) : number => sum + ch.charCodeAt(0) * (index + 1), 0)
}

function skewComparisonRatioBySize(
  ratioBySize: ProductSecondaryDetail['comparisonRatioBySize'],
  subject: ProductComparisonComparisonSubjectRef,
): ProductSecondaryDetail['comparisonRatioBySize'] {
  const entries: [string, number][] = Object.entries(ratioBySize)
  if (entries.length === 0) return ratioBySize

  const seed: number = comparisonSubjectSizeSeed(subject)
  const midpoint: number = (entries.length - 1) / 2
  const directionalSkew: number = ((seed % 7) - 3) / 12
  const waveSkew: number = ((Math.floor(seed / 7) % 5) - 2) / 10
  const weighted: [string, number][] = entries.map(([size, ratio]: [string, number], index: number) : [string, number] => {
    const position: number = midpoint === 0 ? 0 : (index - midpoint) / midpoint
    const wave: number = Math.sin(seed + index * 1.7)
    return [size, Math.max(0, ratio) * Math.max(0.2, 1 + position * directionalSkew + wave * waveSkew)]
  })
  const total: number = weighted.reduce((sum: number, [, ratio]: [string, number]) : number => sum + ratio, 0)
  if (total <= 0) return Object.fromEntries(weighted.map(([size]: [string, number]) : [string, number] => [size, 0]))
  return Object.fromEntries(weighted.map(([size, ratio]: [string, number]) : [string, number] => [size, ratio / total]))
}

function buildMockProductSecondaryDetail(
  skuGroupKey: string,
  params: ProductSecondaryDetailParams,
): ProductSecondaryDetail {
  const baseScope: { companyUuid?: string } = selfCompanySubjectScope(params.base)
  const baseSecondary: ProductSecondaryDetail = scopeMockProductSecondary(requireMockProductSecondary(skuGroupKey), baseScope)
  const comparison: ProductComparisonComparisonSubjectRef = requireMockProductComparisonTarget(params.comparison)
  if (comparison.kind === 'competitor-channel') {
    const channel: MockSecondaryCompetitorChannel = getMockSecondaryCompetitorChannel(comparison.sourceId)
    return {
      ...baseSecondary,
      comparisonPrice: Math.max(0, Math.round(baseSecondary.comparisonPrice * channel.priceSkew)),
      comparisonQty: Math.max(0, Math.round(baseSecondary.comparisonQty * channel.qtySkew)),
      comparisonRatioBySize: skewComparisonRatioBySize(baseSecondary.comparisonRatioBySize, comparison),
    }
  }
  const comparisonScope: { companyUuid?: string } = selfCompanySubjectScope(comparison)
  const comparisonPrimary: ProductPrimarySummary = scopeMockProductPrimary(requireMockProductPrimary(skuGroupKey), comparisonScope)
  const comparisonSecondary: ProductSecondaryDetail = scopeMockProductSecondary(requireMockProductSecondary(skuGroupKey), comparisonScope)
  return {
    ...baseSecondary,
    comparisonPrice: comparisonPrimary.price,
    comparisonQty: comparisonPrimary.qty,
    comparisonRatioBySize: skewComparisonRatioBySize(comparisonRatioBySizeFromRows(comparisonSecondary), comparison),
  }
}

export async function getMockProductSecondaryDetail(skuGroupKey: string, params: ProductSecondaryDetailParams): Promise<ProductSecondaryDetail> {
  await sleep(80)
  return buildMockProductSecondaryDetail(skuGroupKey, params)
}
