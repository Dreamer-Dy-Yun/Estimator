export const ANALYSIS_FACET_ALL_VALUE = '전체' as const

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
  { key: 'brand', label: '브랜드', getValue: (row: AnalysisFacetRow) : string => row.brand },
  { key: 'category', label: '카테고리', getValue: (row: AnalysisFacetRow) : string => row.category },
  { key: 'code', label: '품번', getValue: (row: AnalysisFacetRow) : string => row.code },
  { key: 'productName', label: '상품명', getValue: (row: AnalysisFacetRow) : string => row.productName },
  { key: 'colorCode', label: '색상', getValue: (row: AnalysisFacetRow) : string => row.colorCode },
]

function isAllValue(value: string, allValue: string) : boolean {
  return value.trim() === '' || value.trim() === allValue
}

function includesNormalized(source: string, query: string) : boolean {
  return source.trim().toLowerCase().includes(query.trim().toLowerCase())
}

function sortFacetValues(values: string[]) : string[] {
  return [...values].sort((a: string, b: string) : number => a.localeCompare(b, 'ko-KR', { numeric: true, sensitivity: 'base' }))
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
    allValue: string = ANALYSIS_FACET_ALL_VALUE,
  ) {
    this.rows = rows
    this.values = values
    this.allValue = allValue
    this.definitionByKey = new Map(definitions.map((definition: AnalysisFacetDefinition<Row>) : [AnalysisFacetKey, AnalysisFacetDefinition<Row>] => [definition.key, definition]))
  }

  getFilteredRows() : Row[] {
    return this.rows.filter((row: Row) : boolean => this.matchesAll(row))
  }

  getOptionValuesByKey(): AnalysisFacetOptionValues {
    return ANALYSIS_FACET_KEYS.reduce<AnalysisFacetOptionValues>((acc: AnalysisFacetOptionValues, key: AnalysisFacetKey) : AnalysisFacetOptionValues => {
      acc[key] = this.getOptionValues(key)
      return acc
    }, { ...EMPTY_ANALYSIS_FACET_OPTIONS })
  }

  private getOptionValues(key: AnalysisFacetKey) : string[] {
    const definition: AnalysisFacetDefinition<Row> = this.requireDefinition(key)
    const values: Set<string> = new Set<string>()
    for (const row of this.rows) {
      if (!this.matchesExcept(row, key)) continue
      const value: string = definition.getValue(row).trim()
      if (value) values.add(value)
    }
    const currentValue: string = this.values[key]?.trim()
    if (currentValue && currentValue !== this.allValue) values.add(currentValue)
    return [this.allValue, ...sortFacetValues([...values])]
  }

  private matchesAll(row: Row) : boolean {
    return ANALYSIS_FACET_KEYS.every((key: AnalysisFacetKey) : boolean => this.matchesKey(row, key))
  }

  private matchesExcept(row: Row, exceptKey: AnalysisFacetKey) : boolean {
    return ANALYSIS_FACET_KEYS.every((key: AnalysisFacetKey) : boolean => key === exceptKey || this.matchesKey(row, key))
  }

  private matchesKey(row: Row, key: AnalysisFacetKey) : boolean {
    const selected: string = this.values[key]
    if (isAllValue(selected, this.allValue)) return true
    return includesNormalized(this.requireDefinition(key).getValue(row), selected)
  }

  private requireDefinition(key: AnalysisFacetKey) : AnalysisFacetDefinition<Row> {
    const definition: AnalysisFacetDefinition<Row> | undefined = this.definitionByKey.get(key)
    if (!definition) throw new Error(`Missing facet definition: ${key}`)
    return definition
  }
}
