import type { ApiQueryParams } from './httpClient'

const candidateStashExcelTemplateAssets: Record<string, string> = import.meta.glob('../../../public/templates/*.xlsx', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>
const candidateStashExcelTemplateFilenamePattern: RegExp = /^\(Han\.A\)Template\(ver\.(\d+(?:\.\d+)*)\)\.xlsx$/u

export type CandidateStashExcelTemplateAsset = {
  asset: string
  filename: string
}

export function parseCandidateStashExcelTemplateVersion(filename: string): number[] {
  const match: RegExpExecArray | null = candidateStashExcelTemplateFilenamePattern.exec(filename)
  if (match == null) return []
  return match[1]!.split('.').map((part: string) : number => Number(part))
}

export function compareCandidateStashExcelTemplateVersion(left: number[], right: number[]): number {
  const length: number = Math.max(left.length, right.length)
  for (let index: number = 0; index < length; index += 1) {
    const leftValue: number = left[index] ?? 0
    const rightValue: number = right[index] ?? 0
    if (leftValue !== rightValue) return leftValue - rightValue
  }
  return 0
}

function fileNameFromTemplatePath(path: string): string {
  return path.split('/').pop() ?? ''
}

export function selectCandidateStashExcelTemplateAsset(assets: Record<string, string>): CandidateStashExcelTemplateAsset {
  const candidates: CandidateStashExcelTemplateAsset[] = Object.entries(assets)
    .map(([path, asset]: [string, string]) : CandidateStashExcelTemplateAsset => {
      const filename: string = fileNameFromTemplatePath(path)
      return {
        asset,
        filename,
      }
    })
    .filter((candidate: CandidateStashExcelTemplateAsset) : boolean => candidateStashExcelTemplateFilenamePattern.test(candidate.filename))
    .sort((left: CandidateStashExcelTemplateAsset, right: CandidateStashExcelTemplateAsset) : number => compareCandidateStashExcelTemplateVersion(
      parseCandidateStashExcelTemplateVersion(right.filename),
      parseCandidateStashExcelTemplateVersion(left.filename),
    ))
  const selected: CandidateStashExcelTemplateAsset | undefined = candidates[0]
  if (selected == null) throw new Error('Candidate stash Excel template asset was not found.')
  return selected
}

function resolveCandidateStashExcelTemplateAsset(): CandidateStashExcelTemplateAsset {
  return selectCandidateStashExcelTemplateAsset(candidateStashExcelTemplateAssets)
}

export const candidateStashExcelTemplate: CandidateStashExcelTemplateAsset = resolveCandidateStashExcelTemplateAsset()
export const candidateStashExcelTemplateAsset: string = candidateStashExcelTemplate.asset
export const candidateStashExcelTemplateFilename: string = candidateStashExcelTemplate.filename

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
