import { describe, expect, it } from 'vitest'
import {
  ANALYSIS_SALES_FACET_DEFINITIONS,
  AnalysisFacetFilter,
  EMPTY_ANALYSIS_FACET_VALUES,
} from './analysisFacetFilter'

const rows = [
  { brand: '나이키', category: '신발', code: 'A', productName: '러닝화', colorCode: '010' },
  { brand: '나이키', category: '의류', code: 'B', productName: '반팔', colorCode: '020' },
  { brand: '아디다스', category: '신발', code: 'C', productName: '스니커즈', colorCode: '010' },
]

describe('AnalysisFacetFilter', () => {
  it('filters rows by current facet values', () => {
    const filter = new AnalysisFacetFilter(rows, ANALYSIS_SALES_FACET_DEFINITIONS, {
      ...EMPTY_ANALYSIS_FACET_VALUES,
      brand: '나이키',
      category: '신발',
    })

    expect(filter.getFilteredRows()).toEqual([rows[0]])
  })

  it('builds target options from rows filtered by other facets', () => {
    const filter = new AnalysisFacetFilter(rows, ANALYSIS_SALES_FACET_DEFINITIONS, {
      ...EMPTY_ANALYSIS_FACET_VALUES,
      category: '신발',
    })

    expect(filter.getOptionValuesByKey().brand).toEqual(['전체', '나이키', '아디다스'])
    expect(filter.getOptionValuesByKey().colorCode).toEqual(['전체', '010'])
  })
})
