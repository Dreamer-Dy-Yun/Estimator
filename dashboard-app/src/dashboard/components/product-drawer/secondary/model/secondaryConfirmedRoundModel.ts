export interface SecondaryConfirmedRound {
  date: string
  excludePeriodExistingOrderInbound: boolean
  qtyBySize: Record<string, number>
}

export interface SecondaryConfirmedRounds {
  rounds: SecondaryConfirmedRound[]
}
