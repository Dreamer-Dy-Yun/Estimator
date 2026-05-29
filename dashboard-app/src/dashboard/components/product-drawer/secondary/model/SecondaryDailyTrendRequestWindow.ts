import { formatIsoDateLocal, monthToStartDate } from '../../../../../utils/date'

type SecondaryDailyTrendRequestWindowInput = {
  selectedStartMonth: string
  forecastDays: number
  today?: Date
}

export class SecondaryDailyTrendRequestWindow {
  readonly selectedStartMonth: string
  readonly startDate: string
  readonly endDate: string
  readonly forecastDays: number

  private constructor({
    selectedStartMonth,
    startDate,
    endDate,
    forecastDays,
  }: {
    selectedStartMonth: string
    startDate: string
    endDate: string
    forecastDays: number
  }) {
    this.selectedStartMonth = selectedStartMonth
    this.startDate = startDate
    this.endDate = endDate
    this.forecastDays = forecastDays
  }

  static fromSelectedStartMonth({
    selectedStartMonth,
    forecastDays,
    today = new Date(),
  }: SecondaryDailyTrendRequestWindowInput): SecondaryDailyTrendRequestWindow {
    const end = new Date(today)
    end.setDate(end.getDate() - 1)

    return new SecondaryDailyTrendRequestWindow({
      selectedStartMonth,
      startDate: monthToStartDate(selectedStartMonth),
      endDate: formatIsoDateLocal(end),
      forecastDays: Math.max(0, Math.round(forecastDays)),
    })
  }

  toQueryFields() {
    return {
      startDate: this.startDate,
      endDate: this.endDate,
      forecastDays: this.forecastDays,
    }
  }

  toRequestLogFields() {
    return {
      selectedStartMonth: this.selectedStartMonth,
      ...this.toQueryFields(),
    }
  }
}
