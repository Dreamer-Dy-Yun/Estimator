export const ANALYSIS_FACET_ALL_VALUE = '전체'

export type AnalysisFacetKey = 'brand' | 'category' | 'code' | 'productName' | 'colorCode'
export type AnalysisFacetValues = Record<AnalysisFacetKey, string>
export type AnalysisFacetOptionValues = Record<AnalysisFacetKey, string[]>

export type AnalysisFacetRow = {
  brand: string
  category: string
  code: string
  productName: string
  colorCode: string
}

export type AnalysisFacetDefinition<Row> = {
  key: AnalysisFacetKey
  label: string
  getValue: (row: Row) => string
}

export const ANALYSIS_FACET_KEYS: AnalysisFacetKey[] = ['brand', 'category', 'code', 'productName', 'colorCode']

export const EMPTY_ANALYSIS_FACET_VALUES: AnalysisFacetValues = {
  brand: ANALYSIS_FACET_ALL_VALUE,
  category: ANALYSIS_FACET_ALL_VALUE,
  code: ANALYSIS_FACET_ALL_VALUE,
  productName: ANALYSIS_FACET_ALL_VALUE,
  colorCode: ANALYSIS_FACET_ALL_VALUE,
}

export const EMPTY_ANALYSIS_FACET_OPTIONS: AnalysisFacetOptionValues = {
  brand: [ANALYSIS_FACET_ALL_VALUE],
  category: [ANALYSIS_FACET_ALL_VALUE],
  code: [ANALYSIS_FACET_ALL_VALUE],
  productName: [ANALYSIS_FACET_ALL_VALUE],
  colorCode: [ANALYSIS_FACET_ALL_VALUE],
}

export const ANALYSIS_SALES_FACET_DEFINITIONS: AnalysisFacetDefinition<AnalysisFacetRow>[] = [
  { key: 'brand', label: '브랜드', getValue: (row) => row.brand },
  { key: 'category', label: '카테고리', getValue: (row) => row.category },
  { key: 'code', label: '품번', getValue: (row) => row.code },
  { key: 'productName', label: '상품명', getValue: (row) => row.productName },
  { key: 'colorCode', label: '색상', getValue: (row) => row.colorCode },
]

function isAllValue(value: string, allValue: string) {
  return value.trim() === '' || value.trim() === allValue
}

function includesNormalized(source: string, query: string) {
  return source.trim().toLowerCase().includes(query.trim().toLowerCase())
}

function sortFacetValues(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b, 'ko-KR', { numeric: true, sensitivity: 'base' }))
}

export class AnalysisFacetFilter<Row> {
  private readonly rows: Row[]
  private readonly definitionByKey: Map<AnalysisFacetKey, AnalysisFacetDefinition<Row>>
  private readonly values: AnalysisFacetValues
  private readonly allValue: string

  constructor(
    rows: Row[],
    definitions: AnalysisFacetDefinition<Row>[],
    values: AnalysisFacetValues,
    allValue = ANALYSIS_FACET_ALL_VALUE,
  ) {
    this.rows = rows
    this.values = values
    this.allValue = allValue
    this.definitionByKey = new Map(definitions.map((definition) => [definition.key, definition]))
  }

  getFilteredRows() {
    return this.rows.filter((row) => this.matchesAll(row))
  }

  getOptionValuesByKey(): AnalysisFacetOptionValues {
    return ANALYSIS_FACET_KEYS.reduce<AnalysisFacetOptionValues>((acc, key) => {
      acc[key] = this.getOptionValues(key)
      return acc
    }, { ...EMPTY_ANALYSIS_FACET_OPTIONS })
  }

  private getOptionValues(key: AnalysisFacetKey) {
    const definition = this.requireDefinition(key)
    const values = new Set<string>()
    for (const row of this.rows) {
      if (!this.matchesExcept(row, key)) continue
      const value = definition.getValue(row).trim()
      if (value) values.add(value)
    }
    const currentValue = this.values[key]?.trim()
    if (currentValue && currentValue !== this.allValue) values.add(currentValue)
    return [this.allValue, ...sortFacetValues([...values])]
  }

  private matchesAll(row: Row) {
    return ANALYSIS_FACET_KEYS.every((key) => this.matchesKey(row, key))
  }

  private matchesExcept(row: Row, exceptKey: AnalysisFacetKey) {
    return ANALYSIS_FACET_KEYS.every((key) => key === exceptKey || this.matchesKey(row, key))
  }

  private matchesKey(row: Row, key: AnalysisFacetKey) {
    const selected = this.values[key]
    if (isAllValue(selected, this.allValue)) return true
    return includesNormalized(this.requireDefinition(key).getValue(row), selected)
  }

  private requireDefinition(key: AnalysisFacetKey) {
    const definition = this.definitionByKey.get(key)
    if (!definition) throw new Error(`Missing facet definition: ${key}`)
    return definition
  }
}
