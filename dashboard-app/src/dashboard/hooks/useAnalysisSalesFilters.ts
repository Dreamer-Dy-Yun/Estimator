import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSalesFilterMeta } from '../../api'
import type { SelfSalesParams } from '../../api/types'
import type { FilterField } from '../model/filterField'
import { usePeriodRangeFilter } from './usePeriodRangeFilter'

const ALL_OPTION = '전체'
const EMPTY_OPTIONS = [ALL_OPTION]

export function maskNonPeriodAnalysisFilterFields(fields: FilterField[]): FilterField[] {
  return fields.map((field) => (
    field.inputType === 'date'
      ? field
      : { ...field, displayValue: '', disabled: true }
  ))
}

function filterParam(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed && trimmed !== ALL_OPTION ? trimmed : undefined
}

export function useAnalysisSalesFilters() {
  const [brandOptions, setBrandOptions] = useState<string[]>(EMPTY_OPTIONS)
  const [brandFilter, setBrandFilter] = useState(ALL_OPTION)
  const [categoryOptions, setCategoryOptions] = useState<string[]>(EMPTY_OPTIONS)
  const [categoryFilter, setCategoryFilter] = useState(ALL_OPTION)
  const [codeOptions, setCodeOptions] = useState<string[]>(EMPTY_OPTIONS)
  const [codeFilter, setCodeFilter] = useState(ALL_OPTION)
  const [productNameOptions, setProductNameOptions] = useState<string[]>(EMPTY_OPTIONS)
  const [productNameFilter, setProductNameFilter] = useState(ALL_OPTION)
  const [colorCodeOptions, setColorCodeOptions] = useState<string[]>(EMPTY_OPTIONS)
  const [colorCodeFilter, setColorCodeFilter] = useState(ALL_OPTION)
  const [historicalMonths, setHistoricalMonths] = useState<string[]>([])
  const [showPeriodBar, setShowPeriodBar] = useState(false)
  const period = usePeriodRangeFilter(historicalMonths)
  const [appliedPeriod, setAppliedPeriod] = useState(() => ({
    startDate: period.periodStartDate,
    endDate: period.periodEndDate,
  }))

  useEffect(() => {
    let alive = true
    void getSalesFilterMeta().then(({ brands, categories, codes, colorCodes, productNames, historicalMonths: months }) => {
      if (!alive) return
      setBrandOptions([ALL_OPTION, ...brands])
      setCategoryOptions([ALL_OPTION, ...categories])
      setCodeOptions([ALL_OPTION, ...codes])
      setProductNameOptions([ALL_OPTION, ...productNames])
      setColorCodeOptions([ALL_OPTION, ...colorCodes])
      setHistoricalMonths(months)
    })
    return () => {
      alive = false
    }
  }, [])

  const salesParams = useMemo<SelfSalesParams>(() => ({
    startDate: appliedPeriod.startDate,
    endDate: appliedPeriod.endDate,
    brand: filterParam(brandFilter),
    category: filterParam(categoryFilter),
    codeQuery: filterParam(codeFilter),
    nameQuery: filterParam(productNameFilter),
    colorCode: filterParam(colorCodeFilter),
  }), [
    appliedPeriod.startDate,
    appliedPeriod.endDate,
    brandFilter,
    categoryFilter,
    codeFilter,
    productNameFilter,
    colorCodeFilter,
  ])

  const filterFields = useMemo<FilterField[]>(() => [
    { label: '시작일', kind: 'input', inputType: 'date', value: period.periodStartDate, onChange: period.onStartDateChange },
    { label: '종료일', kind: 'input', inputType: 'date', value: period.periodEndDate, onChange: period.onEndDateChange },
    { label: '브랜드', kind: 'listCombo', inputType: 'text', value: brandFilter, onChange: setBrandFilter, options: brandOptions },
    { label: '카테고리', kind: 'listCombo', inputType: 'text', value: categoryFilter, onChange: setCategoryFilter, options: categoryOptions },
    { label: '품번', kind: 'listCombo', inputType: 'text', value: codeFilter, onChange: setCodeFilter, options: codeOptions },
    { label: '상품명', kind: 'listCombo', inputType: 'text', value: productNameFilter, onChange: setProductNameFilter, options: productNameOptions },
    { label: '색상', kind: 'listCombo', inputType: 'text', value: colorCodeFilter, onChange: setColorCodeFilter, options: colorCodeOptions },
  ], [
    period.periodStartDate,
    period.periodEndDate,
    period.onStartDateChange,
    period.onEndDateChange,
    brandFilter,
    brandOptions,
    categoryFilter,
    categoryOptions,
    codeFilter,
    codeOptions,
    productNameFilter,
    productNameOptions,
    colorCodeFilter,
    colorCodeOptions,
  ])

  const periodQueryDirty = period.periodStartDate !== appliedPeriod.startDate
    || period.periodEndDate !== appliedPeriod.endDate

  const applyPeriodQuery = useCallback(() => {
    setAppliedPeriod({
      startDate: period.periodStartDate,
      endDate: period.periodEndDate,
    })
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
