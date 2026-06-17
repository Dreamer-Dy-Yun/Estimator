export interface SecondaryConfirmedRound {
  date: string
  qtyBySize: Record<string, number>
}

export interface SecondaryConfirmedRounds {
  rounds: SecondaryConfirmedRound[]
}
