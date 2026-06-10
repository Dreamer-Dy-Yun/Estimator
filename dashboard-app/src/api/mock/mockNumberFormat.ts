const koNumber: Intl.NumberFormat = new Intl.NumberFormat('ko-KR')

function normalizeMockNumber(value: number): number {
  return Math.max(0, Math.round(value))
}

export function formatMockEa(value: number): string {
  return `${koNumber.format(normalizeMockNumber(value))}EA`
}

export function formatNullableMockEa(value: number | null | undefined): string {
  return value == null ? '확인 필요' : formatMockEa(value)
}

export function formatMockWon(value: number): string {
  return `${koNumber.format(normalizeMockNumber(value))}원`
}

export function formatNullableMockWon(value: number | null | undefined): string {
  return value == null ? '확인 필요' : formatMockWon(value)
}
