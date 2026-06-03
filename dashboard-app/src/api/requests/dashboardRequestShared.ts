import type { ApiQueryParams } from './httpClient'

export const candidateStashExcelTemplateAsset = 'templates/candidate-stash-upload-template-v0.0.0.xlsx' as const
export const candidateStashExcelTemplateFilename = '(Han.A)Template(ver.0.0.0).xlsx' as const

export function resolvePublicAssetUrl(path: string): string {
  const baseUrl: string = import.meta.env.BASE_URL || '/'
  return `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}${path.replace(/^\/+/, '')}`
}

export function encodePathSegment(value: string): string {
  return encodeURIComponent(value)
}

export function queryParams(params?: object): ApiQueryParams | undefined {
  if (!params) return undefined
  return Object.fromEntries(Object.entries(params)) as ApiQueryParams
}
