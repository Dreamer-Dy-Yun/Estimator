import { getCompanyUuidForOptionalScope } from './company'

export type ComparisonSubjectKind = 'competitor-channel' | 'self-company'
export type ComparisonSubjectRole = 'base' | 'comparison'

export interface ComparisonBaseSubjectRef {
  role: 'base'
  kind: 'self-company'
  sourceId?: string
}

export type ComparisonComparisonSubjectRef =
  | {
    role: 'comparison'
    kind: 'competitor-channel'
    sourceId: string
  }
  | {
    role: 'comparison'
    kind: 'self-company'
    sourceId?: string
  }

export type ComparisonSubjectRef = ComparisonBaseSubjectRef | ComparisonComparisonSubjectRef

export type ComparisonSubject<TSubject extends ComparisonSubjectRef = ComparisonSubjectRef> =
  TSubject & {
    id: string
    label: string
  }

export type ComparisonBaseSubject = ComparisonSubject<ComparisonBaseSubjectRef>
export type ComparisonComparisonSubject = ComparisonSubject<ComparisonComparisonSubjectRef>
export type ComparisonTargetKind = ComparisonSubjectKind
export type ComparisonTarget = ComparisonComparisonSubject

export function getComparisonSubjectSourceIdForContract(subject: ComparisonSubjectRef): string | undefined {
  return subject.kind === 'self-company'
    ? getCompanyUuidForOptionalScope(subject.sourceId)
    : subject.sourceId
}

export function getComparisonSubjectKey(subject: ComparisonSubjectRef): string {
  return `${subject.role}:${subject.kind}:${getComparisonSubjectSourceIdForContract(subject) ?? 'all'}`
}
