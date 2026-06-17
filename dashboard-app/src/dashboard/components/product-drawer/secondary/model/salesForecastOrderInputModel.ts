export type SalesForecastInboundDateFields = {
  currentOrderInboundDueDate: string
  nextOrderInboundDueDate: string
}

export type SalesForecastUnitEconomicsFields = {
  unitCost: number
  unitPrice: number
  expectedFeeRatePct: number
}

export type SalesForecastOrderInputFields = SalesForecastInboundDateFields & SalesForecastUnitEconomicsFields & {
  minOrderDate: string
  bufferStock: number
}
