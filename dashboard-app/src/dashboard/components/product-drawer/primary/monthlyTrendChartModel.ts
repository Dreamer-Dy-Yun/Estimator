import type { TrendChartPoint } from '../../trend/SalesTrendChart'

export type ProductMonthlyTrendChartPoint = TrendChartPoint & {
  actual: number | null
  comparisonActual: number | null
  forecastLink: number | null
  isForecast: boolean
  sales: number
  comparisonSales: number | null
}

export type ProductMonthlyTrendSeriesPoint = Pick<
  ProductMonthlyTrendChartPoint,
  'date' | 'isForecast' | 'idx' | 'sales' | 'comparisonSales'
>
