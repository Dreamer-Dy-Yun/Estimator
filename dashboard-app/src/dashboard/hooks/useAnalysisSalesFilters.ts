import type { PeriodRangeFilter } from './usePeriodRangeFilter'
import type { SalesFilterMeta } from '../../api'
import type { AnalysisFacetDefinition, AnalysisFacetRow } from '../model/analysisFacetFilter'
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
  return fields.map((field: FilterField) : { displayValue: string; disabled: true; label: string; kind: 'input' | 'select' | 'listCombo'; inputType?: 'text' | 'date'; defaultValue?: string; value?: string; onChange?: (value: string) => void; options?: string[]; } => ({ ...field, displayValue: '', disabled: true }))
}

export function useAnalysisSalesFilters(companyUuid?: string) : { appliedPeriodStartDate: string; appliedPeriodEndDate: string; periodQueryDirty: boolean; applyPeriodQuery: () => void; queryFields: FilterField[]; listFilterValues: AnalysisFacetValues; buildListFilterFields: (filterOptions?: AnalysisFacetOptionValues) => FilterField[]; listFiltersDirty: boolean; resetListFilters: () => void; historicalMonths: string[]; salesParams: SelfSalesParams; showPeriodBar: boolean; setShowPeriodBar: React.Dispatch<React.SetStateAction<boolean>>; startDate: string; endDate: string; periodStartDate: string; periodEndDate: string; periodStartIdx: number; periodEndIdx: number; startPct: number; endPct: number; setPeriodStartDate: (value: string) => void; setPeriodEndDate: (value: string) => void; setPresetMonths: (months: number) => void; setWholeRange: () => void; onStartDateChange: (value: string) => void; onEndDateChange: (value: string) => void; onPeriodBarStart: (value: number) => void; onPeriodBarEnd: (value: number) => void; } {
  const [listFilterValues, setListFilterValues]: [AnalysisFacetValues, React.Dispatch<React.SetStateAction<AnalysisFacetValues>>] = useState<AnalysisFacetValues>(EMPTY_ANALYSIS_FACET_VALUES)
  const [historicalMonths, setHistoricalMonths]: [string[], React.Dispatch<React.SetStateAction<string[]>>] = useState<string[]>([])
  const [showPeriodBar, setShowPeriodBar]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false)
  const period: PeriodRangeFilter = usePeriodRangeFilter(historicalMonths)
  const [appliedPeriod, setAppliedPeriod]: [{ startDate: string; endDate: string; }, React.Dispatch<React.SetStateAction<{ startDate: string; endDate: string; }>>] = useState(() : { startDate: string; endDate: string; } => ({
    startDate: period.periodStartDate,
    endDate: period.periodEndDate,
  }))
  const setListFilterValue: (key: AnalysisFacetKey, value: string) => void = useCallback(
    (key: AnalysisFacetKey, value: string) : void => setListFilterValues((prev: AnalysisFacetValues) : { code: string; productName: string; brand: string; category: string; colorCode: string; } => ({ ...prev, [key]: value })),
    [],
  )

  useEffect(() : () => void => {
    let alive: boolean = true
    const params: { companyUuid: string; } | undefined = companyUuid ? { companyUuid } : undefined
    void getSalesFilterMeta(params).then(({ historicalMonths: months }: SalesFilterMeta) : void => {
      if (alive) setHistoricalMonths(months)
    })
    return () : void => {
      alive = false
    }
  }, [companyUuid])

  const salesParams: SelfSalesParams = useMemo<SelfSalesParams>(() : { companyUuid?: string | undefined; startDate: string; endDate: string; } => ({
    startDate: appliedPeriod.startDate,
    endDate: appliedPeriod.endDate,
    ...(companyUuid ? { companyUuid } : {}),
  }), [appliedPeriod.endDate, appliedPeriod.startDate, companyUuid])

  const queryFields: FilterField[] = useMemo<FilterField[]>(() : { label: string; kind: 'input'; inputType: 'date'; value: string; onChange: (value: string) => void; }[] => [
    { label: '시작일', kind: 'input', inputType: 'date', value: period.periodStartDate, onChange: period.onStartDateChange },
    { label: '종료일', kind: 'input', inputType: 'date', value: period.periodEndDate, onChange: period.onEndDateChange },
  ], [period.onEndDateChange, period.onStartDateChange, period.periodEndDate, period.periodStartDate])

  const buildListFilterFields: (filterOptions?: AnalysisFacetOptionValues) => FilterField[] = useCallback((filterOptions: AnalysisFacetOptionValues = EMPTY_ANALYSIS_FACET_OPTIONS): FilterField[] => (
    ANALYSIS_SALES_FACET_DEFINITIONS.map(({ key, label }: AnalysisFacetDefinition<AnalysisFacetRow>) : { label: string; kind: 'listCombo'; inputType: 'text'; value: string; onChange: (value: string) => void; options: string[]; } => ({
      label,
      kind: 'listCombo' as const,
      inputType: 'text' as const,
      value: listFilterValues[key],
      onChange: (value: string) : void => setListFilterValue(key, value),
      options: filterOptions[key],
    }))
  ), [listFilterValues, setListFilterValue])

  const resetListFilters: () => void = useCallback(() : void => setListFilterValues(EMPTY_ANALYSIS_FACET_VALUES), [])
  const listFiltersDirty: boolean = useMemo(
    () : boolean => ANALYSIS_SALES_FACET_DEFINITIONS.some(({ key }: AnalysisFacetDefinition<AnalysisFacetRow>) : boolean => listFilterValues[key] !== ANALYSIS_FACET_ALL_VALUE),
    [listFilterValues],
  )

  const periodQueryDirty: boolean = period.periodStartDate !== appliedPeriod.startDate || period.periodEndDate !== appliedPeriod.endDate
  const applyPeriodQuery: () => void = useCallback(() : void => {
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
