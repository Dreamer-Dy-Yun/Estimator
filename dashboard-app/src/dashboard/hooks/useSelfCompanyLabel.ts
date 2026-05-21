import { isAllCompanyUuid, type CompanySummary } from '../../api'
import { useAuth } from '../../auth/AuthContext'

const FALLBACK_SELF_COMPANY_LABEL = '자사'
const ALL_SELF_COMPANY_LABEL = '자사 전체'

export function getCompanyOptionLabel(company: CompanySummary) {
  if (isAllCompanyUuid(company.uuid)) return ALL_SELF_COMPANY_LABEL
  return company.name.trim() || company.uuid
}

export function getSelfCompanyLabel({
  selectedCompany,
  selectedCompanyUuid,
}: {
  selectedCompany: CompanySummary | null
  selectedCompanyUuid: string | null
}) {
  if (isAllCompanyUuid(selectedCompanyUuid)) return ALL_SELF_COMPANY_LABEL
  return selectedCompany?.name.trim() || FALLBACK_SELF_COMPANY_LABEL
}

export function useSelfCompanyLabel() {
  const { selectedCompany, selectedCompanyUuid } = useAuth()
  return getSelfCompanyLabel({ selectedCompany, selectedCompanyUuid })
}
