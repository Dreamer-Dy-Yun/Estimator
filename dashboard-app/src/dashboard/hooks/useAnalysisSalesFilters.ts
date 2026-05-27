import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSalesFilterMeta } from '../../api'
import type { SelfSalesParams } from '../../api/types'
import type { FilterField } from '../model/filterField'
import { usePeriodRangeFilter } from './usePeriodRangeFilter'

const ALL_OPTION = '전체'
type FilterKey = 'brand' | 'category' | 'code' | 'productName' | 'colorCode'
type FilterValues = Record<FilterKey, string>
type FilterOptions = Record<FilterKey, string[]>

const EMPTY_OPTIONS = [ALL_OPTION]
const EMPTY_VALUES: FilterValues = {
  brand: ALL_OPTION,
  category: ALL_OPTION,
  code: ALL_OPTION,
  productName: ALL_OPTION,
  colorCode: ALL_OPTION,
}
const EMPTY_FILTER_OPTIONS: FilterOptions = {
  brand: EMPTY_OPTIONS,
  category: EMPTY_OPTIONS,
  code: EMPTY_OPTIONS,
  productName: EMPTY_OPTIONS,
  colorCode: EMPTY_OPTIONS,
}
const FILTER_DEFS: Array<{ key: FilterKey; label: string }> = [
  { key: 'brand', label: '브랜드' },
  { key: 'category', label: '카테고리' },
  { key: 'code', label: '품번' },
  { key: 'productName', label: '상품명' },
  { key: 'colorCode', label: '색상' },
]

export function maskNonPeriodAnalysisFilterFields(fields: FilterField[]): FilterField[] {
  return fields.map((field) => (field.inputType === 'date' ? field : { ...field, displayValue: '', disabled: true }))
}

function filterParam(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed && trimmed !== ALL_OPTION ? trimmed : undefined
}

export function useAnalysisSalesFilters(companyUuid?: string) {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(EMPTY_FILTER_OPTIONS)
  const [filterValues, setFilterValues] = useState<FilterValues>(EMPTY_VALUES)
  const [historicalMonths, setHistoricalMonths] = useState<string[]>([])
  const [showPeriodBar, setShowPeriodBar] = useState(false)
  const period = usePeriodRangeFilter(historicalMonths)
  const [appliedPeriod, setAppliedPeriod] = useState(() => ({ startDate: period.periodStartDate, endDate: period.periodEndDate }))
  const setFilterValue = useCallback((key: FilterKey, value: string) => setFilterValues((prev) => ({ ...prev, [key]: value })), [])

  useEffect(() => {
    let alive = true
    const params = companyUuid ? { companyUuid } : undefined
    void getSalesFilterMeta(params).then(({ brands, categories, codes, colorCodes, productNames, historicalMonths: months }) => {
      if (!alive) return
      setFilterOptions({
        brand: [ALL_OPTION, ...brands],
        category: [ALL_OPTION, ...categories],
        code: [ALL_OPTION, ...codes],
        productName: [ALL_OPTION, ...productNames],
        colorCode: [ALL_OPTION, ...colorCodes],
      })
      setHistoricalMonths(months)
    })
    return () => {
      alive = false
    }
  }, [companyUuid])

  const salesParams = useMemo<SelfSalesParams>(() => ({
    startDate: appliedPeriod.startDate,
    endDate: appliedPeriod.endDate,
    brand: filterParam(filterValues.brand),
    category: filterParam(filterValues.category),
    codeQuery: filterParam(filterValues.code),
    nameQuery: filterParam(filterValues.productName),
    colorCode: filterParam(filterValues.colorCode),
    ...(companyUuid ? { companyUuid } : {}),
  }), [appliedPeriod.endDate, appliedPeriod.startDate, companyUuid, filterValues])

  const filterFields = useMemo<FilterField[]>(() => [
    { label: '시작일', kind: 'input', inputType: 'date', value: period.periodStartDate, onChange: period.onStartDateChange },
    { label: '종료일', kind: 'input', inputType: 'date', value: period.periodEndDate, onChange: period.onEndDateChange },
    ...FILTER_DEFS.map(({ key, label }) => ({
      label,
      kind: 'listCombo' as const,
      inputType: 'text' as const,
      value: filterValues[key],
      onChange: (value: string) => setFilterValue(key, value),
      options: filterOptions[key],
    })),
  ], [filterOptions, filterValues, period.onEndDateChange, period.onStartDateChange, period.periodEndDate, period.periodStartDate, setFilterValue])

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
    filterFields,
    historicalMonths,
    salesParams,
    showPeriodBar,
    setShowPeriodBar,
  }
}
