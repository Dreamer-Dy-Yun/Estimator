import { useCallback, useMemo, useState } from 'react'
import { getCompanyUuidForOptionalScope, isAllCompanyUuid } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { clampForecastMonths, readForecastMonthsFromStorage, writeForecastMonthsToStorage } from '../../utils/forecastMonthsStorage'
import { useElementSize } from './useElementSize'
import { useSelfCompanyLabel } from './useSelfCompanyLabel'

export function useAnalysisPageCommonState() {
  const { selectedCompanyUuid } = useAuth()
  const selfCompanyLabel = useSelfCompanyLabel()
  const companyUuid = useMemo(() => getCompanyUuidForOptionalScope(selectedCompanyUuid), [selectedCompanyUuid])
  const [forecastMonths, setForecastMonths] = useState(() => readForecastMonthsFromStorage())
  const chartSize = useElementSize<HTMLDivElement>()

  const onForecastMonthsChange = useCallback((n: number) => {
    const v = clampForecastMonths(n)
    setForecastMonths(v)
    writeForecastMonthsToStorage(v)
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
