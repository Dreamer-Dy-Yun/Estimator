export interface CompanySummary {
  uuid: string
  name: string
}

export const ALL_COMPANY_UUID = '00000000-0000-4000-8000-000000000100'

export interface CompanyScopeParams {
  /**
   * Selected COMPANY.uuid.
   * Omit this value, pass an empty value, or pass ALL_COMPANY_UUID to request all companies.
   */
  companyUuid?: string | undefined
}

export function getCompanyUuidForOptionalScope(
  companyUuid: string | null | undefined,
): string | undefined {
  const normalizedCompanyUuid = companyUuid?.trim()
  if (!normalizedCompanyUuid || normalizedCompanyUuid === ALL_COMPANY_UUID) return undefined
  return normalizedCompanyUuid
}

export function isAllCompanyScope(companyUuid: string | null | undefined): boolean {
  return getCompanyUuidForOptionalScope(companyUuid) == null
}

export function isAllCompanyUuid(companyUuid: string | null | undefined): boolean {
  return isAllCompanyScope(companyUuid)
}

export function normalizeCompanyScopeParams<T extends CompanyScopeParams>(
  params?: T,
): T | undefined {
  if (!params) return undefined
  const companyUuid = getCompanyUuidForOptionalScope(params.companyUuid)
  return {
    ...params,
    companyUuid,
  }
}

export interface CompanyApi {
  getCompanies(): Promise<CompanySummary[]>
}
