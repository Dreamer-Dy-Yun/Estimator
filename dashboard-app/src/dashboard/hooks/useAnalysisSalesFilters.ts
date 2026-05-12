import { useEffect, useMemo, useState } from 'react'
import { getSalesFilterMeta } from '../../api'
import type { SelfSalesParams } from '../../api/types'
import type { FilterField } from '../components/FilterBar'
import { usePeriodRangeFilter } from './usePeriodRangeFilter'

const ALL_OPTION = '전체'
const EMPTY_OPTIONS = [ALL_OPTION]

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
  const [historicalMonths, setHistoricalMonths] = useState<string[]>([])
  const [showPeriodBar, setShowPeriodBar] = useState(false)
  const period = usePeriodRangeFilter(historicalMonths)

  useEffect(() => {
    let alive = true
    void getSalesFilterMeta().then(({ brands, categories, codes, productNames, historicalMonths: months }) => {
      if (!alive) return
      setBrandOptions([ALL_OPTION, ...brands])
      setCategoryOptions([ALL_OPTION, ...categories])
      setCodeOptions([ALL_OPTION, ...codes])
      setProductNameOptions([ALL_OPTION, ...productNames])
      setHistoricalMonths(months)
    })
    return () => {
      alive = false
    }
  }, [])

  const salesParams = useMemo<SelfSalesParams>(() => ({
    startDate: period.periodStartDate,
    endDate: period.periodEndDate,
    brand: filterParam(brandFilter),
    category: filterParam(categoryFilter),
    codeQuery: filterParam(codeFilter),
    nameQuery: filterParam(productNameFilter),
  }), [
    period.periodStartDate,
    period.periodEndDate,
    brandFilter,
    categoryFilter,
    codeFilter,
    productNameFilter,
  ])

  const filterFields = useMemo<FilterField[]>(() => [
    { label: '시작일', kind: 'input', inputType: 'date', value: period.periodStartDate, onChange: period.onStartDateChange },
    { label: '종료일', kind: 'input', inputType: 'date', value: period.periodEndDate, onChange: period.onEndDateChange },
    { label: '브랜드', kind: 'listCombo', inputType: 'text', value: brandFilter, onChange: setBrandFilter, options: brandOptions },
    { label: '카테고리', kind: 'listCombo', inputType: 'text', value: categoryFilter, onChange: setCategoryFilter, options: categoryOptions },
    { label: '품번', kind: 'listCombo', inputType: 'text', value: codeFilter, onChange: setCodeFilter, options: codeOptions },
    { label: '상품명', kind: 'listCombo', inputType: 'text', value: productNameFilter, onChange: setProductNameFilter, options: productNameOptions },
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
  ])

  return {
    ...period,
    filterFields,
    historicalMonths,
    salesParams,
    showPeriodBar,
    setShowPeriodBar,
  }
}
