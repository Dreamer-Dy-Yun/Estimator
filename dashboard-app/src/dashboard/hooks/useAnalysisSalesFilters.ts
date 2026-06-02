import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSalesFilterMeta } from '../../api'
import type { SelfSalesParams } from '../../api/types'
import {
  ANALYSIS_FACET_ALL_VALUE,
  ANALYSIS_SALES_FACET_DEFINITIONS,
  EMPTY_ANALYSIS_FACET_OPTIONS,
  EMPTY_ANALYSIS_FACET_VALUES,
  type AnalysisFacetKey,
  type AnalysisFacetOptionValues,
  type AnalysisFacetValues,
} from '../model/analysisFacetFilter'
import type { FilterField } from '../model/filterField'
import { usePeriodRangeFilter } from './usePeriodRangeFilter'

export function maskAnalysisListFilterFields(fields: FilterField[]): FilterField[] {
  return fields.map((field) => ({ ...field, displayValue: '', disabled: true }))
}

export function useAnalysisSalesFilters(companyUuid?: string) {
  const [listFilterValues, setListFilterValues] = useState<AnalysisFacetValues>(EMPTY_ANALYSIS_FACET_VALUES)
  const [historicalMonths, setHistoricalMonths] = useState<string[]>([])
  const [showPeriodBar, setShowPeriodBar] = useState(false)
  const period = usePeriodRangeFilter(historicalMonths)
  const [appliedPeriod, setAppliedPeriod] = useState(() => ({
    startDate: period.periodStartDate,
    endDate: period.periodEndDate,
  }))
  const setListFilterValue = useCallback(
    (key: AnalysisFacetKey, value: string) => setListFilterValues((prev) => ({ ...prev, [key]: value })),
    [],
  )

  useEffect(() => {
    let alive = true
    const params = companyUuid ? { companyUuid } : undefined
    void getSalesFilterMeta(params).then(({ historicalMonths: months }) => {
      if (alive) setHistoricalMonths(months)
    })
    return () => {
      alive = false
    }
  }, [companyUuid])

  const salesParams = useMemo<SelfSalesParams>(() => ({
    startDate: appliedPeriod.startDate,
    endDate: appliedPeriod.endDate,
    ...(companyUuid ? { companyUuid } : {}),
  }), [appliedPeriod.endDate, appliedPeriod.startDate, companyUuid])

  const queryFields = useMemo<FilterField[]>(() => [
    { label: '시작일', kind: 'input', inputType: 'date', value: period.periodStartDate, onChange: period.onStartDateChange },
    { label: '종료일', kind: 'input', inputType: 'date', value: period.periodEndDate, onChange: period.onEndDateChange },
  ], [period.onEndDateChange, period.onStartDateChange, period.periodEndDate, period.periodStartDate])

  const buildListFilterFields = useCallback((filterOptions: AnalysisFacetOptionValues = EMPTY_ANALYSIS_FACET_OPTIONS): FilterField[] => (
    ANALYSIS_SALES_FACET_DEFINITIONS.map(({ key, label }) => ({
      label,
      kind: 'listCombo' as const,
      inputType: 'text' as const,
      value: listFilterValues[key],
      onChange: (value: string) => setListFilterValue(key, value),
      options: filterOptions[key],
    }))
  ), [listFilterValues, setListFilterValue])

  const resetListFilters = useCallback(() => setListFilterValues(EMPTY_ANALYSIS_FACET_VALUES), [])
  const listFiltersDirty = useMemo(
    () => ANALYSIS_SALES_FACET_DEFINITIONS.some(({ key }) => listFilterValues[key] !== ANALYSIS_FACET_ALL_VALUE),
    [listFilterValues],
  )

  const periodQueryDirty = period.periodStartDate !== appliedPeriod.startDate || period.periodEndDate !== appliedPeriod.endDate
  const applyPeriodQuery = useCallback(() => {
    setAppliedPeriod({ startDate: period.periodStartDate, endDate: period.periodEndDate })
  }, [period.periodEndDate, period.periodStartDate])

  return {
    ...period,
    appliedPeriodStartDate: appliedPeriod.startDate,
    appliedPeriodEndDate: appliedPeriod.endDate,
    periodQueryDirty,
    applyPeriodQuery,
    queryFields,
    listFilterValues,
    buildListFilterFields,
    listFiltersDirty,
    resetListFilters,
    historicalMonths,
    salesParams,
    showPeriodBar,
    setShowPeriodBar,
  }
}
