import { isAllCompanyUuid, type CompanySummary } from '../../api'
import { useAuth } from '../../auth/AuthContext'

const FALLBACK_SELF_COMPANY_LABEL = '자사' as const
const ALL_SELF_COMPANY_LABEL = '자사 전체' as const

export function getCompanyOptionLabel(company: CompanySummary) : string {
  if (isAllCompanyUuid(company.uuid)) return ALL_SELF_COMPANY_LABEL
  return company.name.trim() || company.uuid
}

export function getSelfCompanyLabel({
  selectedCompany,
  selectedCompanyUuid,
}: {
  selectedCompany: CompanySummary | null
  selectedCompanyUuid: string | null
}) : string {
  if (isAllCompanyUuid(selectedCompanyUuid)) return ALL_SELF_COMPANY_LABEL
  return selectedCompany?.name.trim() || FALLBACK_SELF_COMPANY_LABEL
}

export function useSelfCompanyLabel() : string {
  const { selectedCompany, selectedCompanyUuid }: ReturnType<typeof useAuth> = useAuth()
  return getSelfCompanyLabel({ selectedCompany, selectedCompanyUuid })
}
