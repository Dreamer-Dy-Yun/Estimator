import type { CandidateBadge } from '../types'

export const INNER_ORDER_TOP_PERCENT_THRESHOLD = 10 as const
export const INNER_ORDER_BOTTOM_PERCENT_THRESHOLD = 10 as const

const CANDIDATE_BADGES_BY_NAME: Record<string, CandidateBadge> = {
  크림판매: {
    name: '크림판매',
    color: '#0f766e',
    tooltip: `조회 기간 내 크림 경쟁사 판매수량 상위 ${INNER_ORDER_TOP_PERCENT_THRESHOLD}% 이내 후보입니다.`,
  },
  자사이익: {
    name: '자사이익',
    color: '#be123c',
    tooltip: '조회 기간 내 자사 영업이익률이 9% 이상인 후보입니다.',
  },
  자사판매: {
    name: '자사판매',
    color: '#c2410c',
    tooltip: `조회 기간 내 자사 판매수량 상위 ${INNER_ORDER_TOP_PERCENT_THRESHOLD}% 이내 후보입니다.`,
  },
}

export function isTopCandidatePercent(rankPercentile: number | null | undefined) : boolean {
  return typeof rankPercentile === 'number' && rankPercentile >= 100 - INNER_ORDER_TOP_PERCENT_THRESHOLD
}

export function isBottomCandidatePercent(rankPercentile: number | null | undefined) : boolean {
  return typeof rankPercentile === 'number' && rankPercentile <= INNER_ORDER_BOTTOM_PERCENT_THRESHOLD
}

export function buildCandidateBadges(names: string[]): CandidateBadge[] {
  return names.flatMap((name: string) : CandidateBadge[] => {
    const badge: CandidateBadge = CANDIDATE_BADGES_BY_NAME[name]
    return badge ? [badge] : []
  })
}
