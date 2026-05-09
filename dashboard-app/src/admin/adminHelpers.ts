import type {
  AdminGptKeyPurpose,
  AdminGptKeyTestStatus,
  AuthRole,
} from '../api'

export const ROLE_OPTIONS: Array<{ value: AuthRole; label: string }> = [
  { value: 'admin', label: '관리자' },
  { value: 'user', label: '사용자' },
]

export const GPT_KEY_PURPOSE_OPTIONS: Array<{ value: AdminGptKeyPurpose; label: string }> = [
  { value: 'ai-comment', label: 'AI 코멘트' },
  { value: 'candidate-recommendation', label: '후보 추천' },
  { value: 'test', label: '연결 테스트' },
  { value: 'all', label: '전체' },
]

export const gptKeyTestStatusLabels: Record<AdminGptKeyTestStatus, string> = {
  untested: '미테스트',
  success: '성공',
  failed: '실패',
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '관리자 정보를 처리하는 중 오류가 발생했습니다.'
}

export function formatUpdatedAt(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
