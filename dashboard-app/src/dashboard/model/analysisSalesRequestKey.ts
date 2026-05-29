import type { CompetitorSalesParams, SelfSalesParams } from '../../api/types'

export function buildAnalysisSalesRequestKey(params: SelfSalesParams | CompetitorSalesParams): string {
  return JSON.stringify({
    startDate: params.startDate ?? '',
    endDate: params.endDate ?? '',
    brand: params.brand ?? '',
    category: params.category ?? '',
    codeQuery: params.codeQuery ?? '',
    nameQuery: params.nameQuery ?? '',
    colorCode: params.colorCode ?? '',
    companyUuid: params.companyUuid ?? '',
    competitorChannelId: 'competitorChannelId' in params ? params.competitorChannelId ?? '' : '',
  })
}
