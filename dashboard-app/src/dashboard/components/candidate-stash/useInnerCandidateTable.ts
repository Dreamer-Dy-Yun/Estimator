import type { SortState } from '../../../utils/sort'
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

export function useInnerCandidateTable(items: CandidateItemSummary[]) : { brandQuery: string; setBrandQuery: React.Dispatch<React.SetStateAction<string>>; codeQuery: string; setCodeQuery: React.Dispatch<React.SetStateAction<string>>; productNameQuery: string; setProductNameQuery: React.Dispatch<React.SetStateAction<string>>; tableSort: InnerCandidateSortState | null; toggleTableSort: (key: InnerCandidateSortKey) => void; resetTableSort: () => void; brandOptions: string[]; codeOptions: string[]; productNameOptions: string[]; tableRows: CandidateItemSummary[]; totals: { qty: number; expectedOrderAmount: number; expectedSalesAmount: number; expectedOpProfit: number; }; pendingOrderMetricCount: number; totalExpectedOpProfitRatePct: number | null; } {
  const [brandQuery, setBrandQuery]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [codeQuery, setCodeQuery]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [productNameQuery, setProductNameQuery]: [string, React.Dispatch<React.SetStateAction<string>>] = useState('')
  const [tableSort, setTableSort]: [InnerCandidateSortState | null, React.Dispatch<React.SetStateAction<InnerCandidateSortState | null>>] = useState<InnerCandidateSortState | null>(null)

  const toggleTableSort: (key: InnerCandidateSortKey) => void = useCallback((key: InnerCandidateSortKey) : void => {
    setTableSort((current: InnerCandidateSortState | null) : SortState<InnerCandidateSortKey> | null => nextSortState(current, key))
  }, [])
  const resetTableSort: () => void = useCallback(() : void => {
    setTableSort(null)
  }, [])

  const brandOptions: string[] = useMemo(() : string[] => uniqueSortedStrings(items.map((i: CandidateItemSummary) : string => i.brand)), [items])
  const codeOptions: string[] = useMemo(() : string[] => uniqueSortedStrings(items.map((i: CandidateItemSummary) : string => i.code)), [items])
  const productNameOptions: string[] = useMemo(() : string[] => uniqueSortedStrings(items.map((i: CandidateItemSummary) : string => i.productName)), [items])

  const filteredItems: CandidateItemSummary[] = useMemo(() : CandidateItemSummary[] => {
    return items.filter((item: CandidateItemSummary) : boolean => {
      const bq: string = brandQuery.trim().toLowerCase()
      const cq: string = codeQuery.trim().toLowerCase()
      const nq: string = productNameQuery.trim().toLowerCase()
      if (bq && !item.brand.toLowerCase().includes(bq)) return false
      if (cq && !item.code.toLowerCase().includes(cq)) return false
      if (nq && !item.productName.toLowerCase().includes(nq)) return false
      return true
    })
  }, [brandQuery, codeQuery, items, productNameQuery])

  const tableRows: CandidateItemSummary[] = useMemo((): InnerCandidateRow[] => {
    const rows: CandidateItemSummary[] = filteredItems
    if (!tableSort) return rows
    const originalIndex: Map<string, number> = new Map(rows.map((row: CandidateItemSummary, index: number) : [string, number] => [row.uuid, index]))
    return [...rows].sort((a: CandidateItemSummary, b: CandidateItemSummary) : number => {
      const compared: number = compareSortValues(
        candidateSortValue(a, tableSort.key),
        candidateSortValue(b, tableSort.key),
      )
      if (compared !== 0) return tableSort.dir === 'asc' ? compared : -compared
      return originalIndex.get(a.uuid)! - originalIndex.get(b.uuid)!
    })
  }, [filteredItems, tableSort])

  const totals: { qty: number; expectedOrderAmount: number; expectedSalesAmount: number; expectedOpProfit: number; } = useMemo(() : { qty: number; expectedOrderAmount: number; expectedSalesAmount: number; expectedOpProfit: number; } => {
    return filteredItems.reduce(
      (acc: { qty: number; expectedOrderAmount: number; expectedSalesAmount: number; expectedOpProfit: number; }, item: CandidateItemSummary) : { qty: number; expectedOrderAmount: number; expectedSalesAmount: number; expectedOpProfit: number; } => {
        acc.qty += item.qty
        acc.expectedOrderAmount += item.expectedOrderAmount
        acc.expectedSalesAmount += item.expectedSalesAmount
        acc.expectedOpProfit += item.expectedOpProfit
        return acc
      },
      { qty: 0, expectedOrderAmount: 0, expectedSalesAmount: 0, expectedOpProfit: 0 },
    )
  }, [filteredItems])

  const pendingOrderMetricCount: number = useMemo(
    () : number => filteredItems.filter((item: CandidateItemSummary) : boolean => item.orderMetricStatus === 'loading').length,
    [filteredItems],
  )

  const totalExpectedOpProfitRatePct: number | null = useMemo(() : number | null => {
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
    resetTableSort,
    brandOptions,
    codeOptions,
    productNameOptions,
    tableRows,
    totals,
    pendingOrderMetricCount,
    totalExpectedOpProfitRatePct,
  }
}
