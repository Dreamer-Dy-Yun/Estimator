/** One row in the self (own channel) sales analysis table. */
export type SelfSalesRow = {
  id: string
  /** SKU.code + SKU.color_code grouping key. UI row id and SKU.uuid are separate. */
  skuGroupKey: string
  rank: number
  /** Percentile rank among all SKUs. */
  rankPercentile: number
  brand: string
  category: string
  /** SKU.code: product item code without size/color. */
  code: string
  /** SKU.product_name. */
  productName: string
  /** SKU.color_code. */
  colorCode: string
  /** Small product thumbnail URL supplied by the list API. Null means no thumbnail is stored. */
  thumbnailUrl: string | null
  avgPrice: number
  qty: number
  amount: number
  avgCost: number
  marginRate: number
  feeRate: number
  opMarginRate: number
  opMarginAmount: number
}

/** One row in the competitor comparison sales table. */
export type CompetitorSalesRow = {
  id: string
  /** SKU.code + SKU.color_code grouping key. UI row id and SKU.uuid are separate. */
  skuGroupKey: string
  rank: number
  rankPercentile: number
  brand: string
  category: string
  code: string
  productName: string
  colorCode: string
  /** Small product thumbnail URL supplied by the list API. Null means no thumbnail is stored. */
  thumbnailUrl: string | null
  competitorAvgPrice: number
  competitorQty: number
  competitorAmount: number
  selfAvgPrice: number | null
  selfQty: number | null
  selfAmount: number | null
}

/** One month bucket from monthly summary / aggregate pipeline (not daily raw). */
export type MonthlySalesPoint = {
  date: string
  sales: number
  isForecast: boolean
}


export type ProductPrimarySummary = {
  /** Frontend/backend grouping key for SKU.code + SKU.color_code. It is not SKU.uuid. */
  skuGroupKey: string
  /** Optional backend product/SKU UUID. Mock and legacy responses may omit it. */
  productUuid?: string | null
  productName: string
  brand: string
  category: string
  code: string
  colorCode: string
  /** Primary drawer product image URL supplied by the drawer bundle API. Null means no stored image. */
  imageUrl: string | null
  /** Selling price in the self-company channel. */
  price: number
  qty: number
  /** Sellable on-hand quantity. */
  availableStock: number
  monthlySalesTrend?: MonthlySalesPoint[]
}

/** Product and size-level sales/stock row used by the secondary drawer. */
export type ProductSecondarySizeRow = {
  size: string
  selfRatio: number
  confirmedQty: number
  avgPrice: number
  qty: number
  availableStock: number
}

export type ProductSecondaryDetail = {
  skuGroupKey: string
  comparisonPrice: number
  comparisonQty: number
  comparisonRatioBySize: Record<string, number>
  sizeRows: ProductSecondarySizeRow[]
}


/** API 단위 컴포넌트에서 실패 배지와 툴팁에 표시하는 공통 오류 정보. */
export type ApiUnitErrorInfo = {
  checkedAt: string
  page: string
  request: string
  error: string
}
