export interface SecondaryConfirmedRound {
  date: string
  excludeSegmentExistingOrderInbound: boolean
  qtyBySize: Record<string, number>
}

export interface SecondaryConfirmedRounds {
  rounds: SecondaryConfirmedRound[]
}
