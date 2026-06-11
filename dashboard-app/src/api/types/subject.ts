import { getCompanyUuidForOptionalScope } from './company'

export type ComparisonSubjectKind = 'competitor-channel' | 'self-company'
export type ComparisonSubjectRole = 'base' | 'comparison'

/** API subject reference for the base position. kind selects the source domain; sourceId identifies that domain when required. */
export interface ComparisonBaseSubjectRef {
  role: 'base'
  kind: 'self-company'
  sourceId?: string
}

/** API subject reference for the comparison position. The backend must validate kind/sourceId and must not infer a fallback. */
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

/** Normalizes optional/all-company self-company source to omitted wire sourceId; never chooses fallback subjects. */
export function getComparisonSubjectSourceIdForContract(subject: ComparisonSubjectRef): string | undefined {
  return subject.kind === 'self-company'
    ? getCompanyUuidForOptionalScope(subject.sourceId)
    : subject.sourceId
}

export function getComparisonSubjectKey(subject: ComparisonSubjectRef): string {
  return `${subject.role}:${subject.kind}:${getComparisonSubjectSourceIdForContract(subject) ?? 'all'}`
}
