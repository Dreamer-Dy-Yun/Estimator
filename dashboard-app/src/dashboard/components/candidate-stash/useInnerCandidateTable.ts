import { useCallback, useMemo, useState } from 'react'
import type { CandidateItemSummary } from '../../../api'
import { compareSortValues, nextSortState, type SortValue } from '../../../utils/sort'
import { uniqueSortedStrings } from '../../../utils/uniqueSortedStrings'
import type {
  InnerCandidateRow,
  InnerCandidateSortKey,
  InnerCandidateSortState,
} from './candidateStashDetailTypes'

function candidateSortValue(row: InnerCandidateRow, key: InnerCandidateSortKey): SortValue {
  switch (key) {
    case 'brand':
      return row.brand
    case 'code':
      return row.code
    case 'productName':
      return row.productName
    case 'colorCode':
      return row.colorCode
    case 'isDetailConfirmed':
      return row.isDetailConfirmed ? 1 : 0
    case 'selfQty':
      return row.insight.selfQty
    case 'competitorQty':
      return row.insight.competitorQty
    case 'expectedSalesQty':
      return row.insight.expectedSalesQty
    case 'expectedOrderAmount':
      return row.expectedOrderAmount
  }
}

export function useInnerCandidateTable(items: CandidateItemSummary[]) {
  const [brandQuery, setBrandQuery] = useState('')
  const [codeQuery, setCodeQuery] = useState('')
  const [productNameQuery, setProductNameQuery] = useState('')
  const [tableSort, setTableSort] = useState<InnerCandidateSortState | null>(null)

  const toggleTableSort = useCallback((key: InnerCandidateSortKey) => {
    setTableSort((current) => nextSortState(current, key))
  }, [])

  const brandOptions = useMemo(() => uniqueSortedStrings(items.map((i) => i.brand)), [items])
  const codeOptions = useMemo(() => uniqueSortedStrings(items.map((i) => i.code)), [items])
  const productNameOptions = useMemo(() => uniqueSortedStrings(items.map((i) => i.productName)), [items])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const bq = brandQuery.trim().toLowerCase()
      const cq = codeQuery.trim().toLowerCase()
      const nq = productNameQuery.trim().toLowerCase()
      if (bq && !item.brand.toLowerCase().includes(bq)) return false
      if (cq && !item.code.toLowerCase().includes(cq)) return false
      if (nq && !item.productName.toLowerCase().includes(nq)) return false
      return true
    })
  }, [brandQuery, codeQuery, items, productNameQuery])

  const tableRows = useMemo((): InnerCandidateRow[] => {
    const rows = filteredItems.map((item) => ({ ...item, id: item.uuid }))
    if (!tableSort) return rows
    const originalIndex = new Map(rows.map((row, index) => [row.uuid, index]))
    return [...rows].sort((a, b) => {
      const compared = compareSortValues(
        candidateSortValue(a, tableSort.key),
        candidateSortValue(b, tableSort.key),
      )
      if (compared !== 0) return tableSort.dir === 'asc' ? compared : -compared
      return originalIndex.get(a.uuid)! - originalIndex.get(b.uuid)!
    })
  }, [filteredItems, tableSort])

  const totals = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => {
        acc.qty += item.qty
        acc.expectedOrderAmount += item.expectedOrderAmount
        acc.expectedSalesAmount += item.expectedSalesAmount
        acc.expectedOpProfit += item.expectedOpProfit
        return acc
      },
      { qty: 0, expectedOrderAmount: 0, expectedSalesAmount: 0, expectedOpProfit: 0 },
    )
  }, [filteredItems])

  const totalExpectedOpProfitRatePct = useMemo(() => {
    if (totals.expectedSalesAmount <= 0) return null
    return (totals.expectedOpProfit / totals.expectedSalesAmount) * 100
  }, [totals.expectedOpProfit, totals.expectedSalesAmount])

  return {
    brandQuery,
    setBrandQuery,
    codeQuery,
    setCodeQuery,
    productNameQuery,
    setProductNameQuery,
    tableSort,
    toggleTableSort,
    brandOptions,
    codeOptions,
    productNameOptions,
    tableRows,
    totals,
    totalExpectedOpProfitRatePct,
  }
}
