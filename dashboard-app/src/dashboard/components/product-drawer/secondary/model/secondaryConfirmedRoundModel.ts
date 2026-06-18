export interface SecondaryConfirmedRound {
  date: string
  ignoreExistingOrderInbound: boolean
  qtyBySize: Record<string, number>
}

export interface SecondaryConfirmedRounds {
  rounds: SecondaryConfirmedRound[]
}
