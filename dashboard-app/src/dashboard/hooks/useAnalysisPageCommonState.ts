import { useCallback, useMemo, useState } from 'react'
import { getCompanyUuidForOptionalScope, isAllCompanyUuid } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { clampForecastMonths, DEFAULT_FORECAST_MONTHS } from '../../utils/forecastMonthsStorage'
import { useElementSize } from './useElementSize'
import { useSelfCompanyLabel } from './useSelfCompanyLabel'

export function useAnalysisPageCommonState() : { selfCompanyLabel: string; companyUuid: string | undefined; isAllCompanySelected: boolean; forecastMonths: number; onForecastMonthsChange: (n: number) => void; chartBodyRef: React.RefObject<HTMLDivElement | null>; chartWidth: number; chartHeight: number; chartReady: boolean; } {
  const { selectedCompanyUuid }: ReturnType<typeof useAuth> = useAuth()
  const selfCompanyLabel: string = useSelfCompanyLabel()
  const companyUuid: string | undefined = useMemo(() : string | undefined => getCompanyUuidForOptionalScope(selectedCompanyUuid), [selectedCompanyUuid])
  const [forecastMonths, setForecastMonths]: [number, React.Dispatch<React.SetStateAction<number>>] = useState<number>(DEFAULT_FORECAST_MONTHS)
  const chartSize: { ref: React.RefObject<HTMLDivElement | null>; width: number; height: number; ready: boolean; } = useElementSize<HTMLDivElement>()

  const onForecastMonthsChange: (n: number) => void = useCallback((n: number) : void => {
    const v: number = clampForecastMonths(n)
    setForecastMonths(v)
  }, [])

  return {
    selfCompanyLabel,
    companyUuid,
    isAllCompanySelected: isAllCompanyUuid(selectedCompanyUuid),
    forecastMonths,
    onForecastMonthsChange,
    chartBodyRef: chartSize.ref,
    chartWidth: chartSize.width,
    chartHeight: chartSize.height,
    chartReady: chartSize.ready,
  }
}
