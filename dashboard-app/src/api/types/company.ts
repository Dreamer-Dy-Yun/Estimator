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

export interface CompanyMutationScopeParams {
  /**
   * Selected COMPANY.uuid for write/job endpoints.
   * Mutation and side-effect job calls must target one concrete company.
   */
  companyUuid: string
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

export function getRequiredCompanyUuidForMutationScope(
  companyUuid: string | null | undefined,
): string {
  const normalizedCompanyUuid = companyUuid?.trim()
  if (!normalizedCompanyUuid || normalizedCompanyUuid === ALL_COMPANY_UUID) {
    throw new Error('Mutation, job, and SSE requests require a single company scope.')
  }
  return normalizedCompanyUuid
}

export function normalizeCompanyMutationScopeParams<T extends Partial<CompanyMutationScopeParams>>(
  params?: T | null,
): T {
  if (!params) {
    throw new Error('Mutation, job, and SSE requests require a single company scope.')
  }
  return {
    ...params,
    companyUuid: getRequiredCompanyUuidForMutationScope(params.companyUuid),
  } as T
}

export function normalizeCompanyScopeParams<T extends CompanyScopeParams>(
  params?: T,
): T | undefined {
  if (!params) return undefined
  const companyUuid = getCompanyUuidForOptionalScope(params.companyUuid)
  const rest = { ...params }
  delete rest.companyUuid
  if (!companyUuid) return rest as T
  return {
    ...rest,
    companyUuid,
  } as T
}

export interface CompanyApi {
  getCompanies(): Promise<CompanySummary[]>
}
